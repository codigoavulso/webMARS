(() => {
  const EXAMPLES = __EXAMPLES__;
  const TOOLS = __TOOLS__;
  const INV = {
    File: ["New", "Open from Disk...", "Open from Browser Storage...", "Close", "Close All", "Download", "Download As...", "Save to Browser Storage", "Save to Browser Storage As...", "Examples", "Dump Run I/O"],
    Cloud: ["Not signed in", "Login...", "Open Cloud Project...", "Save Active Project", "Sync All Projects", "Refresh Session"],
    Edit: ["Undo", "Redo", "Cut", "Copy", "Paste", "Find", "Select All"],
    Run: ["Assemble", "Go", "Pause", "Stop", "Step", "Backstep", "Reset"],
    Settings: ["Show Labels Window (symbol table)", "Program arguments provided to MIPS program", "Popup dialog for input syscalls", "Addresses displayed in hexadecimal", "Values displayed in hexadecimal", "Assemble file upon opening", "Assemble all files in directory", "Assembler warnings are considered errors", "Initialize Program Counter to global 'main' if defined", "Permit extended (pseudo) instructions and formats", "Delayed branching", "Self-modifying code", "Interface...", "Runtime & Memory..."],
    Tools: TOOLS.map((x) => x.label),
    Help: ["Help", "About ..."],
    Examples: EXAMPLES.map((x) => `${x.category} > ${x.label}`)
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const assert = (c, m) => { if (!c) throw new Error(m); };
  const byId = (id) => {
    const el = document.getElementById(id);
    assert(el, "Missing #" + id);
    return el;
  };
  const waitFor = async (fn, ms, label) => {
    const s = performance.now();
    while ((performance.now() - s) < ms) {
      if (fn()) return;
      await wait(50);
    }
    throw new Error("Timed out waiting for " + label);
  };
  const click = async (el) => {
    assert(el instanceof HTMLElement, "Expected HTMLElement click");
    el.click();
    await wait(120);
  };

  const coverage = [];
  const mark = (entry) => coverage.push(entry);
  const filePicker = { count: 0 };
  const downloads = [];
  const execs = [];
  let clip = "";

  const fi = document.querySelector('input[type="file"][hidden]');
  if (fi instanceof HTMLInputElement) fi.click = () => { filePicker.count += 1; };
  const anchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function patchedAnchorClick(...args) {
    if (this.download) {
      downloads.push({ download: String(this.download || ""), href: String(this.href || "") });
      return;
    }
    return typeof anchorClick === "function" ? anchorClick.apply(this, args) : undefined;
  };
  const oldExec = typeof document.execCommand === "function" ? document.execCommand.bind(document) : null;
  document.execCommand = (cmd, ui, val) => {
    const c = String(cmd || "").toLowerCase();
    execs.push(c);
    const ed = document.getElementById("source-editor");
    if (ed instanceof HTMLTextAreaElement) {
      const s = ed.selectionStart ?? 0;
      const e = ed.selectionEnd ?? s;
      const t = ed.value;
      const sel = t.slice(s, e);
      if (c === "copy") {
        clip = sel;
        return true;
      }
      if (c === "cut") {
        clip = sel;
        ed.value = t.slice(0, s) + t.slice(e);
        ed.setSelectionRange(s, s);
        ed.dispatchEvent(new Event("input", { bubbles: true }));
        ed.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
      if (c === "paste") {
        ed.value = t.slice(0, s) + clip + t.slice(e);
        const n = s + clip.length;
        ed.setSelectionRange(n, n);
        ed.dispatchEvent(new Event("input", { bubbles: true }));
        ed.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return oldExec ? oldExec(cmd, ui, val) : true;
  };

  const mbtn = (name) => {
    const el = document.querySelector(`.menu-item[data-menu="${name}"]`);
    assert(el, "Missing menu " + name);
    return el;
  };
  const pops = () => [...document.querySelectorAll(".menu-popup:not(.hidden)")];
  const rows = () => pops().flatMap((p) => [...p.querySelectorAll(".menu-row")]);
  const rlabel = (row) => row.querySelectorAll("span")[1]?.textContent?.trim() || row.textContent.trim();
  const findRow = (label) => rows().find((r) => rlabel(r) === label) || null;
  const hideMenus = async () => {
    if (!pops().length) return;
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait(80);
    if (!pops().length) return;
    const active = document.querySelector(".menu-item.active");
    if (active instanceof HTMLElement) active.click();
    await wait(80);
  };
  const openMenu = async (name) => {
    await hideMenus();
    await click(mbtn(name));
    if (!pops().length) await click(mbtn(name));
    await waitFor(() => pops().length > 0, 2000, "open menu " + name);
  };
  const closeMenu = async (name) => {
    await click(mbtn(name));
    await waitFor(() => pops().length === 0, 1500, "close menu " + name);
  };
  const menu = async (name, path) => {
    await openMenu(name);
    for (let i = 0; i < path.length; i += 1) {
      const row = findRow(path[i]);
      assert(row, "Missing menu row " + path[i]);
      await click(row);
      if (i < path.length - 1) {
        if (!findRow(path[i + 1])) {
          row.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        }
        await waitFor(() => Boolean(findRow(path[i + 1])), 2000, "submenu " + path[i + 1]);
      }
    }
  };
  const rowState = (label) => {
    const row = findRow(label);
    assert(row, "Missing visible row " + label);
    return { checked: (row.querySelector(".menu-check")?.textContent || "").trim().length > 0, disabled: row.disabled === true };
  };
  const ensureSettings = async () => {
    if (!findRow("Show Labels Window (symbol table)")) await openMenu("Settings");
  };
  const setPref = async (label, val) => {
    await ensureSettings();
    const st = rowState(label);
    if (st.checked !== val) await click(findRow(label));
    else await closeMenu("Settings");
    mark("Settings > " + label);
    await wait(120);
  };

  const dialog = () => document.getElementById("window-dialog-system") || document.querySelector('[id^="window-dialog-system"]');
  const dialogVisible = () => dialog() instanceof HTMLElement && !dialog().classList.contains("window-hidden");
  const dialogTitle = () => dialog()?.querySelector("#dialog-title, [data-dialog-role='title']")?.textContent?.trim() || "";
  const waitDialog = (title) => waitFor(() => dialogVisible() && dialogTitle() === title, 2500, "dialog " + title);
  const setDialogInput = async (value) => {
    const el = dialog()?.querySelector("#dialog-input, [data-dialog-role='input']");
    assert(el instanceof HTMLInputElement, "Missing dialog input");
    el.focus();
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(80);
  };
  const dfield = (name) => dialog()?.querySelector(`[data-field-name="${name}"]`);
  const setField = async (name, val) => {
    const el = dfield(name);
    assert(el, "Missing field " + name);
    if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = !!val;
    else el.value = String(val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(80);
  };
  const getField = (name) => {
    const el = dfield(name);
    assert(el, "Missing field " + name);
    return el instanceof HTMLInputElement && el.type === "checkbox" ? el.checked : el.value;
  };
  const okDialog = async () => {
    const button = dialog()?.querySelector("#dialog-confirm, [data-dialog-role='confirm']");
    assert(button instanceof HTMLElement, "Missing dialog confirm button");
    await click(button);
    await waitFor(() => !dialogVisible(), 2500, "dialog close");
  };
  const cancelDialog = async () => {
    const button = dialog()?.querySelector("#dialog-cancel, [data-dialog-role='cancel']");
    assert(button instanceof HTMLElement, "Missing dialog cancel button");
    await click(button);
    await waitFor(() => !dialogVisible(), 2500, "dialog cancel");
  };

  const bs = () => document.getElementById("window-browser-storage");
  const bsVisible = () => bs() instanceof HTMLElement && !bs().classList.contains("window-hidden");
  const waitBs = () => waitFor(bsVisible, 2500, "browser storage");
  const setBs = async (selector, value) => {
    const el = bs()?.querySelector(selector);
    assert(el instanceof HTMLInputElement, "Missing browser storage input " + selector);
    el.focus();
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(80);
  };
  const pickBs = async (name) => {
    await waitFor(() => [...bs().querySelectorAll(".browser-storage-file-row")].some((r) => (r.querySelector(".browser-storage-file-name")?.textContent?.trim() || "") === name), 2500, "browser file " + name);
    const row = [...bs().querySelectorAll(".browser-storage-file-row")].find((r) => (r.querySelector(".browser-storage-file-name")?.textContent?.trim() || "") === name);
    assert(row instanceof HTMLElement, "Missing browser storage row " + name);
    await click(row);
  };
  const bsPrimary = () => bs()?.querySelector("#browser-storage-primary");

  const src = () => byId("source-editor").value;
  const setSrc = async (text) => {
    const ed = byId("source-editor");
    ed.focus();
    ed.value = text;
    ed.dispatchEvent(new Event("input", { bubbles: true }));
    ed.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(150);
  };
  const select = (s, e) => {
    const ed = byId("source-editor");
    ed.focus();
    ed.setSelectionRange(s, e);
  };
  const selText = () => {
    const ed = byId("source-editor");
    return ed.value.slice(ed.selectionStart ?? 0, ed.selectionEnd ?? 0);
  };
  const activeTab = () => document.querySelector(".editor-file-tab.active")?.textContent?.trim() || "";
  const tabCount = () => document.querySelectorAll(".editor-file-tab").length;
  const clickTab = async (suffix) => {
    const btn = [...document.querySelectorAll(".editor-file-tab")].find((x) => {
      const t = (x.textContent || "").trim().replace(/^\*/, "");
      return t === suffix || t.endsWith(suffix);
    });
    assert(btn instanceof HTMLElement, "Missing tab " + suffix);
    await click(btn);
  };

  const mars = () => byId("mars-messages").value || "";
  const run = () => byId("run-messages").value || "";
  const clearMars = () => { byId("mars-messages").value = ""; };
  const setSpeed = async (v) => {
    const s = byId("run-speed-slider");
    s.value = String(v);
    s.dispatchEvent(new Event("input", { bubbles: true }));
    s.dispatchEvent(new Event("change", { bubbles: true }));
    await wait(80);
  };
  const snap = () => window.WebMarsRuntimeDebug?.getSnapshot?.({ includeDataRows: false, includeLabels: true, includeMemoryWords: false }) || null;
  const regHex = (name) => snap()?.registers?.find((r) => String(r?.name || "") === name)?.valueHex || "";
  const curAddr = () => {
    const row = snap()?.textRows?.find((r) => r?.isCurrent);
    return Number.isFinite(row?.address) ? (row.address >>> 0) : null;
  };
  const labelAddr = (name) => {
    const row = snap()?.labels?.find((r) => String(r?.label || "") === name);
    return Number.isFinite(row?.address) ? (row.address >>> 0) : null;
  };
  const labelsVisible = () => {
    const el = document.querySelector(".labels-panel");
    assert(el instanceof HTMLElement, "Missing labels panel");
    return getComputedStyle(el).display !== "none";
  };
  const txtAddr = () => document.querySelector("#text-segment-body tr[data-text-address] td:nth-child(2)")?.textContent?.trim() || "";
  const labelsText = () => byId("labels-list").textContent?.trim() || "";
  const pcText = () => byId("runtime-pc").textContent?.trim() || "";
  const dataVal = () => document.querySelector("#data-segment-body td[data-data-address] .data-cell-text")?.textContent?.trim() || "";
  const winVisible = (id) => {
    const el = document.getElementById(id);
    return el instanceof HTMLElement && !el.classList.contains("window-hidden");
  };
  const closeWin = async (id, selector = '[data-win-action="close"]') => {
    const el = document.getElementById(id);
    assert(el instanceof HTMLElement, "Missing window " + id);
    const btn = el.querySelector(selector);
    assert(btn instanceof HTMLElement, "Missing close button for " + id);
    await click(btn);
    await waitFor(() => !winVisible(id), 2500, "close " + id);
  };
  const closeAll = async () => {
    await menu("File", ["Close", "Close project"]);
    if (dialogVisible()) await okDialog();
    await waitFor(() => tabCount() === 1, 2500, "close project");
  };
  const assemble = async () => {
    await menu("Run", ["Assemble"]);
    await wait(200);
  };
  const openExample = async (entry) => {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await hideMenus();
        await openMenu("File");
        const examplesRow = findRow("Examples");
        assert(examplesRow, "Missing Examples row.");
        examplesRow.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        await click(examplesRow);
        await waitFor(() => Boolean(findRow(entry.category)), 2500, "example category " + entry.category);
        const categoryRow = findRow(entry.category);
        assert(categoryRow, "Missing example category " + entry.category);
        categoryRow.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        await click(categoryRow);
        await waitFor(() => Boolean(findRow(entry.label)), 2500, "example row " + entry.label);
        await click(findRow(entry.label));
        await wait(180);
        mark("File > Examples");
        mark("Examples > " + entry.category + " > " + entry.label);
        return;
      } catch (error) {
        lastError = error;
        await hideMenus();
        await wait(120);
      }
    }
    throw lastError || new Error("Failed to open example " + entry.label);
  };
  const closeStartupAbout = async () => {
    if (!winVisible("window-help-about")) return;
    const btn = document.querySelector("#window-help-about #mars-help-about-close");
    if (btn instanceof HTMLElement) {
      await click(btn);
      await waitFor(() => !winVisible("window-help-about"), 2500, "close startup about");
    }
  };

  const P = {
    data: [".data", "value: .word 15", ".text", "main:", "  li $v0, 10", "  syscall", ""].join("\n"),
    finite: [".text", "main:", "  addi $t0, $zero, 1", "  addi $t1, $t0, 2", "  addi $t2, $t1, 3", "  li $v0, 10", "  syscall", ""].join("\n"),
    loop: [".text", "main:", "  addi $t0, $t0, 1", "  j main", "  nop", ""].join("\n"),
    input: [".text", "main:", "  li $v0, 5", "  syscall", "  li $v0, 10", "  syscall", ""].join("\n"),
    warn: [".data", "  .byte 300", ".text", "main:", "  li $v0, 10", "  syscall", ""].join("\n"),
    start: [".text", "foo:", "  li $t0, 1", "main:", "  li $v0, 10", "  syscall", ""].join("\n"),
    pseudo: [".text", "main:", "  move $t0, $zero", "  li $v0, 10", "  syscall", ""].join("\n"),
    delay: [".text", "main:", "  li $t0, 0", "  beq $zero, $zero, skip", "  addi $t0, $t0, 1", "skip:", "  li $v0, 10", "  syscall", ""].join("\n"),
    smc: [".text", "main:", "  lui $t0, 0x0040", "  ori $t0, $t0, 0x0000", "  sw $zero, 0($t0)", "  li $v0, 10", "  syscall", ""].join("\n")
  };
  const exHello = EXAMPLES.find((x) => x.label === "hello_world_runio.asm");
  const exMulti = EXAMPLES.find((x) => x.label === "multi_file_number_analyzer.asm");
  const exMenuSmoke = exHello || EXAMPLES[0] || null;

  return (async () => {
    await closeStartupAbout();
    const report = { generatedAt: new Date().toISOString(), inventory: INV, cases: [] };
    const runCase = async (name, fn) => {
      const s = performance.now();
      try {
        report.cases.push({ name, ok: true, durationMs: Math.round((performance.now() - s) * 1000) / 1000, detail: await fn() });
      } catch (error) {
        report.cases.push({
          name,
          ok: false,
          durationMs: Math.round((performance.now() - s) * 1000) / 1000,
          error: error instanceof Error ? (error.stack || error.message) : String(error),
          snapshot: snap(),
          mars: mars(),
          run: run()
        });
      }
    };

    await runCase("File menu core entries", async () => {
      await closeAll();
      await setSrc(".text\nmain:\n  li $v0, 10\n  syscall\n");
      const before = tabCount();
      await menu("File", ["New", "s file"]);
      mark("File > New > s file");
      await waitFor(() => tabCount() === before + 1, 2000, "new tab");

      filePicker.count = 0;
      await menu("File", ["Open from Disk..."]);
      mark("File > Open from Disk...");
      assert(filePicker.count === 1, "Open from Disk should click the hidden file input.");

      await closeAll();
      await setSrc("# browser v1\n.text\nmain:\n  li $v0, 10\n  syscall\n");
      await menu("File", ["Save to Browser Storage As..."]);
      mark("File > Save to Browser Storage As...");
      await waitBs();
      await setBs("#browser-storage-folder-input", "");
      await setBs("#browser-storage-name-input", "menu_saved.asm");
      await click(bsPrimary());
      await waitFor(() => !bsVisible(), 2500, "save as close");

      await setSrc("# browser v2\n.text\nmain:\n  li $v0, 10\n  syscall\n");
      await menu("File", ["Save to Browser Storage"]);
      mark("File > Save to Browser Storage");
      await wait(200);

      await closeAll();
      await menu("File", ["Open from Browser Storage..."]);
      mark("File > Open from Browser Storage...");
      await waitBs();
      await pickBs("menu_saved.asm");
      await click(bsPrimary());
      await waitFor(() => !bsVisible(), 2500, "open browser storage");
      assert(src().includes("browser v2"), "Open from Browser Storage should load the saved file.");

      downloads.length = 0;
      await menu("File", ["Download"]);
      mark("File > Download");
      await waitFor(() => downloads.length > 0, 1500, "download");
      assert(downloads[downloads.length - 1].download === "menu_saved.asm", "Download should use the active file name.");

      downloads.length = 0;
      await menu("File", ["Download As..."]);
      mark("File > Download As...");
      await waitDialog("Save as");
      await setDialogInput("menu_downloaded.asm");
      await okDialog();
      await waitFor(() => downloads.length > 0, 1500, "download as");
      assert(downloads[downloads.length - 1].download === "menu_downloaded.asm", "Download As name mismatch.");

      const countBeforeClose = tabCount();
      await menu("File", ["New", "s file"]);
      await waitFor(() => tabCount() === countBeforeClose + 1, 1500, "extra tab");
      await menu("File", ["Close", "Active file"]);
      mark("File > Close > Active file");
      if (dialogVisible()) await okDialog();
      await waitFor(() => tabCount() === countBeforeClose, 2000, "close");

      await menu("File", ["New", "s file"]);
      await waitFor(() => tabCount() >= 2, 1500, "tab before close all");
      await menu("File", ["Close", "Close project"]);
      mark("File > Close > Close project");
      if (dialogVisible()) await okDialog();
      await waitFor(() => tabCount() === 1, 2500, "close project done");

      byId("run-messages").value = "hello";
      downloads.length = 0;
      await menu("File", ["Dump Run I/O"]);
      mark("File > Dump Run I/O");
      await waitFor(() => downloads.length > 0, 1500, "dump run io");
      assert(downloads[downloads.length - 1].download === "run-io.txt", "Dump Run I/O filename mismatch.");
      return { activeTab: activeTab(), downloads: downloads.length };
    });

    await runCase("File > Examples > single entry", async () => {
      assert(exMenuSmoke, "Missing example manifest entries.");
      await closeAll();
      await openExample(exMenuSmoke);
      await waitFor(() => src().trim().length > 0, 3000, "example " + exMenuSmoke.label);
      const expected = exMenuSmoke.path.split("/").pop() || exMenuSmoke.label;
      if (exMenuSmoke.fileCount > 1) assert(tabCount() >= exMenuSmoke.fileCount, "Multi-file example should open all files.");
      assert(activeTab().replace(/^\*/, "").endsWith(expected), "Active tab mismatch for " + exMenuSmoke.label);
      return { example: `${exMenuSmoke.category} > ${exMenuSmoke.label}` };
    });

    await runCase("Cloud menu entries", async () => {
      await openMenu("Cloud");
      const statusRow = findRow("Not signed in") || rows().find((row) => rlabel(row).startsWith("Signed in as "));
      const authRow = findRow("Login...") || rows().find((row) => rlabel(row).startsWith("Logout"));
      assert(statusRow, "Cloud status row missing.");
      assert(authRow, "Cloud auth row missing.");
      assert(findRow("Open Cloud Project..."), "Cloud open row missing.");
      assert(findRow("Save Active Project"), "Cloud save row missing.");
      assert(findRow("Sync All Projects"), "Cloud sync row missing.");
      assert(findRow("Refresh Session"), "Cloud refresh row missing.");
      if (rlabel(authRow) === "Login...") {
        await click(authRow);
        await waitDialog("Cloud Login");
        await cancelDialog();
        mark("Cloud > Login...");
      } else {
        await hideMenus();
        mark("Cloud > Logout");
      }
      return {
        status: true,
        dialog: true
      };
    });

    await runCase("Edit menu entries", async () => {
      await closeAll();
      await setSrc("first");
      await setSrc("second");
      await menu("Edit", ["Undo"]);
      mark("Edit > Undo");
      await waitFor(() => src() === "first", 1500, "undo");
      await menu("Edit", ["Redo"]);
      mark("Edit > Redo");
      await waitFor(() => src() === "second", 1500, "redo");

      await setSrc("copy this text");
      await menu("Edit", ["Select All"]);
      mark("Edit > Select All");
      assert(selText() === "copy this text", "Select All failed.");

      select(0, 4);
      execs.length = 0;
      await menu("Edit", ["Copy"]);
      mark("Edit > Copy");
      assert(execs.includes("copy"), "Copy failed.");

      select(0, 4);
      execs.length = 0;
      await menu("Edit", ["Cut"]);
      mark("Edit > Cut");
      assert(execs.includes("cut"), "Cut failed.");

      const ed = byId("source-editor");
      ed.setSelectionRange(ed.value.length, ed.value.length);
      execs.length = 0;
      await menu("Edit", ["Paste"]);
      mark("Edit > Paste");
      assert(execs.includes("paste"), "Paste failed.");

      await menu("Edit", ["Find"]);
      mark("Edit > Find");
      await waitDialog("Find");
      await cancelDialog();
      return { clipboard: clip, sourceLength: src().length };
    });

    await runCase("Run menu entries", async () => {
      await closeAll();
      await setSrc(P.finite);
      await assemble();
      mark("Run > Assemble");
      assert(snap()?.assembled === true, "Assemble failed.");

      await menu("Run", ["Step"]);
      mark("Run > Step");
      await waitFor(() => (snap()?.steps || 0) >= 1, 2000, "step");

      await menu("Run", ["Backstep"]);
      mark("Run > Backstep");
      await waitFor(() => (snap()?.steps || 0) === 0, 2000, "backstep");

      await menu("Run", ["Step"]);
      await waitFor(() => (snap()?.steps || 0) >= 1, 2000, "step before reset");
      await menu("Run", ["Reset"]);
      mark("Run > Reset");
      await waitFor(() => snap()?.assembled === true && snap()?.halted === false && (snap()?.steps || 0) === 0, 3000, "reset");

      await closeAll();
      await setSrc(P.loop);
      await assemble();
      await setSpeed(5);
      await menu("Run", ["Go"]);
      mark("Run > Go");
      await waitFor(() => byId("btn-pause").disabled === false, 2500, "go running");

      await menu("Run", ["Pause"]);
      mark("Run > Pause");
      await waitFor(() => byId("btn-pause").disabled === true && byId("btn-step").disabled === false, 2500, "pause");

      await menu("Run", ["Go"]);
      await waitFor(() => byId("btn-pause").disabled === false, 2500, "go again");
      await menu("Run", ["Stop"]);
      mark("Run > Stop");
      await waitFor(() => snap()?.halted === true, 3000, "stop");
      return { steps: snap()?.steps || 0, halted: snap()?.halted === true };
    });

    await runCase("Settings menu entries", async () => {
      await closeAll();
      await setSrc(P.data);
      await assemble();

      await setPref("Show Labels Window (symbol table)", false);
      await waitFor(() => labelsVisible() === false, 1500, "labels hide");
      await setPref("Show Labels Window (symbol table)", true);
      await waitFor(() => labelsVisible() === true, 1500, "labels show");

      await setPref("Program arguments provided to MIPS program", false);
      await menu("Settings", ["Program arguments provided to MIPS program"]);
      await waitDialog("Program Arguments");
      await setDialogInput('ola 123 "abc def"');
      await okDialog();
      mark("Settings > Program arguments provided to MIPS program");
      await openMenu("Settings");
      assert(rowState("Program arguments provided to MIPS program").checked === true, "Program arguments should be checked.");
      await click(findRow("Program arguments provided to MIPS program"));
      await wait(120);

      await setPref("Popup dialog for input syscalls", true);
      await closeAll();
      await setSrc(P.input);
      await assemble();
      await menu("Run", ["Go"]);
      mark("Settings > Popup dialog for input syscalls");
      await waitFor(() => dialogVisible() && dialogTitle().startsWith("Input syscall"), 2500, "popup input");
      await cancelDialog();
      await setPref("Popup dialog for input syscalls", false);

      await closeAll();
      await setSrc(P.data);
      await assemble();
      await setPref("Addresses displayed in hexadecimal", false);
      mark("Settings > Addresses displayed in hexadecimal");
      await waitFor(() => !txtAddr().startsWith("0x"), 1500, "decimal addresses");
      await setPref("Addresses displayed in hexadecimal", true);

      await setPref("Values displayed in hexadecimal", false);
      mark("Settings > Values displayed in hexadecimal");
      await waitFor(() => dataVal() === "15", 1500, "decimal values");
      await setPref("Values displayed in hexadecimal", true);

      assert(exHello, "Missing hello world example.");
      await setPref("Assemble file upon opening", true);
      await openExample(exHello);
      mark("Settings > Assemble file upon opening");
      await waitFor(() => snap()?.assembled === true, 3000, "auto assemble");
      await setPref("Assemble file upon opening", false);

      assert(exMulti, "Missing multi-file example.");
      await closeAll();
      await setPref("Assemble all files in directory", true);
      await openExample(exMulti);
      await clickTab("main.asm");
      await assemble();
      mark("Settings > Assemble all files in directory");
      assert(snap()?.assembled === true, "Assemble all files in directory failed.");
      await setPref("Assemble all files in directory", false);

      await closeAll();
      await setSrc(P.warn);
      await setPref("Assembler warnings are considered errors", true);
      await assemble();
      mark("Settings > Assembler warnings are considered errors");
      assert((snap()?.errors || []).length > 0, "Warnings as errors should fail.");
      await setPref("Assembler warnings are considered errors", false);

      await closeAll();
      await setSrc(P.start);
      await setPref("Initialize Program Counter to global 'main' if defined", true);
      await assemble();
      mark("Settings > Initialize Program Counter to global 'main' if defined");
      assert(curAddr() === labelAddr("main"), "Start at main enabled should use main.");

      await closeAll();
      await setSrc(P.pseudo);
      await setPref("Permit extended (pseudo) instructions and formats", true);
      await assemble();
      mark("Settings > Permit extended (pseudo) instructions and formats");
      assert(snap()?.assembled === true, "Pseudo instructions should assemble when enabled.");
      await setPref("Permit extended (pseudo) instructions and formats", false);
      await setPref("Permit extended (pseudo) instructions and formats", true);

      await closeAll();
      await setSrc(P.delay);
      await setPref("Delayed branching", false);
      await assemble();
      await menu("Run", ["Go"]);
      await waitFor(() => snap()?.halted === true, 2500, "halt without delay");
      const noDelay = regHex("$t0");
      await setPref("Delayed branching", true);
      await assemble();
      await menu("Run", ["Go"]);
      await waitFor(() => snap()?.halted === true, 2500, "halt with delay");
      mark("Settings > Delayed branching");
      assert(noDelay !== regHex("$t0"), "Delayed branching should change result.");

      await closeAll();
      clearMars();
      await setSrc(P.smc);
      await setPref("Self-modifying code", false);
      await assemble();
      await menu("Run", ["Go"]);
      await waitFor(() => mars().includes("Self-modifying code is disabled"), 2500, "smc error");
      await setPref("Self-modifying code", true);
      await assemble();
      await menu("Run", ["Go"]);
      await waitFor(() => snap()?.halted === true, 2500, "smc allowed");
      mark("Settings > Self-modifying code");
      await setPref("Self-modifying code", false);

      await menu("Settings", ["Interface..."]);
      mark("Settings > Interface...");
      await waitDialog("Interface Preferences");
      await cancelDialog();

      await menu("Settings", ["Runtime & Memory..."]);
      mark("Settings > Runtime & Memory...");
      await waitDialog("Runtime & Memory Preferences");
      await cancelDialog();

      return { pc: pcText() };
    });

    await runCase("Tools menu entries", async () => {
      for (const tool of TOOLS) {
        await menu("Tools", [tool.label]);
        mark("Tools > " + tool.label);
        const id = "window-tool-" + tool.id;
        await waitFor(() => winVisible(id), 3000, "tool " + tool.label);
        await closeWin(id);
      }
      return { count: TOOLS.length };
    });

    await runCase("Help menu entries", async () => {
      await menu("Help", ["Help"]);
      mark("Help > Help");
      await waitFor(() => winVisible("window-help"), 3000, "help window");
      await closeWin("window-help", "#mars-help-close");

      await menu("Help", ["About ..."]);
      mark("Help > About ...");
      await waitFor(() => winVisible("window-help-about"), 3000, "about window");
      await closeWin("window-help-about", "#mars-help-about-close");
      return { help: true, about: true };
    });

    report.coverage = { tested: coverage, total: coverage.length };
    report.summary = {
      total: report.cases.length,
      passed: report.cases.filter((x) => x.ok).length,
      failed: report.cases.filter((x) => !x.ok).length
    };
    return report;
  })();
})();
