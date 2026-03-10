(function () {
  "use strict";

  const body = document.body;
  const canvas = document.getElementById("wireframe-canvas");
  const typewriterLines = document.getElementById("typewriter-lines");
  const typingCursor = document.getElementById("typing-cursor");
  const unlockPanel = document.getElementById("unlock-panel");
  const commandForm = document.getElementById("command-form");
  const commandInput = document.getElementById("command-input");
  const commandHint = document.getElementById("command-hint");
  const accessResult = document.getElementById("access-result");
  const qrMatrix = document.getElementById("qr-matrix");
  const authFlash = document.getElementById("auth-flash");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const introLines = [
    {
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Initializing InviteVerse Engine... " },
        { text: "[OK]", className: "term-ok" }
      ]
    },
    {
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Loading Aesthetic Assets... " },
        { text: "[OK]", className: "term-ok" }
      ]
    },
    {
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Compiling Interaction Grammar... " },
        { text: "[OK]", className: "term-ok" }
      ]
    },
    {
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "邀请函生成完毕。" }
      ]
    },
    {
      kind: "quote",
      segments: [
        { text: "『为你生命中的每个重要时刻，生成声画并茂、可交互的动态邀请函。』" }
      ]
    },
    {
      kind: "invite",
      segments: [
        { text: "2026年3月15日，InviteVerse 产品首发路演，准时接入。" }
      ]
    },
    {
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Venue: Hackathon Final Demo Stage // Judges Ready" }
      ]
    },
    {
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Command Required: JOIN" }
      ]
    }
  ];

  let isUnlocking = false;
  let frameHandle = 0;
  let flashTimer = null;
  let ctx = null;
  let viewport = { width: 0, height: 0, dpr: 1 };

  const lattice = createLattice();

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function containsCjk(text) {
    return /[\u3400-\u9fff\uf900-\ufaff]/.test(text);
  }

  function createLine(line) {
    const element = document.createElement("div");
    element.className = "term-line is-" + line.kind;

    if (line.segments.some(function (segment) { return containsCjk(segment.text); })) {
      element.classList.add("has-cjk");
    }

    typewriterLines.appendChild(element);
    return element;
  }

  async function typeSegments(line, speed) {
    const lineElement = createLine(line);

    for (const segment of line.segments) {
      const span = document.createElement("span");
      if (segment.className) {
        span.className = segment.className;
      }
      lineElement.appendChild(span);

      for (const character of segment.text) {
        span.textContent += character;
        scrollTerminal();
        await sleep(speed);
      }
    }

    return lineElement;
  }

  async function typeLine(line) {
    const speed = reduceMotion.matches ? 4 : getLineSpeed(line.kind);
    await typeSegments(line, speed);
    await sleep(reduceMotion.matches ? 20 : 120);
  }

  function getLineSpeed(kind) {
    if (kind === "quote") return 28;
    if (kind === "invite") return 26;
    return 18;
  }

  function scrollTerminal() {
    if (!typewriterLines) return;
    typewriterLines.scrollIntoView({ block: "end" });
  }

  async function playIntro() {
    for (const line of introLines) {
      await typeLine(line);
    }

    if (typingCursor) {
      typingCursor.style.display = "none";
    }

    unlockPanel.classList.add("is-ready");
    commandInput.disabled = false;
    commandHint.textContent = "输入 JOIN 并按回车，即可授权进入路演邀请码页面。";
    commandInput.focus();
  }

  function normalizeCommand(value) {
    return value.replace(/\s+/g, "").toUpperCase();
  }

  async function appendErrorLine() {
    await typeLine({
      kind: "error",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Unknown command. Expected JOIN." }
      ]
    });
  }

  async function appendSuccessLine() {
    await typeLine({
      kind: "system",
      segments: [
        { text: "> ", className: "term-prefix" },
        { text: "Authorization granted. Rendering access matrix... " },
        { text: "[OK]", className: "term-ok" }
      ]
    });
  }

  function flashScreen() {
    if (!authFlash) return;
    body.classList.remove("is-flashing");
    authFlash.classList.remove("is-active");
    clearTimeout(flashTimer);
    void authFlash.offsetWidth;
    body.classList.add("is-flashing");
    authFlash.classList.add("is-active");
    flashTimer = setTimeout(function () {
      body.classList.remove("is-flashing");
    }, 980);
  }

  function createLattice() {
    const coordinates = [-1.5, -0.5, 0.5, 1.5];
    const points = [];
    const edges = [];
    const lookup = new Map();

    coordinates.forEach(function (x, xi) {
      coordinates.forEach(function (y, yi) {
        coordinates.forEach(function (z, zi) {
          const index = points.length;
          points.push({ x: x, y: y, z: z });
          lookup.set([xi, yi, zi].join(":"), index);
        });
      });
    });

    coordinates.forEach(function (_, xi) {
      coordinates.forEach(function (_, yi) {
        coordinates.forEach(function (_, zi) {
          const current = lookup.get([xi, yi, zi].join(":"));
          if (xi + 1 < coordinates.length) {
            edges.push([current, lookup.get([xi + 1, yi, zi].join(":"))]);
          }
          if (yi + 1 < coordinates.length) {
            edges.push([current, lookup.get([xi, yi + 1, zi].join(":"))]);
          }
          if (zi + 1 < coordinates.length) {
            edges.push([current, lookup.get([xi, yi, zi + 1].join(":"))]);
          }
        });
      });
    });

    return { points: points, edges: edges };
  }

  function resizeCanvas() {
    if (!canvas) return;
    viewport.dpr = window.devicePixelRatio || 1;
    viewport.width = window.innerWidth;
    viewport.height = window.innerHeight;
    canvas.width = Math.floor(viewport.width * viewport.dpr);
    canvas.height = Math.floor(viewport.height * viewport.dpr);
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";
    ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(viewport.dpr, 0, 0, viewport.dpr, 0, 0);
    }
  }

  function rotatePoint(point, angleX, angleY) {
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);

    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;
    const y1 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;

    return { x: x1, y: y1, z: z2 };
  }

  function projectPoint(point, scale) {
    const depth = point.z + 6;
    const perspective = scale / depth;
    return {
      x: viewport.width * 0.5 + point.x * perspective,
      y: viewport.height * 0.48 + point.y * perspective,
      depth: depth
    };
  }

  function drawBackgroundFrame(time) {
    if (!ctx) return;

    ctx.clearRect(0, 0, viewport.width, viewport.height);

    const angleY = time * 0.00032;
    const angleX = time * 0.00019;
    const scale = Math.min(viewport.width, viewport.height) * 1.15;
    const projected = lattice.points.map(function (point) {
      return projectPoint(rotatePoint(point, angleX, angleY), scale);
    });

    ctx.lineWidth = 1;
    lattice.edges.forEach(function (edge) {
      const a = projected[edge[0]];
      const b = projected[edge[1]];
      const alpha = Math.max(0.05, 0.32 - ((a.depth + b.depth) * 0.02));
      ctx.strokeStyle = "rgba(142, 231, 255, " + alpha.toFixed(3) + ")";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });

    projected.forEach(function (point) {
      const size = Math.max(1.1, 4.4 - point.depth * 0.32);
      ctx.fillStyle = "rgba(125, 255, 173, 0.16)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    });

    if (!reduceMotion.matches) {
      frameHandle = window.requestAnimationFrame(drawBackgroundFrame);
    }
  }

  function qrSeedFromText(text) {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function isFinderCell(x, y, cornerX, cornerY) {
    const localX = x - cornerX;
    const localY = y - cornerY;
    if (localX < 0 || localY < 0 || localX > 6 || localY > 6) {
      return false;
    }

    const isOuter = localX === 0 || localX === 6 || localY === 0 || localY === 6;
    const isInner = localX >= 2 && localX <= 4 && localY >= 2 && localY <= 4;
    return isOuter || isInner;
  }

  function buildQrMatrix(text) {
    if (!qrMatrix) return;

    const size = 25;
    const seed = qrSeedFromText(text);
    const fragment = document.createDocumentFragment();
    qrMatrix.innerHTML = "";
    qrMatrix.style.setProperty("--qr-size", String(size));

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const cell = document.createElement("span");
        cell.className = "qr-cell";

        const inFinder =
          isFinderCell(x, y, 0, 0) ||
          isFinderCell(x, y, size - 7, 0) ||
          isFinderCell(x, y, 0, size - 7);

        const quietZone = x === 7 || y === 7;
        let isOn = false;

        if (inFinder) {
          isOn = true;
        } else if (!quietZone) {
          const value = ((x * 17 + y * 29 + seed) ^ ((x + seed) * (y + 11))) >>> 0;
          isOn = (value % 3 === 0) || ((x + y + seed) % 11 === 0);
        }

        if (isOn) {
          cell.classList.add("is-on");
        }

        fragment.appendChild(cell);
      }
    }

    qrMatrix.appendChild(fragment);
  }

  async function unlockAccess() {
    if (isUnlocking) return;
    isUnlocking = true;
    commandInput.disabled = true;
    commandHint.textContent = "授权通过，正在生成邀请码矩阵。";
    await appendSuccessLine();
    flashScreen();
    buildQrMatrix("IV-LAUNCH-0315");
    accessResult.classList.add("is-visible");
    commandHint.textContent = "授权完成。邀请码矩阵已生成，可用于现场展示。";
  }

  function handleCommandSubmit(event) {
    event.preventDefault();
    const command = normalizeCommand(commandInput.value || "");

    if (command !== "JOIN") {
      commandForm.classList.remove("is-error");
      void commandForm.offsetWidth;
      commandForm.classList.add("is-error");
      commandHint.textContent = "命令无效。请输入 JOIN 并按回车。";
      appendErrorLine();
      return;
    }

    commandForm.classList.remove("is-error");
    unlockAccess();
  }

  function bindEvents() {
    window.addEventListener("resize", resizeCanvas);

    commandForm.addEventListener("submit", handleCommandSubmit);
    commandInput.addEventListener("input", function () {
      commandInput.value = commandInput.value.toUpperCase().replace(/[^A-Z]/g, "");
    });

    reduceMotion.addEventListener("change", function () {
      if (!reduceMotion.matches && !frameHandle) {
        frameHandle = window.requestAnimationFrame(drawBackgroundFrame);
      }
    });
  }

  async function start() {
    body.classList.add("is-mounted");
    resizeCanvas();
    if (reduceMotion.matches) {
      drawBackgroundFrame(0);
    } else {
      frameHandle = window.requestAnimationFrame(drawBackgroundFrame);
    }
    await playIntro();
  }

  bindEvents();
  start();
})();
