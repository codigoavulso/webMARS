import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const runtime = await readFile(new URL("../assets/js/app-modules/20-app-runtime.js", import.meta.url), "utf8");
const source = runtime.slice(runtime.indexOf("async function cloudSocialSections("), runtime.indexOf("async function openCloudServerPreferencesDialog("));
function harness() {
  const forms = [], requests = [], sessions = [], messages = [];
  const env = {
    AbortSignal, AbortController, URL, translateText: s => s,
    window: { WebMarsUsage: { track() {} } },
    runDialogForm: async options => { forms.push(options); return { ok: false }; },
    cloudRequestJson: async (path, options) => {
      requests.push({ path, options });
      if (path === "/auth/providers") return { providers: ["google"], connected: [] };
      return { user: { username: "sample", email: "sample@example.test" } };
    },
    setCloudSessionState: (...args) => sessions.push(args),
    refreshCloudProjectSyncDocuments: () => Promise.resolve(),
    getCloudUserDisplayName: u => u.username,
    postMarsMessage() {}, describeCloudError: e => e.message,
  };
  vm.createContext(env); vm.runInContext(source, env);
  const dialog = { getValues: () => ({}), setMessage: m => messages.push(m),
    setBusy() {}, setCancelHandler() {}, setCloseOnly() { assert.fail("Auth errors must allow retry"); } };
  return { env, forms, requests, sessions, messages, dialog };
}

test("login accepts email, keeps invalid credentials editable, and closes after success", async () => {
  const h = harness();
  await h.env.openCloudCredentialsDialog("login");
  const form = h.forms[0];
  assert.equal(form.sections[0].fields.find(f => f.name === "username").label, "Username or email");
  assert.equal((await form.beforeResolve({}, h.dialog)).close, false);
  const original = h.env.cloudRequestJson;
  h.env.cloudRequestJson = async () => { throw Object.assign(new Error("Invalid credentials"), { status: 401 }); };
  assert.equal((await form.beforeResolve({ username: "sample@example.test", password: "wrong" }, h.dialog)).close, false);
  assert.match(h.messages.at(-1), /incorrect/);
  h.env.cloudRequestJson = original;
  const result = await form.beforeResolve({ username: "sample@example.test", password: "correct-pass" }, h.dialog);
  assert.equal(result.result.value, true);
  assert.equal(h.sessions.at(-1)[0], "authenticated");
});

test("registration validates locally and duplicate accounts can be corrected", async () => {
  const h = harness(); await h.env.openCloudCredentialsDialog("register");
  const form = h.forms[0];
  assert(form.sections[0].fields.some(f => f.name === "social-google"));
  const values = { username: "sample", email: "sample@example.test", password: "12345678", repeatPassword: "different" };
  assert.equal((await form.beforeResolve(values, h.dialog)).close, false);
  assert.equal(h.requests.filter(r => r.path === "/register").length, 0);
  h.env.cloudRequestJson = async () => { throw Object.assign(new Error("duplicate"), { status: 409, payload: { field: "email" } }); };
  values.repeatPassword = values.password;
  assert.equal((await form.beforeResolve(values, h.dialog)).close, false);
  assert.match(h.messages.at(-1), /recover your password/);
});

test("switching to registration completes the original login request and never carries passwords", async () => {
  const h = harness(); let destination;
  h.env.runDialogForm = async form => {
    if (!destination) {
      const field = form.sections[0].fields.find(f => f.name === "create-account");
      await field.onClick({ getValues: () => ({ username: "sample@example.test", password: "secret" }), close: v => { destination = v; } });
      assert.equal(destination.values.email, "sample@example.test");
      assert.equal(destination.values.username, "");
      assert.equal(destination.values.password, undefined);
      return destination;
    }
    assert.equal(form.title, "Create Account");
    assert.equal(form.sections[0].fields.find(f => f.name === "email").value, "sample@example.test");
    return { ok: true, value: true };
  };
  assert.equal(await h.env.openCloudLoginDialog(), true);
});

test("recovery permits code resend and invalid codes without blocking retry", async () => {
  const h = harness(); await h.env.openPasswordResetConfirmDialog("sample@example.test");
  const form = h.forms[0];
  const fields = form.sections[0].fields;
  await fields.find(f => f.name === "resend-code").onClick(h.dialog);
  assert.equal(h.requests.at(-1).path, "/password-reset/request");
  assert.match(h.messages.at(-1), /If this email belongs/);
  h.env.cloudRequestJson = async () => { throw Object.assign(new Error("invalid code"), { status: 400 }); };
  assert.equal((await form.beforeResolve({ code: "123456", password: "12345678", repeatPassword: "12345678" }, h.dialog)).close, false);
  assert.match(h.messages.at(-1), /invalid or expired/);
});

test("an already linked Google identity is not offered for linking again", async () => {
  const h = harness();
  assert.equal((await h.env.cloudSocialSections("link", { providers: ["google"], connected: ["google"] })).length, 0);
  assert.equal((await h.env.cloudSocialSections("login", { providers: ["google"], connected: ["google"] }))[0].fields[0].name, "social-google");
});
