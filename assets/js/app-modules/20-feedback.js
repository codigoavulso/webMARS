(() => {
  const scope = typeof window !== "undefined" ? window : globalThis;
  const registry = scope.WebMarsModules || (scope.WebMarsModules = {});
  const minute = 60000;
  const MiB = 1024 * 1024;
  const imageTypes = ["image/png", "image/jpeg", "image/webp"];

  function createGate(prompt) {
    let time = 0, kind = "", signature = "", count = 0;
    function request() { if (time >= 10 * minute || count >= 3) prompt(); }
    return {
      tick(elapsed, active) {
        if (!active) return;
        time += Math.max(0, Math.min(5000, elapsed));
        request();
      },
      outcome(type, error) {
        if (error == null) {
          if (kind === type) { kind = ""; signature = ""; count = 0; }
          return;
        }
        const next = JSON.stringify(error).slice(0, 4096);
        count = kind === type && signature === next ? count + 1 : 1;
        kind = type;
        signature = next;
        request();
      }
    };
  }

  function create({ translate, dialog, getApi, getProjectKey, getProject }) {
    const build = scope.WebMarsAppVersion?.build || "";
    const storageKey = "webmars-feedback-shown:" + build;
    let shown = false, checking = false, editing = false, nudge = null;
    let nextCheck = 0;
    try { shown = scope.sessionStorage.getItem(storageKey) === "1"; } catch {}

    function endpoint() {
      const url = new URL(getApi().replace(/\/$/, "") + "/feedback", scope.location.origin);
      if (url.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
        throw new Error("Invalid feedback endpoint");
      }
      return url.href;
    }

    function remember() {
      shown = true;
      try { scope.sessionStorage.setItem(storageKey, "1"); } catch {}
      nudge?.remove();
    }

    async function open() {
      if (editing) return;
      editing = true;
      remember();
      const projectKey = getProjectKey();
      try {
        await dialog({
          title: translate("Send feedback"),
          message: translate("Only your message, the build number and the attachments you select are sent."),
          confirmLabel: translate("Send"), cancelLabel: translate("Cancel"),
          width: "500px", height: "375px",
          sections: [{ fields: [
            { name: "message", label: translate("Message"), type: "textarea" },
            { name: "screenshots", label: translate("Screenshots (optional)"), type: "file",
              multiple: true, accept: imageTypes.join(","),
              help: translate("Up to 3 PNG, JPEG or WebP images, 2 MB each.") },
            ...(projectKey ? [{ name: "project", label: translate("Include the open project"), type: "checkbox", value: false }] : [])
          ] }],
          beforeResolve: async (values, form) => {
            const message = String(values.message || "").trim();
            const images = values.screenshots || [];
            if (!message || [...message].length > 4000) {
              form.setMessage(translate("Enter a message of up to 4000 characters."), "error");
              return { close: false };
            }
            if (images.length > 3 || images.some(file => !imageTypes.includes(file.type) || !file.size || file.size > 2 * MiB)) {
              form.setMessage(translate("Up to 3 PNG, JPEG or WebP images, 2 MB each."), "error");
              return { close: false };
            }
            const data = new FormData();
            data.append("message", message);
            data.append("build", build);
            for (const image of images) data.append("screenshots", image);
            if (values.project === true) {
              const project = getProjectKey() === projectKey ? getProject() : null;
              if (!project) {
                form.setMessage(translate("The selected project is no longer open."), "error");
                return { close: false };
              }
              const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
              if (blob.size > MiB) {
                form.setMessage(translate("The project attachment exceeds 1 MB."), "error");
                return { close: false };
              }
              data.append("project", blob, "webmars-project.json");
            }
            try {
              const response = await scope.fetch(endpoint(), {
                method: "POST", credentials: "omit", redirect: "error",
                body: data, signal: AbortSignal.timeout(25000)
              });
              if (response.status !== 204) throw new Error("Delivery failed");
              return { result: { ok: true, value: true } };
            } catch {
              form.setMessage(translate("Could not send feedback. Please try again."), "error");
              return { close: false };
            }
          }
        }, { windowIdPrefix: "window-feedback" }).then(result => {
          if (result?.ok) return dialog({
            title: translate("Send feedback"), message: translate("Thank you for your feedback."),
            sections: [], hideConfirm: true, cancelLabel: translate("Close"), width: "350px", height: "150px"
          }, { windowIdPrefix: "window-feedback-sent" });
        });
      } finally { editing = false; }
    }

    async function prompt() {
      if (shown || checking || editing || document.visibilityState !== "visible" || Date.now() < nextCheck) return;
      checking = true;
      nextCheck = Date.now() + minute;
      try {
        const response = await scope.fetch(endpoint(), {
          credentials: "omit", redirect: "error", signal: AbortSignal.timeout(3000)
        });
        if (!response.ok || !(await response.json()).enabled || shown || document.visibilityState !== "visible") return;
        nudge = document.createElement("aside");
        nudge.className = "feedback-nudge";
        nudge.setAttribute("aria-label", translate("Send feedback"));
        const text = document.createElement("p");
        text.setAttribute("role", "status");
        text.textContent = translate("Found a bug or have suggestions for improvement?");
        const actions = document.createElement("div");
        for (const [label, handler] of [["Send feedback", open], ["Close", remember]]) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "tool-btn";
          button.textContent = translate(label);
          button.addEventListener("click", handler);
          actions.append(button);
        }
        nudge.append(text, actions);
        document.body.append(nudge);
        shown = true;
        try { scope.sessionStorage.setItem(storageKey, "1"); } catch {}
      } catch { /* Feedback is optional on static installations. */ }
      finally { checking = false; }
    }

    const gate = createGate(() => { void prompt(); });
    let used = false;
    let last = scope.performance.now();
    const active = () => used && document.visibilityState === "visible" && document.hasFocus();
    const sample = () => {
      const now = scope.performance.now();
      gate.tick(now - last, active());
      last = now;
    };
    for (const event of ["pointerdown", "keydown"]) scope.addEventListener(event, (event) => {
      if (event.isTrusted) used = true;
    }, { passive: true });
    for (const event of ["focus", "blur", "pageshow", "pagehide"]) {
      scope.addEventListener(event, () => { last = scope.performance.now(); });
    }
    document.addEventListener("visibilitychange", () => { last = scope.performance.now(); });
    scope.setInterval(sample, 5000);
    scope.addEventListener("error", event => {
      if (used && event.message) gate.outcome("app", event.message);
    });
    scope.addEventListener("unhandledrejection", event => {
      if (used) gate.outcome("app", String(event.reason?.message || event.reason || "rejection"));
    });
    return { open, outcome: gate.outcome };
  }

  registry.feedback = Object.freeze({ create, createGate });
})();
