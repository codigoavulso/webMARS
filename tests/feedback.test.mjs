import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../assets/js/app-modules/20-feedback.js", import.meta.url), "utf8");
function load(extra = {}) {
  const env = vm.createContext(extra);
  vm.runInContext(source, env);
  return env.WebMarsModules.feedback;
}

test("feedback waits for ten minutes of active use and ignores suspension", () => {
  let prompts = 0;
  const gate = load().createGate(() => prompts++);
  gate.tick(10 * 60000, false);
  gate.tick(10 * 60000, true); // capped sample after suspension
  for (let i = 0; i < 118; i++) gate.tick(5000, true);
  assert.equal(prompts, 0);
  gate.tick(5000, true);
  assert.equal(prompts, 1);
});

test("three matching failures are needed; different errors and a successful retry reset the streak", () => {
  let prompts = 0;
  const gate = load().createGate(() => prompts++);
  gate.outcome("run", "one");
  gate.outcome("run", "one");
  gate.outcome("run", "two");
  gate.outcome("run", null);
  gate.outcome("run", "two");
  gate.outcome("assemble", null);
  gate.outcome("run", "two");
  assert.equal(prompts, 0);
  gate.outcome("run", "two");
  assert.equal(prompts, 1);
});

test("feedback includes a project only on consent and refuses a different open project", async () => {
  const requests = [];
  let key = "initial", snapshots = 0;
  const feedback = load({
    URL, FormData, Blob, AbortSignal,
    document: {addEventListener() {}}, performance: {now: () => 0},
    addEventListener() {}, setInterval() {},
    location: {origin: "https://webmars.test"},
    WebMarsAppVersion: {build: "202611082358"},
    fetch: async (url, options) => { requests.push({url, options}); return {status: 204}; }
  });
  let values = {message: "Something went wrong", project: false, screenshots: []};
  const form = {setMessage() {}};
  const ui = feedback.create({
    translate: s => s, getApi: () => "https://api.webmars.test/api",
    getProjectKey: () => key,
    getProject: () => { snapshots++; return {files: []}; },
    dialog: async ({beforeResolve, sections}) => {
      assert.equal(sections[0].fields.find(field => field.name === "project").value, false);
      if (values.message === "changed") key = "different";
      await beforeResolve(values, form);
    }
  });
  await ui.open();
  assert.equal(snapshots, 0);
  assert.equal(requests[0].options.body.has("project"), false);
  assert.equal(requests[0].options.body.get("build"), "202611082358");
  values = {...values, project: true};
  await ui.open();
  assert.equal(snapshots, 1);
  assert.equal(requests[1].options.body.has("project"), true);
  values.message = "changed";
  await ui.open();
  assert.equal(snapshots, 1);
  assert.equal(requests.length, 2);
});
