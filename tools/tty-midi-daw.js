(function () {
  const id = "tty-midi-daw";
  const label = "TTY MIDI DAW";
  const script = new URL(document.currentScript.src);
  function asset(path) {
    const url = new URL(path, script);
    url.search = script.search;
    return url.href;
  }

  const movements = [
    ["mips_piano_01_allegro_con_brio.asm", "I. Allegro con brio"],
    ["mips_piano_02_andante_con_moto.asm", "II. Andante con moto"],
    ["mips_piano_03_allegro.asm", "III. Allegro"],
    ["mips_piano_04_finale.asm", "IV. Finale"]
  ];
  const hex = (byte) => byte.toString(16).toUpperCase().padStart(2, "0");
  const parseByte = (value) => /^(?:0x)?[\da-f]{1,2}$/i.test(value) ? Number.parseInt(value, 16) : NaN;
  const noteName = (pitch) => ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"][pitch % 12] + (Math.floor(pitch / 12) - 1);

  window.MarsWebTools.register({
    id, label,
    create(ctx) {
      function t(message, portuguese) {
        return document.documentElement.lang.toLowerCase().startsWith("pt") ? portuguese : message;
      }
      const tr = t;
      const shell = ctx.createToolWindowShell(id, label, 950, 660, [
        '<div class="midi-tty">',
        '<style>',
        '.midi-tty{box-sizing:border-box;display:flex;flex-direction:column;gap:.5em;height:100%;padding:.65em;overflow:auto;background:var(--surface-sunken);color:var(--text);font:12px/1.4 ui-monospace,monospace}',
        '.midi-tty *{box-sizing:border-box}',
        '.midi-tty [hidden]{display:none!important}',
        '.midi-tty .daw-controls{display:flex;align-items:center;flex-wrap:wrap;gap:.4em}',
        '.midi-tty select,.midi-tty input,.midi-tty button{min-width:0;font:inherit}',
        '.midi-tty select,.midi-tty button{max-width:100%;white-space:nowrap}',
        '.midi-tty button[aria-pressed=true]{border-color:#75bafa;font-weight:bold}',
        '.midi-tty .daw-position{margin-left:auto;min-width:16ch;text-align:right}',
        '.midi-tty .daw-seek{width:100%;margin:0}',
        '.midi-tty .daw-roll{font:inherit;min-height:3.5em;max-height:14em;overflow:auto;margin:0;padding:.3em .5em;border:1px solid var(--border,#61788b);white-space:pre}',
        '.midi-tty .daw-list{flex:1;min-height:7em;overflow:auto;border:1px solid var(--border,#61788b)}',
        '.midi-tty table{border-collapse:collapse;width:100%;white-space:nowrap;text-align:left}',
        '.midi-tty th,.midi-tty td{padding:.2em .55em}',
        '.midi-tty th{position:sticky;top:0;background:var(--table-head,#3a4a5a);z-index:1}',
        '.midi-tty tbody tr:nth-child(even){background:rgba(127,127,127,.09)}',
        '.midi-tty .daw-row{padding:0 .35em}',
        '.midi-tty .daw-status{min-height:1.4em;overflow-wrap:anywhere}',
        '.midi-tty .daw-error{color:var(--danger,#b52e24)}',
        '.midi-tty .daw-prompt{display:flex;align-items:center;gap:.5em}',
        '.midi-tty .daw-prompt input{flex:1}',
        '.midi-tty .daw-help{white-space:pre-wrap;margin:0;max-height:13em;overflow:auto}',
        '</style>',
        '<div class="daw-controls" data-part="files"></div>',
        '<div class="daw-controls" data-part="transport"></div>',
        '<input class="daw-seek" type="range" min="0" max="1" value="0">',
        '<div class="daw-controls" data-part="view"></div>',
        '<pre class="daw-roll" aria-hidden="true"></pre>',
        '<div class="daw-list"><table><thead></thead><tbody></tbody></table></div>',
        '<div class="daw-controls" data-part="pages"></div>',
        '<div class="daw-status" role="status" aria-live="polite"></div>',
        '<pre class="daw-help" hidden></pre>',
        '<form class="daw-prompt"><label for="tty-midi-command">midi&gt;</label>',
        '<input id="tty-midi-command" autocomplete="off" spellcheck="false">',
        '<button type="submit" class="tool-btn"></button></form>',
        '<input type="file" accept=".mid,.midi,audio/midi,audio/x-midi" hidden>',
        '</div>'
      ].join(""));
      const root = shell.content.querySelector(".midi-tty");
      let ready;
      let suspend = () => {};
      new MutationObserver(() => {
        if (shell.root.classList.contains("window-hidden")) suspend();
      }).observe(shell.root, { attributes: true, attributeFilter: ["class"] });

      function initialize(midi, createTransport) {
        const find = (selector) => root.querySelector(selector);
        const part = (name) => find('[data-part="' + name + '"]');
        const prompt = find("#tty-midi-command");
        const help = find(".daw-help");
        const status = find(".daw-status");
        const roll = find(".daw-roll");
        const seek = find(".daw-seek");
        const fileInput = find('[type="file"]');
        const pageSize = 24;
        const documents = new Map();
        const commandHistory = [];
        let historyIndex = 0;
        let openRequest = 0;
        let importCount = 0;
        let active = "new";
        let view = "notes";
        let page = 0;
        let playing = false;
        let tick = 0;
        let clock;
        let end = 0;
        let entries = [];
        let plottedAt = 0;
        let plotManuallyMoved = false;

        const doc = () => documents.get(active);
        const track = () => doc().song.tracks[doc().track];
        const transport = createTransport(midi, (position, isPlaying) => {
          tick = position;
          playing = isPlaying;
          renderPosition();
        });
        suspend = () => transport.pause();

        function report(message, error = false) {
          status.textContent = message;
          status.classList.toggle("daw-error", error);
        }

        function run(action) {
          try {
            Promise.resolve(action()).catch((error) => report(error.message, true));
          } catch (error) {
            report(error.message, true);
          }
        }

        function element(tag, value, parent) {
          const node = document.createElement(tag);
          node.textContent = value;
          parent.append(node);
          return node;
        }

        function button(parent, label, action, title = label) {
          const node = element("button", label, parent);
          node.type = "button";
          node.className = "tool-btn";
          node.title = title;
          node.addEventListener("click", () => run(action));
          return node;
        }

        function select(parent, label) {
          const node = element("select", "", parent);
          node.setAttribute("aria-label", label);
          return node;
        }

        function option(parent, value, label) {
          element("option", label, parent).value = value;
        }

        function prefill(line, cursor = line.length) {
          prompt.value = line;
          prompt.focus();
          prompt.setSelectionRange(cursor, line.length);
        }

        function newDocument(key, title, song) {
          documents.set(key, { title, song, savedSong: song, track: 0, undo: [], redo: [], muted: new Set(), solo: new Set(), loop: null });
        }

        newDocument("new", tr("Untitled", "Sem título"), midi.emptyMidi());
        window.addEventListener("beforeunload", (event) => {
          if (![...documents.values()].some((item) => item.song !== item.savedSong)) return;
          event.preventDefault();
          event.returnValue = "";
        });

        const files = part("files");
        const scores = select(files, tr("Score", "Partitura"));
        button(files, tr("New", "Novo"), () => {
          const key = "local-" + ++importCount;
          newDocument(key, tr("Untitled", "Sem título") + " " + importCount, midi.emptyMidi());
          switchTo(key);
        });
        button(files, tr("Open .mid", "Abrir .mid"), () => fileInput.click());
        button(files, tr("Save .mid", "Guardar .mid"), exportMidi);
        const helpButton = button(files, tr("Commands", "Comandos"), toggleHelp);
        helpButton.setAttribute("aria-expanded", "false");

        const transportBar = part("transport");
        const playButton = button(transportBar, tr("Play", "Ouvir"), togglePlayback);
        button(transportBar, tr("Stop", "Parar"), () => locate(0, false));
        const loopButton = button(transportBar, "Loop", () => runCommand(doc().loop ? "loop off" : "loop 0 " + end));
        button(transportBar, tr("Go to tick", "Ir para tick"), () => prefill("seek " + tick, 5));
        const position = element("span", "", transportBar);
        position.className = "daw-position";
        seek.setAttribute("aria-label", tr("Playback position", "Posição da reprodução"));

        const viewBar = part("view");
        const tracks = select(viewBar, tr("Track", "Pista"));
        const notesButton = button(viewBar, tr("Notes", "Notas"), () => setView("notes"));
        const eventsButton = button(viewBar, tr("Events", "Eventos"), () => setView("events"));
        const muteButton = button(viewBar, tr("Mute", "Silenciar"), () => toggleTrack("muted"));
        const soloButton = button(viewBar, "Solo", () => toggleTrack("solo"));
        const addButton = button(viewBar, tr("Add note", "Adicionar nota"), () => prefill(view === "notes"
          ? "note add " + tick + " " + Math.max(1, Math.round(clock.tickAt(clock.secondsAt(tick) + 0.25)) - tick) + " 1 60 90"
          : "event add " + tick + " B0 07 64", view === "notes" ? 9 : 10));
        button(viewBar, tr("Undo", "Desfazer"), () => undo(false));
        button(viewBar, tr("Redo", "Refazer"), () => undo(true));

        const pages = part("pages");
        const previous = button(pages, "◀", () => browsePage(page - 1), tr("Previous page", "Página anterior"));
        const pageInfo = element("span", "", pages);
        const next = button(pages, "▶", () => browsePage(page + 1), tr("Next page", "Página seguinte"));
        find('[type="submit"]').textContent = tr("Run", "Executar");
        prompt.setAttribute("aria-label", tr("MIDI command", "Comando MIDI"));

        function toggleHelp() {
          help.hidden = !help.hidden;
          helpButton.setAttribute("aria-expanded", String(!help.hidden));
        }

        help.textContent = [
          tr("Tick = sequence position. Channels 1–16. MIDI values 0–127. Raw bytes are hexadecimal.", "Tick = posição na sequência. Canais 1–16. Valores MIDI 0–127. Bytes em hexadecimal."),
          "play | pause | stop | seek TICK | loop START END | loop off",
          "track N | track add NAME | track name NAME | track end TICK | track del | mute | solo",
          "notes | events | find TICK | page N | undo | redo",
          "note add TICK LENGTH CH KEY VELOCITY [RELEASE]",
          "note set N TICK LENGTH CH KEY VELOCITY [RELEASE] | note del N",
          "batch transpose|shift|quantize|velocity FIRST_TICK LAST_TICK VALUE [CH]",
          "batch delete FIRST_TICK LAST_TICK [CH]",
          "event add TICK STATUS [META] BYTES…",
          "event set N TICK STATUS [META] BYTES… | event before N STATUS [META] BYTES… | event del N",
          "tempo TICK BPM | timesig TICK NUMERATOR DENOMINATOR",
          tr("Examples: event add 0 C0 2A (program 42); event add 960 B0 40 7F (sustain).", "Exemplos: event add 0 C0 2A (programa 42); event add 960 B0 40 7F (sustain)."),
          tr("Select a row number to fill in its edit command. Use ↑/↓ for command history.", "Seleciona o número da linha para preencher o comando de edição. Usa ↑/↓ para o histórico."),
          tr("Audition uses the browser synthesizer. Export preserves raw MIDI events.", "A reprodução usa o sintetizador do navegador. A exportação conserva os eventos MIDI.")
        ].join("\n");

        function renderScores() {
          scores.replaceChildren();
          for (const [key, entry] of documents) {
            if (!key.startsWith("piano-")) option(scores, key, entry.title);
          }
          const piano = element("optgroup", "", scores);
          piano.label = tr("MIPS Piano · Beethoven’s Fifth", "Piano MIPS · Quinta de Beethoven");
          movements.forEach((movement, index) => option(piano, "piano-" + index, movement[1]));
          scores.value = active;
        }

        async function switchTo(key) {
          const request = ++openRequest;
          if (!documents.has(key)) {
            const [file, title] = movements[Number(key.split("-")[1])];
            report(tr("Loading score…", "A carregar a partitura…"));
            try {
              const response = await fetch(asset("../examples/" + file));
              if (!response.ok) throw new Error(tr("Could not load the score.", "Não foi possível carregar a partitura."));
              const source = await response.text();
              if (request !== openRequest) return;
              newDocument(key, title, midi.readPianoMovement(source, title));
            } catch (error) {
              if (request !== openRequest) return;
              renderScores();
              throw error;
            }
          }
          transport.pause();
          active = key;
          tick = page = 0;
          plotManuallyMoved = false;
          refresh();
          report(doc().title);
        }

        function timeLabel(value) {
          const milliseconds = Math.round(clock.secondsAt(value) * 1000);
          return Math.floor(milliseconds / 60000) + ":" + String(Math.floor(milliseconds / 1000) % 60).padStart(2, "0") +
            "." + String(milliseconds % 1000).padStart(3, "0");
        }

        function renderPosition() {
          position.textContent = timeLabel(tick) + " · " + tick + " / " + end;
          seek.max = Math.max(1, end);
          seek.disabled = !end;
          seek.setAttribute("aria-valuetext", timeLabel(tick) + " · " + tick);
          if (document.activeElement !== seek || !playing) seek.value = tick;
          playButton.textContent = playing ? tr("Pause", "Pausa") : tr("Play", "Ouvir");
          playButton.disabled = !end;
          loopButton.disabled = !end;
          loopButton.setAttribute("aria-pressed", String(!!doc().loop));
          loopButton.title = doc().loop ? doc().loop.start + "–" + doc().loop.end : "Loop";
          if (view === "notes" && !plotManuallyMoved && (tick < plottedAt || tick >= plottedAt + plotSpan())) drawRoll(tick);
        }

        function plotSpan() {
          const division = doc().song.division;
          return division & 0x8000 ? Math.round(clock.tickAt(4)) : division * 8;
        }

        function drawRoll(start) {
          const span = plotSpan();
          const from = Math.max(0, Math.floor(start / span) * span);
          plottedAt = from;
          const width = Math.max(24, Math.min(100, Math.floor((roll.clientWidth - 75) / 7.4)));
          const visible = [];
          for (const note of entries) {
            if (note.on.tick >= from + span) break;
            if (note.off.tick > from) visible.push(note);
          }
          const pitches = [...new Set(visible.map((note) => note.on.data[0]))].sort((a, b) => b - a);
          const rows = new Map(pitches.map((pitch) => [pitch, Array.from({ length: width }, (_, col) => col % Math.floor(width / 4) === 0 ? "│" : "·")]));
          for (const { on, off } of visible) {
            const row = rows.get(on.data[0]);
            const first = Math.max(0, Math.floor((on.tick - from) / span * width));
            const last = Math.min(width, Math.max(first + 1, Math.ceil((off.tick - from) / span * width)));
            for (let index = first; index < last; index++) row[index] = index === first && on.tick >= from ? "◆" : "━";
          }
          const legend = timeLabel(from) + " → " + timeLabel(from + span) + " · " + from + "–" + (from + span) + " ticks";
          roll.textContent = [legend, ...pitches.map((pitch) => noteName(pitch).padStart(4) + " " + rows.get(pitch).join(""))].join("\n");
        }
        function refresh() {
          const current = doc();
          clock = midi.createClock(current.song);
          end = midi.sequenceEnd(current.song);
          tick = Math.min(end, tick);
          if (current.loop?.end > end) current.loop = null;
          renderScores();
          tracks.replaceChildren();
          current.song.tracks.forEach((item, index) => {
            const name = midi.trackName(item).replace(/[\u0000-\u001f]/g, " ").slice(0, 60);
            const marker = (current.muted.has(index) ? " [M]" : "") + (current.solo.has(index) ? " [S]" : "");
            option(tracks, index, (index + 1) + " · " + (name || tr("Track", "Pista")) + marker);
          });
          tracks.value = current.track;
          entries = view === "notes" ? midi.sequenceNotes(track().events) : midi.sortedEvents(track().events);
          roll.hidden = view !== "notes";
          notesButton.setAttribute("aria-pressed", String(view === "notes"));
          eventsButton.setAttribute("aria-pressed", String(view === "events"));
          muteButton.setAttribute("aria-pressed", String(current.muted.has(current.track)));
          soloButton.setAttribute("aria-pressed", String(current.solo.has(current.track)));
          addButton.textContent = view === "notes" ? tr("Add note", "Adicionar nota") : tr("Add event", "Adicionar evento");
          showPage(page);
          renderPosition();
        }

        function browsePage(target) {
          plotManuallyMoved = true;
          showPage(target);
        }

        function showPage(target) {
          const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
          page = Math.max(0, Math.min(target, totalPages - 1));
          previous.disabled = page === 0;
          next.disabled = page + 1 >= totalPages;
          pageInfo.textContent = (page + 1) + " / " + totalPages + " · " + entries.length + " " +
            (view === "notes" ? tr("notes", "notas") : tr("events", "eventos"));
          const fields = view === "notes" ? ["#", "Tick", tr("Time", "Tempo"), tr("Length", "Duração"), "Ch", tr("Key", "Nota"), "Vel.", "Rel."]
            : ["#", "Tick", tr("Time", "Tempo"), tr("Type", "Tipo"), "Ch", tr("Bytes (hex)", "Bytes (hex)")];
          const head = find("thead");
          const body = find("tbody");
          head.replaceChildren();
          body.replaceChildren();
          find(".daw-list").scrollTop = 0;
          const headings = element("tr", "", head);
          fields.forEach((field) => { element("th", field, headings).scope = "col"; });
          const first = page * pageSize;
          for (let index = first; index < Math.min(first + pageSize, entries.length); index++) {
            const row = element("tr", "", body);
            const entry = entries[index];
            button(element("td", "", row), index + 1, () => editLine(index), tr("Edit", "Editar") + " " + (index + 1)).classList.add("daw-row");
            const values = view === "notes"
              ? [entry.on.tick, timeLabel(entry.on.tick), entry.off.tick - entry.on.tick, (entry.on.status & 15) + 1,
                noteName(entry.on.data[0]) + " (" + entry.on.data[0] + ")", entry.on.data[1], entry.off.data[1]]
              : [entry.tick, timeLabel(entry.tick), eventName(entry), entry.status < 0xf0 ? (entry.status & 15) + 1 : "—", eventBytes(entry, 24)];
            values.forEach((value) => element("td", value, row));
          }
          if (!entries.length) {
            const cell = element("td", tr("No entries on this track.", "Esta pista ainda está vazia."), element("tr", "", body));
            cell.colSpan = fields.length;
          }
          if (view === "notes") drawRoll(plotManuallyMoved ? entries[first]?.on.tick ?? tick : tick);
        }

        function eventBytes(event, limit = event.data.length) {
          return [hex(event.status), ...(event.status === 0xff ? [hex(event.meta)] : []),
            ...event.data.slice(0, limit).map(hex), ...(event.data.length > limit ? ["…"] : [])].join(" ");
        }

        function eventName(event) {
          if (event.status === 0xff) return ({ 1: tr("Text", "Texto"), 3: tr("Track name", "Nome da pista"),
            5: tr("Lyrics", "Letra"), 6: tr("Marker", "Marcador"), 81: "Tempo", 88: tr("Time signature", "Compasso"),
            89: tr("Key signature", "Tonalidade") })[event.meta] ?? "Meta " + hex(event.meta);
          if (event.status >= 0xf0) return "SysEx";
          const type = event.status >>> 4;
          if (type === 9 && !event.data[1]) return tr("Note off", "Fim de nota");
          return [tr("Note off", "Fim de nota"), tr("Note on", "Início de nota"), tr("Key pressure", "Pressão de tecla"),
            "CC " + event.data[0], tr("Program", "Programa"), tr("Channel pressure", "Pressão de canal"), "Pitch bend"][type - 8];
        }

        function editLine(index) {
          const entry = entries[index];
          if (view === "notes") {
            const { on, off } = entry;
            const prefix = "note set " + (index + 1) + " ";
            prefill(prefix + [on.tick, off.tick - on.tick, (on.status & 15) + 1, ...on.data, off.data[1]].join(" "), prefix.length);
          } else {
            const prefix = "event set " + (index + 1) + " ";
            prefill(prefix + entry.tick + " " + eventBytes(entry), prefix.length);
          }
        }

        function snapshot(current) {
          const { song, track, muted, solo, loop } = current;
          return { song, track, muted, solo, loop };
        }

        function changeSong(song, trackIndex = doc().track) {
          const current = doc();
          transport.pause();
          current.undo.push(snapshot(current));
          if (current.undo.length > 32) current.undo.shift();
          current.redo.length = 0;
          if (song.tracks.length < current.song.tracks.length) {
            const shift = (set) => new Set([...set].filter((index) => index !== current.track)
              .map((index) => index > current.track ? index - 1 : index));
            current.muted = shift(current.muted);
            current.solo = shift(current.solo);
          }
          if (current.track !== trackIndex) page = 0;
          current.song = song;
          current.track = trackIndex;
          refresh();
          report(tr("Edit applied.", "Alteração aplicada."));
        }

        function undo(redo) {
          const current = doc();
          const previous = (redo ? current.redo : current.undo).pop();
          if (!previous) return report(tr("No more changes.", "Sem mais alterações."));
          transport.pause();
          (redo ? current.undo : current.redo).push(snapshot(current));
          Object.assign(current, previous);
          refresh();
          report(redo ? tr("Edit restored.", "Alteração refeita.") : tr("Edit undone.", "Alteração desfeita."));
        }

        function changeTrackEvents(events) {
          const song = doc().song;
          const list = song.tracks.slice();
          list[doc().track] = { ...track(), events };
          changeSong({ ...song, tracks: list });
        }

        function setView(mode) {
          view = mode;
          page = 0;
          plotManuallyMoved = false;
          refresh();
        }

        async function togglePlayback() {
          if (playing) transport.pause();
          else await play();
        }

        async function play() {
          if (playing || !end) return;
          const { song, loop, muted, solo } = doc();
          await transport.play(song, tick, loop, muted, solo);
        }

        async function locate(at, resume = playing) {
          transport.pause();
          tick = at;
          plotManuallyMoved = false;
          findTick(at);
          renderPosition();
          if (resume) await play();
        }

        function findTick(at) {
          let low = 0;
          let high = entries.length;
          while (low < high) {
            const mid = (low + high) >>> 1;
            if ((entries[mid].on?.tick ?? entries[mid].tick) < at) low = mid + 1;
            else high = mid;
          }
          const index = Math.max(0, Math.min(low, entries.length - 1));
          showPage(Math.floor(index / pageSize));
          const row = find("tbody").children[index % pageSize];
          if (row) {
            const list = find(".daw-list");
            list.scrollTop = row.offsetTop - list.querySelector("thead").offsetHeight;
          }
        }

        async function toggleTrack(kind) {
          const resume = playing;
          transport.pause();
          const set = new Set(doc()[kind]);
          const index = doc().track;
          if (set.has(index)) set.delete(index);
          else set.add(index);
          doc()[kind] = set;
          refresh();
          if (resume) await play();
        }

        function chooseTrack(index) {
          doc().track = index;
          page = 0;
          plotManuallyMoved = false;
          refresh();
        }

        function integer(token, min, max) {
          const value = Number(token);
          if (!/^\d+$/.test(token ?? "") || !Number.isSafeInteger(value) || value < min || value > max) {
            throw new Error(tr("Expected an integer", "Indica um número inteiro") + " (" + min + "–" + max + ").");
          }
          return value;
        }

        function syntax() {
          throw new Error(tr("Invalid command. See Commands.", "Comando inválido. Consulta Comandos."));
        }

        function selectedEntry(kind, index) {
          const list = kind === view ? entries : kind === "notes" ? midi.sequenceNotes(track().events) : midi.sortedEvents(track().events);
          if (!list.length) throw new Error(tr("No entries on this track.", "Esta pista ainda está vazia."));
          return list[integer(index, 1, list.length) - 1];
        }

        function edit(kind, args) {
          const action = args.shift();
          let remove = [];
          const before = action === "before" && kind === "events" ? selectedEntry(kind, args.shift()) : null;
          if (action === "set" || action === "del") {
            const entry = selectedEntry(kind, args.shift());
            remove = kind === "notes" ? [entry.on, entry.off] : [entry];
          } else if (action !== "add" && !before) syntax();
          let added = [];
          if (action === "del") {
            if (args.length) syntax();
          } else if (kind === "notes") {
            if (args.length < 5 || args.length > 6) syntax();
            const [at, duration, channel, pitch, velocity, release = "64"] = args;
            added = midi.noteEvents(integer(at, 0, midi.MAX_TICK), integer(duration, 0, midi.MAX_TICK),
              integer(channel, 1, 16), integer(pitch, 0, 127), integer(velocity, 1, 127), integer(release, 0, 127));
            if (remove.length && (remove[1].status & 0xf0) === 0x90 && added[1].data[1] === 0) added[1].status |= 0x10;
          } else {
            if (args.length < (before ? 1 : 2)) syntax();
            const at = before ? before.tick : integer(args.shift(), 0, midi.MAX_TICK);
            const status = parseByte(args.shift());
            const meta = status === 0xff ? parseByte(args.shift()) : undefined;
            added = [midi.validateEvent({ tick: at, status, meta, data: args.map(parseByte) })];
          }
          // Keep the existing order of coincident events when editing.
          const replacements = new Map(remove.map((entry, index) => [entry, added[index]]));
          if (kind === "notes") return applyNoteChanges(replacements, action === "add" ? added : []);
          if (before) {
            const index = track().events.indexOf(before);
            return changeTrackEvents(track().events.toSpliced(index, 0, added[0]));
          }
          const events = track().events.flatMap((entry) => replacements.has(entry) ? replacements.get(entry) ?? [] : entry);
          changeTrackEvents(action === "add" ? [...events, ...added] : events);
        }
        function editNotes(args) {
          const [operation, first, last, parameter, channel = "all"] = args;
          if (args.length < 3 || args.length > 5 || (operation === "delete" && args.length > 4) ||
              (operation !== "delete" && args.length < 4)) syntax();
          const start = integer(first, 0, midi.MAX_TICK);
          const finish = integer(last, start, midi.MAX_TICK);
          const channelFilter = operation === "delete" ? parameter ?? "all" : channel;
          const ch = channelFilter === "all" ? null : integer(channelFilter, 1, 16);
          let amount = 0;
          if (operation === "transpose" || operation === "shift") {
            const magnitude = operation === "transpose" ? 127 : midi.MAX_TICK;
            if (!/^[+-]?\d+$/.test(parameter) || Math.abs(Number(parameter)) > magnitude) syntax();
            amount = Number(parameter);
          } else if (operation === "quantize") amount = integer(parameter, 1, midi.MAX_TICK);
          else if (operation === "velocity") amount = integer(parameter, 1, 127);
          else if (operation !== "delete") syntax();
          const notes = midi.sequenceNotes(track().events);
          const changes = new Map();
          let count = 0;
          for (const { on, off } of notes) {
            const noteChannel = (on.status & 15) + 1;
            if (on.tick < start || on.tick > finish || (ch !== null && noteChannel !== ch)) continue;
            count++;
            if (operation === "delete") {
              changes.set(on, null);
              changes.set(off, null);
              continue;
            }
            let tick = on.tick;
            let [pitch, velocity] = on.data;
            if (operation === "quantize") tick = Math.round(tick / amount) * amount;
            else if (operation === "shift") tick += amount;
            else if (operation === "transpose") pitch += amount;
            else velocity = amount;
            const [nextOn, nextOff] = midi.noteEvents(tick, off.tick - on.tick, noteChannel, pitch, velocity, off.data[1]);
            changes.set(on, nextOn);
            changes.set(off, { ...nextOff, status: off.status });
          }
          if (!count) return report(tr("No notes in that range.", "Não há notas nesse intervalo."));
          applyNoteChanges(changes, [], notes);
          report(count + " " + tr("notes edited.", "notas editadas."));
        }

        function applyNoteChanges(replacements, added = [], notes = midi.sequenceNotes(track().events)) {
          const expect = new Map();
          for (const { on, off } of notes) {
            const next = replacements.has(on) ? replacements.get(on) : on;
            if (next) expect.set(next, replacements.get(off) ?? off);
          }
          if (added.length) expect.set(added[0], added[1]);
          const events = track().events.flatMap((event) => replacements.has(event) ? replacements.get(event) ?? [] : event).concat(added);
          for (const { on, off } of midi.sequenceNotes(events)) {
            if (expect.get(on) === off) expect.delete(on);
          }
          if (expect.size) {
            throw new Error(tr("Overlapping notes would change their lengths. Use another channel or edit the raw events.",
              "A sobreposição alteraria a duração de notas. Usa outro canal ou edita os eventos MIDI."));
          }
          changeTrackEvents(events);
        }

        async function runCommand(line) {
          const [command, ...args] = line.trim().split(/\s+/);
          const song = doc().song;
          if (command === "help" && !args.length) { if (help.hidden) toggleHelp(); }
          else if (command === "play" && !args.length) await play();
          else if (command === "pause" && !args.length) transport.pause();
          else if (command === "stop" && !args.length) await locate(0, false);
          else if (command === "seek" && args.length === 1) await locate(integer(args[0], 0, end));
          else if (command === "loop") {
            const resume = playing;
            if (args.length === 1 && args[0] === "off") doc().loop = null;
            else if (args.length === 2 && end) {
              const start = integer(args[0], 0, end - 1);
              const finish = integer(args[1], start + 1, end);
              if (clock.secondsAt(finish) - clock.secondsAt(start) < 0.05) {
                throw new Error(tr("Minimum loop length is 50 ms.", "A repetição tem de durar pelo menos 50 ms."));
              }
              doc().loop = { start, end: finish };
            } else syntax();
            await locate(tick, resume);
          } else if ((command === "notes" || command === "events") && !args.length) setView(command);
          else if (command === "find" && args.length === 1) {
            const target = integer(args[0], 0, end);
            plotManuallyMoved = true;
            findTick(target);
            if (view === "notes") drawRoll(target);
          }
          else if (command === "page" && args.length === 1) browsePage(integer(args[0], 1, Math.max(1, Math.ceil(entries.length / pageSize))) - 1);
          else if ((command === "undo" || command === "redo") && !args.length) undo(command === "redo");
          else if ((command === "mute" || command === "solo") && !args.length) await toggleTrack(command === "mute" ? "muted" : "solo");
          else if (command === "track") {
            const [operation, ...name] = args;
            if ((operation === "add" || operation === "name") && name.length) {
              const event = midi.metaText(0, 3, name.join(" "));
              if (operation === "add") {
                changeSong({ ...song, tracks: [...song.tracks, { endTick: 0, events: [event] }] }, song.tracks.length);
              } else {
                const first = track().events.findIndex((item) => item.status === 0xff && item.meta === 3);
                const events = track().events.slice();
                if (first < 0) events.unshift(event);
                else events[first] = { ...event, tick: events[first].tick };
                changeTrackEvents(events);
              }
            } else if (operation === "end" && args.length === 2) {
              const endTick = integer(args[1], track().events.reduce((last, event) => Math.max(last, event.tick), 0), midi.MAX_TICK);
              const tracks = song.tracks.slice();
              tracks[doc().track] = { ...track(), endTick };
              changeSong({ ...song, tracks });
            } else if (operation === "del" && args.length === 1 && song.tracks.length > 1) {
              changeSong({ ...song, tracks: song.tracks.filter((_, index) => index !== doc().track) }, Math.min(doc().track, song.tracks.length - 2));
            } else if (args.length === 1) chooseTrack(integer(operation, 1, song.tracks.length) - 1);
            else syntax();
          } else if (command === "note" || command === "event") edit(command + "s", args);
          else if (command === "batch") editNotes(args);
          else if ((command === "tempo" && args.length === 2) || (command === "timesig" && args.length === 3)) {
            const at = integer(args[0], 0, midi.MAX_TICK);
            const meta = command === "tempo" ? 0x51 : 0x58;
            let data;
            if (meta === 0x51) {
              if (song.division & 0x8000) throw new Error(tr("This file uses SMPTE time.", "Este ficheiro usa tempo SMPTE."));
              const microseconds = Math.round(60e6 / Number(args[1]));
              if (!Number.isInteger(microseconds) || microseconds < 1 || microseconds > 0xffffff) syntax();
              data = [microseconds >>> 16, microseconds >>> 8 & 255, microseconds & 255];
            } else {
              const denominator = integer(args[2], 1, 128);
              if (denominator & (denominator - 1)) syntax();
              data = [integer(args[1], 1, 255), Math.log2(denominator), 24, 8];
            }
            const conductor = song.tracks[0];
            const event = { tick: at, status: 0xff, meta, data };
            const events = conductor.events.filter((item) => !(item.tick === at && item.status === 0xff && item.meta === meta));
            changeSong({ ...song, tracks: [{ ...conductor, events: [...events, event] }, ...song.tracks.slice(1)] });
          } else syntax();
        }

        function exportMidi() {
          const bytes = midi.writeMidi(doc().song);
          const url = URL.createObjectURL(new Blob([bytes], { type: "audio/midi" }));
          const link = element("a", "", root);
          link.hidden = true;
          link.href = url;
          link.download = doc().title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") + ".mid";
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 30000);
          doc().savedSong = doc().song;
          report(tr("MIDI exported.", "MIDI exportado."));
        }

        scores.addEventListener("change", () => run(() => switchTo(scores.value)));
        tracks.addEventListener("change", () => chooseTrack(Number(tracks.value)));
        seek.addEventListener("change", () => run(() => locate(Number(seek.value))));
        seek.addEventListener("blur", renderPosition);
        fileInput.addEventListener("change", () => run(async () => {
          const file = fileInput.files[0];
          fileInput.value = "";
          if (!file) return;
          const request = ++openRequest;
          if (file.size > 8 * 1024 * 1024) throw new Error(tr("The MIDI file exceeds 8 MB.", "O ficheiro MIDI excede 8 MB."));
          const song = midi.readMidi(new Uint8Array(await file.arrayBuffer()));
          if (request !== openRequest) return;
          const key = "local-" + ++importCount;
          newDocument(key, file.name.replace(/\.midi?$/i, ""), song);
          await switchTo(key);
        }));
        find("form").addEventListener("submit", (event) => {
          event.preventDefault();
          const line = prompt.value.trim();
          if (!line) return;
          if (commandHistory.at(-1) !== line) commandHistory.push(line);
          if (commandHistory.length > 100) commandHistory.shift();
          historyIndex = commandHistory.length;
          run(async () => {
            report("");
            await runCommand(line);
            if (prompt.value.trim() === line) prompt.value = "";
          });
        });
        prompt.addEventListener("keydown", (event) => {
          event.stopPropagation();
          if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
          event.preventDefault();
          historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + (event.key === "ArrowUp" ? -1 : 1)));
          prompt.value = commandHistory[historyIndex] ?? "";
        });
        root.addEventListener("keydown", (event) => {
          if (event.key === "/" && !event.target.matches("input, select")) {
            event.preventDefault();
            prompt.focus();
          }
        });
        shell.onResize(() => { if (view === "notes") drawRoll(plottedAt); });
        report(tr("Open a .mid file, choose a score or type help.", "Abre um .mid, escolhe uma partitura ou escreve help."));
        refresh();
      }

      return {
        root: shell.root,
        open() {
          shell.open();
          if (ready) return;
          root.querySelector(".daw-status").textContent = tr("Loading…", "A carregar…");
          ready = Promise.all([import(asset("./midi-sequence.js")), import(asset("./midi-transport.js"))])
            .then(([midi, audio]) => initialize(midi, audio.createTransport))
            .catch((error) => {
              root.querySelector(".daw-status").textContent = error.message;
              ready = null;
            });
        },
        close() { suspend(); shell.close(); },
        isConnected() { return false; }
      };
    }
  });
}());
