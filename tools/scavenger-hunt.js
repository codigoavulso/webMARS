(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-scavenger-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .shunt-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .shunt-canvas-wrap { border:1px solid #9db0c8; background:#d3d3d3; flex:1; overflow:hidden; }
      .shunt-canvas { display:block; width:100%; height:100%; background:#d3d3d3; }
      .shunt-info { border:1px solid #9db0c8; background:#fff; padding:6px; font-family:Consolas, monospace; white-space:pre-wrap; min-height:90px; }
      .shunt-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .shunt-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .shunt-footer .tool-btn { min-width:120px; }
    `;
    document.head.appendChild(style);
  }

  const GRAPHIC_WIDTH = 712;
  const GRAPHIC_HEIGHT = 652;
  const NUM_PLAYERS = 22;
  const NUM_LOCATIONS = 7;
  const START_AND_END_LOCATION = 255;

  const ADDR_AUTHENTICATION = 0xffffe000 >>> 0;
  const ADDR_PLAYER_ID = 0xffffe004 >>> 0;
  const ADDR_GAME_ON = 0xffffe008 >>> 0;
  const ADDR_NUM_TURNS = 0xffffe00c >>> 0;

  const ADDR_BASE = 0xffff8000 >>> 0;
  const MEM_PER_PLAYER = 0x400;
  const OFFSET_WHERE_AM_I_X = 0x0;
  const OFFSET_WHERE_AM_I_Y = 0x4;
  const OFFSET_ENERGY = 0x14;
  const OFFSET_PLAYER_COLOR = 0x1c;
  const OFFSET_NUMBER_LOCATIONS = 0x18;
  const OFFSET_LOC_ARRAY = 0x24;

  function toHex32(value) {
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  }

  function makeRandomLocations() {
    const list = [];
    for (let i = 0; i < NUM_LOCATIONS - 1; i += 1) {
      list.push({
        x: 40 + Math.floor(Math.random() * (GRAPHIC_WIDTH - 90)),
        y: 40 + Math.floor(Math.random() * (GRAPHIC_HEIGHT - 90))
      });
    }
    list.push({ x: START_AND_END_LOCATION, y: START_AND_END_LOCATION });
    return list;
  }

  host.register({
    id: "scavenger-hunt",
    label: "ScavengerHunt",
    create(ctx) {
      const shell = ctx.createToolWindowShell("scavenger-hunt", "This is the ScavengerHunt", 980, 880, `
        <div class="shunt-tool">
          <div class="shunt-canvas-wrap"><canvas class="shunt-canvas" data-sh="canvas" width="${GRAPHIC_WIDTH}" height="${GRAPHIC_HEIGHT}"></canvas></div>
          <div class="shunt-info" data-sh="info"></div>
          <div class="shunt-footer">
            <button class="tool-btn" data-sh="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-sh="reset" type="button">Reset</button>
            <button class="tool-btn" data-sh="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const canvas = root.querySelector("[data-sh='canvas']");
      const info = root.querySelector("[data-sh='info']");
      const connectButton = root.querySelector("[data-sh='connect']");
      const resetButton = root.querySelector("[data-sh='reset']");
      const closeButton = root.querySelector("[data-sh='close']");
      const g = canvas.getContext("2d");

      let connected = false;
      let lastSnapshot = null;
      let locations = makeRandomLocations();
      let players = [];

      function readWordSafe(address) {
        try {
          return ctx.engine.readWord(address >>> 0) | 0;
        } catch {
          return 0;
        }
      }

      function writeWordSafe(address, value) {
        try {
          ctx.engine.writeWord(address >>> 0, value | 0);
        } catch {
          // ignore invalid writes
        }
      }

      function readPlayer(playerId) {
        const base = (ADDR_BASE + playerId * MEM_PER_PLAYER) >>> 0;
        const x = readWordSafe((base + OFFSET_WHERE_AM_I_X) >>> 0);
        const y = readWordSafe((base + OFFSET_WHERE_AM_I_Y) >>> 0);
        const energy = readWordSafe((base + OFFSET_ENERGY) >>> 0);
        const colorRaw = readWordSafe((base + OFFSET_PLAYER_COLOR) >>> 0) >>> 0;
        return {
          id: playerId,
          x,
          y,
          energy,
          color: `#${(colorRaw & 0x00ffffff).toString(16).padStart(6, "0")}`
        };
      }

      function updatePlayers() {
        players = [];
        for (let i = 0; i < NUM_PLAYERS; i += 1) {
          players.push(readPlayer(i));
        }
      }

      function drawLocations() {
        locations.forEach((loc, index) => {
          g.fillStyle = "#2a6ef3";
          g.fillRect(loc.x, loc.y, 20, 20);
          g.fillStyle = "#fff";
          g.font = "12px Segoe UI";
          g.fillText(String(index), loc.x + 6, loc.y + 14);
        });
      }

      function drawPlayers() {
        players.forEach((player) => {
          const px = Math.max(0, Math.min(GRAPHIC_WIDTH - 8, player.x | 0));
          const py = Math.max(0, Math.min(GRAPHIC_HEIGHT - 8, player.y | 0));
          g.fillStyle = player.color;
          g.beginPath();
          g.arc(px + 4, py + 4, 4, 0, Math.PI * 2);
          g.fill();
        });
      }

      function render() {
        const gameOn = readWordSafe(ADDR_GAME_ON) !== 0;
        const turns = readWordSafe(ADDR_NUM_TURNS);
        g.fillStyle = "#d3d3d3";
        g.fillRect(0, 0, GRAPHIC_WIDTH, GRAPHIC_HEIGHT);

        if (!gameOn) {
          g.fillStyle = "#222";
          g.font = "18px Segoe UI";
          g.fillText("ScavengerHunt not initialized by administrator program.", 42, 200);
          info.textContent = [
            `GameOn: false (${toHex32(ADDR_GAME_ON)})`,
            `Turns remaining: ${turns}`,
            `Admin memory: auth=${toHex32(ADDR_AUTHENTICATION)}, player=${toHex32(ADDR_PLAYER_ID)}`
          ].join("\n");
          return;
        }

        drawLocations();
        drawPlayers();

        const alive = players.filter((player) => player.energy > 0).length;
        info.textContent = [
          `GameOn: true`,
          `Turns remaining: ${turns}`,
          `Players alive: ${alive}/${NUM_PLAYERS}`,
          `Player memory base: ${toHex32(ADDR_BASE)} (${MEM_PER_PLAYER} bytes each)`
        ].join("\n");
      }

      function initializeMemoryForDemo() {
        writeWordSafe(ADDR_GAME_ON, 1);
        writeWordSafe(ADDR_NUM_TURNS, 3000);

        for (let i = 0; i < NUM_PLAYERS; i += 1) {
          const base = (ADDR_BASE + i * MEM_PER_PLAYER) >>> 0;
          const startX = START_AND_END_LOCATION + (i % 4) * 3;
          const startY = START_AND_END_LOCATION + Math.floor(i / 4) * 2;
          writeWordSafe((base + OFFSET_WHERE_AM_I_X) >>> 0, startX);
          writeWordSafe((base + OFFSET_WHERE_AM_I_Y) >>> 0, startY);
          writeWordSafe((base + OFFSET_ENERGY) >>> 0, 20);
          writeWordSafe((base + OFFSET_PLAYER_COLOR) >>> 0, 0x002244ff + (i * 0x00050505));
          writeWordSafe((base + OFFSET_NUMBER_LOCATIONS) >>> 0, NUM_LOCATIONS);

          locations.forEach((loc, index) => {
            const offset = OFFSET_LOC_ARRAY + index * 8;
            writeWordSafe((base + offset) >>> 0, loc.x);
            writeWordSafe((base + offset + 4) >>> 0, loc.y);
          });
        }
      }

      function resetState() {
        locations = makeRandomLocations();
        initializeMemoryForDemo();
        updatePlayers();
        render();
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        if (connected) {
          updatePlayers();
          render();
          ctx.messagesPane.postMars("[tool] ScavengerHunt connected.");
        }
      });

      resetButton.addEventListener("click", resetState);
      closeButton.addEventListener("click", shell.close);

      resetState();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;
          updatePlayers();
          render();
        }
      };
    }
  });
})();
