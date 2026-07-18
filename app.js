/* CodeDuell · UI und Spielablauf */

(() => {
  "use strict";

  const REVEAL_STEP = 110;   // ms Versatz zwischen Tile-Flips
  const REVEAL_DUR = 500;    // ms Dauer eines Flips

  const $ = (id) => document.getElementById(id);

  /* ---------------- Zustand ---------------- */

  let S = null;         // laufendes Spiel
  let net = null;       // Online-Verbindung: { peer, conn, code, isHost, name, allowRepeats }
  let config = {        // Setup-Auswahl
    mode: "bot",
    difficulty: "normal",
    allowRepeats: false,
    names: ["Du", "Bot"],
  };
  let secretCtx = null; // { player, onDone }
  let secretInput = "";
  let toastTimer = null;

  function newGame() {
    return {
      mode: config.mode,
      allowRepeats: config.allowRepeats,
      difficulty: config.difficulty,
      names: [...config.names],
      secrets: ["", ""],
      guesses: [[], []],     // guesses[i]: Versuche von Spieler i gegen den Gegner-Code
      solved: [false, false],
      keyHints: [{}, {}],    // Ziffernwissen je Spieler: '5' -> hit|near|miss
      turn: 0,
      lastChance: false,
      over: false,
      winner: null,          // 0 | 1 | 'draw'
      locked: false,
      input: "",
      bot: null,
      // Online-Modus
      local: 0,             // eigener Spieler-Index (0 = Gastgeber, 1 = Gast)
      pendingGuess: null,   // gesendeter Versuch, wartet auf Feedback
      localReady: false,
      remoteReady: false,
      rematchLocal: false,
      rematchRemote: false,
    };
  }

  /* ---------------- Helfer ---------------- */

  function vibrate(pattern) {
    if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (_) {} }
  }

  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    const el = $(id);
    el.classList.remove("active");
    void el.offsetWidth; // Animation neu starten
    el.classList.add("active");
  }

  function loadStats() {
    try { return JSON.parse(localStorage.getItem("codeduell-stats")) || { w: 0, l: 0, d: 0 }; }
    catch (_) { return { w: 0, l: 0, d: 0 }; }
  }

  function saveStats(stats) {
    try { localStorage.setItem("codeduell-stats", JSON.stringify(stats)); } catch (_) {}
  }

  function renderHomeStats() {
    const s = loadStats();
    const el = $("home-stats");
    if (s.w + s.l + s.d === 0) { el.hidden = true; return; }
    el.hidden = false;
    const parts = [`${s.w} ${s.w === 1 ? "Sieg" : "Siege"}`, `${s.l} Niederlagen`];
    if (s.d > 0) parts.push(`${s.d} Remis`);
    el.textContent = "Gegen den Bot: " + parts.join(" · ");
  }

  /* ---------------- Keypad ---------------- */

  function buildPad(container, onKey) {
    container.innerHTML = "";
    const keys = ["1","2","3","4","5","6","7","8","9","back","0","submit"];
    for (const k of keys) {
      const b = document.createElement("button");
      b.className = "key";
      if (k === "back") {
        b.classList.add("key-action");
        b.textContent = "⌫";
        b.setAttribute("aria-label", "Ziffer löschen");
      } else if (k === "submit") {
        b.classList.add("key-action", "key-submit");
        b.textContent = "✓";
        b.setAttribute("aria-label", "Bestätigen");
      } else {
        b.textContent = k;
        b.dataset.digit = k;
      }
      b.addEventListener("click", () => onKey(k));
      container.appendChild(b);
    }
  }

  /* ---------------- Tiles ---------------- */

  function makeTile(digit, cls) {
    const t = document.createElement("span");
    t.className = "tile" + (cls ? " " + cls : "");
    if (digit !== "") t.textContent = digit;
    return t;
  }

  function makeMiniRow(guess, fb) {
    const row = document.createElement("div");
    row.className = "mini-row";
    for (let i = 0; i < 4; i++) {
      const t = makeTile(guess[i], "mini " + ({ hit: "t-hit", near: "t-near", miss: "t-miss" })[fb[i]]);
      row.appendChild(t);
    }
    return row;
  }

  /* ---------------- Setup-Screens ---------------- */

  function openSetup(mode) {
    config.mode = mode;
    $("group-difficulty").hidden = mode !== "bot";
    $("group-names").hidden = mode !== "duel";
    $("setup-title").textContent = mode === "bot" ? "Duell gegen den Bot" : "Duell zu zweit";
    showScreen("screen-setup");
  }

  const DIFF_HINTS = {
    easy: "Der Bot rät oft einfach drauflos. Gut zum Warmwerden.",
    normal: "Der Bot spielt clever, aber nicht perfekt.",
    hard: "Der Bot kombiniert eiskalt. Viel Glück.",
  };

  function initSetup() {
    document.querySelectorAll(".seg-btn").forEach((b) => {
      b.addEventListener("click", () => {
        document.querySelectorAll(".seg-btn").forEach((x) => x.classList.remove("is-active"));
        b.classList.add("is-active");
        config.difficulty = b.dataset.diff;
        $("diff-hint").textContent = DIFF_HINTS[b.dataset.diff];
      });
    });

    $("btn-setup-next").addEventListener("click", () => {
      config.allowRepeats = $("opt-repeats").checked;
      if (config.mode === "bot") {
        config.names = ["Du", "Bot"];
        S = newGame();
        S.bot = Bot.create(S.allowRepeats, S.difficulty);
        S.secrets[1] = Game.randomCode(S.allowRepeats);
        openSecretEntry(0, () => startPlay());
      } else {
        const n1 = $("name-p1").value.trim() || "Spieler 1";
        const n2 = $("name-p2").value.trim() || "Spieler 2";
        config.names = [n1, n2];
        S = newGame();
        openSecretEntry(0, () => {
          openPass(`Gib das Handy an ${S.names[1]}`, `${S.names[1]} wählt jetzt einen geheimen Code.`, () => {
            openSecretEntry(1, () => {
              openPass(`Gib das Handy an ${S.names[0]}`, `${S.names[0]} beginnt und rät zuerst.`, () => startPlay());
            });
          });
        });
      }
    });
  }

  /* ---------------- Übergabe-Screen ---------------- */

  let passAction = null;

  function openPass(title, text, onReady) {
    $("pass-title").textContent = title;
    $("pass-text").textContent = text;
    $("btn-pass-ready").hidden = false;
    $("btn-wait-cancel").hidden = true;
    passAction = onReady;
    showScreen("screen-pass");
  }

  // Wartescreen ohne Bereit-Button, aber mit Abbrechen (Online-Modus)
  function openWait(title, text) {
    $("pass-title").textContent = title;
    $("pass-text").textContent = text;
    $("btn-pass-ready").hidden = true;
    $("btn-wait-cancel").hidden = false;
    passAction = null;
    showScreen("screen-pass");
  }

  /* ---------------- Geheimcode-Eingabe ---------------- */

  function openSecretEntry(player, onDone) {
    secretCtx = { player, onDone };
    secretInput = "";
    const isDuel = S.mode === "duel";
    $("secret-title").textContent = isDuel ? `${S.names[player]}, dein Geheimcode` : "Dein Geheimcode";
    $("secret-hint").textContent =
      S.mode === "bot" ? "Wähle 4 Ziffern. Der Bot versucht, diesen Code zu knacken."
      : `Wähle 4 Ziffern. ${S.names[1 - player]} muss diesen Code erraten.`;
    $("secret-privacy").hidden = !isDuel;
    renderSecretSlots();
    showScreen("screen-secret");
  }

  function renderSecretSlots() {
    const row = $("secret-slots");
    row.innerHTML = "";
    row.classList.add("slot-row");
    for (let i = 0; i < 4; i++) {
      const d = secretInput[i] || "";
      const t = makeTile(d, d ? "filled" : "empty");
      row.appendChild(t);
    }
    const submit = $("pad-secret").querySelector(".key-submit");
    if (submit) submit.disabled = secretInput.length !== 4;
  }

  function validCodeOrToast(code) {
    if (code.length !== 4) { toast("Gib 4 Ziffern ein"); return false; }
    if (!S.allowRepeats && new Set(code).size !== 4) {
      toast("Jede Ziffer darf nur einmal vorkommen");
      return false;
    }
    return true;
  }

  function onSecretKey(k) {
    if (k === "back") {
      secretInput = secretInput.slice(0, -1);
      renderSecretSlots();
    } else if (k === "submit") {
      if (!validCodeOrToast(secretInput)) { shakeEl($("secret-slots")); vibrate(60); return; }
      S.secrets[secretCtx.player] = secretInput;
      const done = secretCtx.onDone;
      secretCtx = null;
      done();
    } else {
      if (secretInput.length >= 4) return;
      secretInput += k;
      vibrate(8);
      renderSecretSlots();
    }
  }

  function shakeEl(el) {
    el.classList.remove("row-shake");
    void el.offsetWidth;
    el.classList.add("row-shake");
  }

  /* ---------------- Spiel-Screen ---------------- */

  // Welches Board gross angezeigt wird: im Bot-Modus immer der Mensch (0),
  // online immer der lokale Spieler, im Duell der Spieler am Zug.
  function viewPlayer() {
    if (S.mode === "bot") return 0;
    if (S.mode === "online") return S.local;
    return S.turn;
  }

  function startPlay() {
    S.input = "";
    S.locked = false;
    showScreen("screen-play");
    renderPlay();
    updateBanner();
  }

  function renderPlay() {
    $("vs-name-0").textContent = S.names[0];
    $("vs-name-1").textContent = S.names[1];
    renderVersus();
    renderBoard();
    renderStrip();
    renderPlayPad();
  }

  function renderVersus() {
    for (const p of [0, 1]) {
      const n = S.guesses[p].length;
      $(`vs-tries-${p}`).textContent = n === 1 ? "1 Versuch" : `${n} Versuche`;
      $(`vs-p${p}`).classList.toggle("is-turn", !S.over && S.turn === p);
    }
    const round = Math.max(1, S.guesses[0].length + (S.turn === 0 && !S.over ? 1 : 0));
    $("vs-round").textContent = `Runde ${round}`;
  }

  function updateBanner() {
    const b = $("turn-banner");
    b.classList.remove("thinking");
    if (S.over) { b.textContent = "Spiel beendet"; return; }
    if (S.mode === "online") {
      const opp = S.names[1 - S.local];
      if (S.turn === S.local) {
        b.textContent = S.lastChance ? "Letzte Chance!" : "Du bist dran";
      } else {
        b.textContent = S.lastChance ? `Letzter Versuch von ${opp}` : `${opp} ist dran`;
        b.classList.add("thinking");
      }
      return;
    }
    if (S.mode === "bot") {
      if (S.turn === 0) {
        b.textContent = S.lastChance ? "Letzte Chance!" : "Du bist dran";
      } else {
        b.textContent = S.lastChance ? "Der Bot hat einen letzten Versuch" : "Der Bot denkt nach";
        b.classList.add("thinking");
      }
    } else {
      b.textContent = S.lastChance
        ? `Letzte Chance, ${S.names[S.turn]}!`
        : `${S.names[S.turn]} ist dran`;
    }
  }

  function renderBoard() {
    const board = $("board");
    board.innerHTML = "";
    const p = viewPlayer();
    const list = S.guesses[p];

    if (list.length === 0 && !S.over) {
      const hint = document.createElement("p");
      hint.className = "board-hint";
      hint.textContent = S.mode === "bot"
        ? "Rate den Code des Bots: 4 Ziffern eintippen und bestätigen."
        : S.mode === "online"
        ? `Rate den Code von ${S.names[1 - p]}: 4 Ziffern eintippen und bestätigen.`
        : `${S.names[p]}, rate den Code von ${S.names[1 - p]}.`;
      board.appendChild(hint);
    }

    for (const entry of list) {
      board.appendChild(makeGuessRow(entry.guess, entry.fb));
    }
    if (!S.over && isHumanTurn() && S.turn === p) {
      board.appendChild(makeCurrentRow());
    }
    board.scrollTop = board.scrollHeight;
  }

  function makeGuessRow(guess, fb) {
    const row = document.createElement("div");
    row.className = "guess-row";
    for (let i = 0; i < 4; i++) row.appendChild(makeTile(guess[i], fb[i]));
    return row;
  }

  function makeCurrentRow() {
    const row = document.createElement("div");
    row.className = "guess-row current";
    row.id = "current-row";
    for (let i = 0; i < 4; i++) {
      const d = S.input[i] || "";
      row.appendChild(makeTile(d, d ? "filled" : "empty"));
    }
    return row;
  }

  function renderStrip() {
    const other = 1 - viewPlayer();
    $("opp-label").textContent = S.names[other];
    const last = S.guesses[other][S.guesses[other].length - 1];
    const lastEl = $("opp-last");
    lastEl.innerHTML = "";
    if (!last) {
      const none = document.createElement("span");
      none.className = "opp-none";
      none.textContent = "noch kein Versuch";
      lastEl.appendChild(none);
    } else {
      const mini = makeMiniRow(last.guess, last.fb);
      while (mini.firstChild) lastEl.appendChild(mini.firstChild);
    }
    const hist = $("opp-history");
    hist.innerHTML = "";
    for (const e of S.guesses[other]) hist.appendChild(makeMiniRow(e.guess, e.fb));
    hist.scrollTop = hist.scrollHeight;
  }

  function isHumanTurn() {
    if (S.over) return false;
    if (S.mode === "bot") return S.turn === 0;
    if (S.mode === "online") return S.turn === S.local;
    return true;
  }

  function renderPlayPad() {
    const pad = $("pad-play");
    const hints = S.keyHints[viewPlayer()];
    pad.querySelectorAll(".key").forEach((k) => {
      k.classList.remove("k-hit", "k-near", "k-miss");
      const d = k.dataset.digit;
      if (d && hints[d]) k.classList.add("k-" + hints[d]);
      k.disabled = !isHumanTurn() || S.locked;
    });
    const submit = pad.querySelector(".key-submit");
    if (submit) submit.disabled = !isHumanTurn() || S.locked || S.input.length !== 4;
  }

  function refreshCurrentRow() {
    const row = $("current-row");
    if (!row) { renderBoard(); return; }
    const tiles = row.children;
    for (let i = 0; i < 4; i++) {
      const d = S.input[i] || "";
      tiles[i].className = "tile " + (d ? "filled" : "empty");
      tiles[i].textContent = d;
    }
  }

  /* ---------------- Spielzüge ---------------- */

  function onPlayKey(k) {
    if (!isHumanTurn() || S.locked) return;
    if (k === "back") {
      S.input = S.input.slice(0, -1);
      refreshCurrentRow();
      renderPlayPad();
    } else if (k === "submit") {
      if (!validCodeOrToast(S.input)) {
        const row = $("current-row");
        if (row) shakeEl(row);
        vibrate(60);
        return;
      }
      humanGuess();
    } else {
      if (S.input.length >= 4) return;
      S.input += k;
      vibrate(8);
      refreshCurrentRow();
      renderPlayPad();
    }
  }

  function humanGuess() {
    const player = S.turn;
    const guess = S.input;

    if (S.mode === "online") {
      // Feedback kommt vom Gerät des Gegners: nur der kennt seinen Code.
      S.pendingGuess = guess;
      S.locked = true;
      renderPlayPad();
      netSend({ t: "guess", guess });
      const b = $("turn-banner");
      b.textContent = "Warte auf Antwort";
      b.classList.add("thinking");
      return;
    }

    const fb = Game.feedback(S.secrets[1 - player], guess);
    S.guesses[player].push({ guess, fb });
    updateHints(player, guess, fb);
    S.input = "";
    S.locked = true;
    renderPlayPad();
    revealRow(guess, fb, () => {
      renderPlayPad();
      afterGuess(player, fb);
    });
  }

  // Ersetzt die Eingabezeile durch eine Reihe mit Flip-Aufdeckung
  function revealRow(guess, fb, onDone) {
    const board = $("board");
    const current = $("current-row");
    const row = document.createElement("div");
    row.className = "guess-row";
    const tiles = [];
    for (let i = 0; i < 4; i++) {
      const t = makeTile(guess[i], "filled");
      row.appendChild(t);
      tiles.push(t);
    }
    if (current) board.replaceChild(row, current);
    else board.appendChild(row);
    board.scrollTop = board.scrollHeight;

    tiles.forEach((t, i) => {
      t.classList.add("reveal");
      t.style.animationDelay = `${i * REVEAL_STEP}ms`;
      setTimeout(() => {
        t.classList.remove("filled");
        t.classList.add(fb[i]);
      }, i * REVEAL_STEP + REVEAL_DUR / 2);
    });

    const total = 3 * REVEAL_STEP + REVEAL_DUR;
    setTimeout(() => {
      vibrate(fb.every((s) => s === "hit") ? [30, 60, 30, 60, 80] : 15);
      onDone();
    }, total + 120);
  }

  function updateHints(player, guess, fb) {
    const rank = { hit: 3, near: 2, miss: 1 };
    const h = S.keyHints[player];
    const perDigit = {};
    for (let i = 0; i < 4; i++) {
      (perDigit[guess[i]] = perDigit[guess[i]] || []).push(fb[i]);
    }
    for (const d of Object.keys(perDigit)) {
      const states = perDigit[d];
      const st = states.includes("hit") ? "hit" : states.includes("near") ? "near" : "miss";
      if (!h[d] || rank[st] > rank[h[d]]) h[d] = st;
    }
  }

  function afterGuess(player, fb) {
    if (Game.isSolved(fb)) S.solved[player] = true;
    renderVersus();

    // Im Duell das Ergebnis kurz stehen lassen, bevor das Board wechselt
    const advance = () => (S.mode === "duel" ? setTimeout(proceedTurn, 900) : proceedTurn());

    if (S.solved[player]) {
      if (player === 0 && !S.lastChance) {
        // Ausgleichszug: Der Nachziehende bekommt noch genau einen Versuch.
        S.lastChance = true;
        S.turn = 1;
        advance();
      } else {
        finishGame();
      }
    } else if (S.lastChance) {
      finishGame();
    } else {
      S.turn = 1 - S.turn;
      advance();
    }
  }

  function proceedTurn() {
    S.locked = false;
    renderVersus();
    updateBanner();

    if (S.mode === "bot" && S.turn === 1) {
      S.locked = true;
      renderPlayPad();
      setTimeout(botMove, 900 + Math.random() * 900);
    } else if (S.mode === "online") {
      S.input = "";
      if (S.turn !== S.local) S.locked = true;
      renderBoard();
      renderStrip();
      renderPlayPad();
    } else if (S.mode === "duel") {
      // Board des neuen Spielers anzeigen
      S.input = "";
      renderBoard();
      renderStrip();
      renderPlayPad();
    } else {
      renderBoard();
      renderStrip();
      renderPlayPad();
    }
  }

  function botMove() {
    if (!S || S.over) return;
    const guess = Bot.nextGuess(S.bot);
    const fb = Game.feedback(S.secrets[0], guess);
    Bot.observe(S.bot, guess, fb);
    S.guesses[1].push({ guess, fb });
    updateHints(1, guess, fb);
    renderStrip();
    renderVersus();
    setTimeout(() => afterGuess(1, fb), 700);
  }

  /* ---------------- Spielende ---------------- */

  function finishGame() {
    S.over = true;
    S.locked = true;
    S.winner = S.solved[0] && S.solved[1] ? "draw" : S.solved[0] ? 0 : 1;
    updateBanner();
    renderVersus();
    renderPlayPad();

    if (S.mode === "bot") {
      const stats = loadStats();
      if (S.winner === 0) stats.w++;
      else if (S.winner === 1) stats.l++;
      else stats.d++;
      saveStats(stats);
    }

    if (S.mode === "online") {
      // Eigenen Code offenlegen; der des Gegners kommt als 'reveal'-Nachricht.
      netSend({ t: "reveal", secret: S.secrets[S.local] });
    }

    setTimeout(showEndOverlay, 650);
  }

  function showEndOverlay() {
    const overlay = $("end-overlay");
    const card = overlay.querySelector(".end-card");
    const rematchBtn = $("btn-rematch");
    rematchBtn.disabled = false;
    rematchBtn.textContent = "Revanche";
    const humanWon = S.winner === 0 && S.mode === "bot";
    const duelWon = S.mode === "duel" && S.winner !== "draw";
    const onlineWon = S.mode === "online" && S.winner === S.local;
    const celebrate = humanWon || duelWon || onlineWon;

    card.classList.toggle("won", celebrate);

    let emoji, title, sub;
    const tries = (p) => S.guesses[p].length;
    if (S.winner === "draw") {
      emoji = "🤝";
      title = "Unentschieden!";
      sub = `Ihr habt beide den Code in ${tries(0)} Versuchen geknackt.`;
    } else if (S.mode === "online") {
      if (S.winner === S.local) {
        emoji = "🎉";
        title = "Gewonnen!";
        sub = `Du hast den Code in ${tries(S.local)} ${tries(S.local) === 1 ? "Versuch" : "Versuchen"} geknackt.`;
      } else {
        emoji = "😬";
        title = `${S.names[S.winner]} war schneller`;
        sub = `Dein Code wurde in ${tries(S.winner)} Versuchen geknackt. Revanche?`;
      }
    } else if (S.mode === "bot") {
      if (S.winner === 0) {
        emoji = "🎉";
        title = "Gewonnen!";
        sub = `Du hast den Code in ${tries(0)} ${tries(0) === 1 ? "Versuch" : "Versuchen"} geknackt. Der Bot brauchte länger.`;
      } else {
        emoji = "🤖";
        title = "Der Bot war schneller";
        sub = `Der Bot hat deinen Code in ${tries(1)} Versuchen geknackt. Revanche?`;
      }
    } else {
      emoji = "🏆";
      title = `${S.names[S.winner]} gewinnt!`;
      sub = `Code geknackt in ${tries(S.winner)} ${tries(S.winner) === 1 ? "Versuch" : "Versuchen"}.`;
    }
    $("end-emoji").textContent = emoji;
    $("end-title").textContent = title;
    $("end-sub").textContent = sub;

    renderEndCodes();

    overlay.hidden = false;
    if (celebrate) launchConfetti();
    renderHomeStats();
  }

  function renderEndCodes() {
    const codes = $("end-codes");
    codes.innerHTML = "";
    for (const p of [0, 1]) {
      const row = document.createElement("div");
      row.className = "end-code-row";
      const label = document.createElement("span");
      label.className = "end-code-label";
      if (S.mode === "bot") label.textContent = p === 0 ? "Dein Code" : "Code des Bots";
      else if (S.mode === "online") label.textContent = p === S.local ? "Dein Code" : `Code von ${S.names[p]}`;
      else label.textContent = `Code von ${S.names[p]}`;
      row.appendChild(label);
      const mini = document.createElement("div");
      mini.className = "mini-row";
      const own = S.mode === "online" ? p === S.local : p === 0;
      const secret = S.secrets[p] || "????";
      for (const d of secret) mini.appendChild(makeTile(d, "mini " + (own ? "t-accent" : "t-miss")));
      row.appendChild(mini);
      codes.appendChild(row);
    }
  }

  function closeOverlay() {
    $("end-overlay").hidden = true;
  }

  function rematch() {
    if (S && S.mode === "online") {
      S.rematchLocal = true;
      netSend({ t: "rematch" });
      if (S.rematchRemote) {
        startOnlineRound();
      } else {
        const btn = $("btn-rematch");
        btn.disabled = true;
        btn.textContent = `Warte auf ${S.names[1 - S.local]}`;
      }
      return;
    }
    closeOverlay();
    S = newGame();
    if (S.mode === "bot") {
      S.bot = Bot.create(S.allowRepeats, S.difficulty);
      S.secrets[1] = Game.randomCode(S.allowRepeats);
      openSecretEntry(0, () => startPlay());
    } else {
      openSecretEntry(0, () => {
        openPass(`Gib das Handy an ${S.names[1]}`, `${S.names[1]} wählt jetzt einen geheimen Code.`, () => {
          openSecretEntry(1, () => {
            openPass(`Gib das Handy an ${S.names[0]}`, `${S.names[0]} beginnt und rät zuerst.`, () => startPlay());
          });
        });
      });
    }
  }

  /* ---------------- Online-Modus (PeerJS, WebRTC) ---------------- */

  // Code-Alphabet ohne verwechselbare Zeichen (kein 0/O, 1/I/L, U/V)
  const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
  const PEER_PREFIX = "codeduell-";

  function makeInviteCode() {
    let code = "";
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    return code;
  }

  function peerAvailable() {
    if (typeof Peer === "undefined") {
      toast("Der Online-Modus braucht die gehostete Version der App");
      return false;
    }
    return true;
  }

  function netSend(msg) {
    if (net && net.conn && net.conn.open) {
      try { net.conn.send(msg); } catch (_) {}
    }
  }

  function teardownNet() {
    if (!net) return;
    const n = net;
    net = null;
    try { if (n.conn) n.conn.close(); } catch (_) {}
    try { if (n.peer) n.peer.destroy(); } catch (_) {}
  }

  function netFail(message) {
    teardownNet();
    S = null;
    closeOverlay();
    toast(message);
    showScreen("screen-home");
  }

  function bindConn(conn) {
    conn.on("data", onNetMsg);
    conn.on("close", () => { if (net) netFail("Die Verbindung wurde getrennt"); });
    conn.on("error", () => { if (net) netFail("Verbindungsfehler"); });
  }

  function hostGame(name, allowRepeats) {
    S = null;
    const code = makeInviteCode();
    const peer = new Peer(PEER_PREFIX + code, { debug: 0 });
    net = { peer, conn: null, code, isHost: true, name, allowRepeats };

    peer.on("open", () => {
      if (net && net.peer === peer) showInvite(code);
    });
    peer.on("error", (err) => {
      if (!net || net.peer !== peer) return;
      if (err.type === "unavailable-id") {
        // Seltene Code-Kollision: neuen Code versuchen
        teardownNet();
        hostGame(name, allowRepeats);
      } else if (err.type !== "peer-unavailable") {
        netFail("Keine Verbindung zum Spielserver möglich");
      }
    });
    peer.on("connection", (conn) => {
      if (!net || net.conn) { try { conn.close(); } catch (_) {} return; }
      net.conn = conn;
      bindConn(conn);
    });
  }

  function joinGame(name, code) {
    S = null;
    const peer = new Peer({ debug: 0 });
    net = { peer, conn: null, code, isHost: false, name };
    openWait("Verbinde", `Suche das Spiel mit dem Code ${code}.`);

    peer.on("open", () => {
      if (!net || net.peer !== peer) return;
      const conn = peer.connect(PEER_PREFIX + code, { reliable: true, serialization: "json" });
      net.conn = conn;
      bindConn(conn);
      conn.on("open", () => netSend({ t: "hello", name }));
    });
    peer.on("error", (err) => {
      if (!net || net.peer !== peer) return;
      if (err.type === "peer-unavailable") netFail("Kein Spiel mit diesem Code gefunden");
      else netFail("Keine Verbindung zum Spielserver möglich");
    });
  }

  function showInvite(code) {
    $("invite-code").textContent = code;
    showScreen("screen-invite");
  }

  function onNetMsg(raw) {
    const msg = raw && typeof raw === "object" ? raw : null;
    if (!msg || !net) return;
    switch (msg.t) {
      case "hello":
        if (net.isHost && !S) onHello(msg);
        break;
      case "config":
        if (!net.isHost && !S) onConfig(msg);
        break;
      case "ready":
        if (S && S.mode === "online") {
          S.remoteReady = true;
          if (S.localReady) startPlay();
        }
        break;
      case "guess":
        if (S && S.mode === "online" && typeof msg.guess === "string" && /^\d{4}$/.test(msg.guess)) onGuessMsg(msg);
        break;
      case "fb":
        if (S && S.mode === "online" && Array.isArray(msg.fb) && msg.fb.length === 4 &&
            msg.fb.every((x) => x === "hit" || x === "near" || x === "miss")) onFeedbackMsg(msg);
        break;
      case "reveal":
        if (S && S.mode === "online" && typeof msg.secret === "string" && /^\d{4}$/.test(msg.secret)) {
          S.secrets[1 - S.local] = msg.secret;
          if (!$("end-overlay").hidden) renderEndCodes();
        }
        break;
      case "rematch":
        if (S && S.mode === "online") onRematchMsg();
        break;
      case "bye":
        netFail("Dein Gegner hat das Spiel verlassen");
        break;
    }
  }

  function cleanName(value, fallback) {
    const name = String(value || "").trim().slice(0, 12);
    return name || fallback;
  }

  function onHello(msg) {
    config.mode = "online";
    config.allowRepeats = net.allowRepeats;
    config.names = [net.name, cleanName(msg.name, "Gast")];
    S = newGame();
    S.local = 0;
    netSend({ t: "config", allowRepeats: net.allowRepeats, name: net.name });
    enterOnlineSecretPhase();
  }

  function onConfig(msg) {
    config.mode = "online";
    config.allowRepeats = !!msg.allowRepeats;
    config.names = [cleanName(msg.name, "Gastgeber"), net.name];
    S = newGame();
    S.local = 1;
    enterOnlineSecretPhase();
  }

  function enterOnlineSecretPhase() {
    S.localReady = false;
    S.remoteReady = false;
    openSecretEntry(S.local, () => {
      S.localReady = true;
      netSend({ t: "ready" });
      if (S.remoteReady) startPlay();
      else openWait("Warte", `${S.names[1 - S.local]} wählt noch einen Geheimcode.`);
    });
  }

  function onGuessMsg(msg) {
    const remote = 1 - S.local;
    const fb = Game.feedback(S.secrets[S.local], msg.guess);
    netSend({ t: "fb", guess: msg.guess, fb });
    S.guesses[remote].push({ guess: msg.guess, fb });
    updateHints(remote, msg.guess, fb);
    renderStrip();
    renderVersus();
    setTimeout(() => {
      if (S && S.mode === "online" && !S.over) afterGuess(remote, fb);
    }, 600);
  }

  function onFeedbackMsg(msg) {
    if (S.pendingGuess === null || msg.guess !== S.pendingGuess) return;
    const guess = S.pendingGuess;
    S.pendingGuess = null;
    const fb = msg.fb;
    S.guesses[S.local].push({ guess, fb });
    updateHints(S.local, guess, fb);
    S.input = "";
    revealRow(guess, fb, () => {
      renderPlayPad();
      afterGuess(S.local, fb);
    });
  }

  function onRematchMsg() {
    S.rematchRemote = true;
    if (S.rematchLocal) startOnlineRound();
    else if (!$("end-overlay").hidden) toast(`${S.names[1 - S.local]} will Revanche!`);
  }

  function startOnlineRound() {
    closeOverlay();
    const btn = $("btn-rematch");
    btn.disabled = false;
    btn.textContent = "Revanche";
    const local = S.local;
    S = newGame();
    S.local = local;
    enterOnlineSecretPhase();
  }

  function leaveOnline() {
    netSend({ t: "bye" });
    teardownNet();
  }

  /* ---------------- Konfetti ---------------- */

  function launchConfetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = $("confetti");
    const ctx = canvas.getContext("2d");
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const colors = ["#e8795a", "#3fb586", "#e9c05e", "#7d9df0", "#f0eff4"];
    const parts = [];
    for (let i = 0; i < 130; i++) {
      parts.push({
        x: Math.random() * rect.width,
        y: -20 - Math.random() * rect.height * 0.4,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 6,
        vy: 130 + Math.random() * 160,
        vx: -40 + Math.random() * 80,
        rot: Math.random() * Math.PI,
        vr: -4 + Math.random() * 8,
        color: colors[i % colors.length],
      });
    }

    let last = performance.now();
    const started = last;
    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (now - started < 3200 && !$("end-overlay").hidden) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    }
    requestAnimationFrame(frame);
  }

  /* ---------------- Init ---------------- */

  function init() {
    buildPad($("pad-secret"), onSecretKey);
    buildPad($("pad-play"), onPlayKey);

    $("btn-mode-bot").addEventListener("click", () => openSetup("bot"));
    $("btn-mode-duel").addEventListener("click", () => openSetup("duel"));

    /* --- Online-Modus --- */

    const savedName = (() => {
      try { return localStorage.getItem("codeduell-name") || ""; } catch (_) { return ""; }
    })();
    if (savedName) $("online-name").value = savedName;

    $("btn-mode-online").addEventListener("click", () => showScreen("screen-online"));

    const myName = () => {
      const name = cleanName($("online-name").value, "Spieler");
      try { localStorage.setItem("codeduell-name", name); } catch (_) {}
      return name;
    };

    $("btn-host").addEventListener("click", () => {
      if (!peerAvailable()) return;
      hostGame(myName(), $("opt-repeats-online").checked);
    });

    const tryJoin = () => {
      if (!peerAvailable()) return;
      const code = $("join-code").value.trim().toUpperCase();
      if (code.length !== 5) { toast("Der Einladungscode hat 5 Zeichen"); return; }
      $("join-code").blur();
      joinGame(myName(), code);
    };
    $("btn-join").addEventListener("click", tryJoin);
    $("join-code").addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
    });
    $("join-code").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); tryJoin(); }
    });

    $("btn-share-code").addEventListener("click", async () => {
      if (!net) return;
      const url = location.origin + location.pathname + "?join=" + net.code;
      const text = `Spiel eine Runde CodeDuell mit mir! Einladungscode: ${net.code}`;
      if (navigator.share) {
        try { await navigator.share({ title: "CodeDuell", text, url }); } catch (_) {}
      } else if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          toast("Einladung kopiert");
        } catch (_) { toast("Code: " + net.code); }
      }
    });

    $("btn-invite-cancel").addEventListener("click", () => {
      teardownNet();
      showScreen("screen-home");
    });

    $("btn-wait-cancel").addEventListener("click", () => {
      leaveOnline();
      S = null;
      showScreen("screen-online");
    });

    // Einladungslink ?join=CODE direkt öffnen
    const joinParam = new URLSearchParams(location.search).get("join");
    if (joinParam && /^[0-9A-Za-z]{5}$/.test(joinParam)) {
      $("join-code").value = joinParam.toUpperCase();
      showScreen("screen-online");
    }

    $("btn-pass-ready").addEventListener("click", () => {
      const fn = passAction;
      passAction = null;
      if (fn) fn();
    });

    $("btn-rematch").addEventListener("click", rematch);
    $("btn-menu").addEventListener("click", () => {
      if (net) leaveOnline();
      closeOverlay();
      S = null;
      renderHomeStats();
      showScreen("screen-home");
    });

    document.querySelectorAll("[data-back]").forEach((b) => {
      b.addEventListener("click", () => {
        const screen = b.closest(".screen").id;
        if (screen === "screen-setup" || screen === "screen-online") {
          showScreen("screen-home");
        } else if (screen === "screen-secret") {
          secretCtx = null;
          if (net) {
            leaveOnline();
            S = null;
            showScreen("screen-online");
          } else {
            openSetup(config.mode);
          }
        }
      });
    });

    $("opp-summary").addEventListener("click", () => {
      const btn = $("opp-summary");
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      $("opp-history").hidden = open;
    });

    // Physische Tastatur (Desktop)
    document.addEventListener("keydown", (e) => {
      const onSecret = $("screen-secret").classList.contains("active");
      const onPlay = $("screen-play").classList.contains("active") && $("end-overlay").hidden;
      if (!onSecret && !onPlay) return;
      let key = null;
      if (/^\d$/.test(e.key)) key = e.key;
      else if (e.key === "Backspace") key = "back";
      else if (e.key === "Enter") key = "submit";
      if (!key) return;
      e.preventDefault();
      if (onSecret) onSecretKey(key);
      else onPlayKey(key);
    });

    renderHomeStats();
    showScreen("screen-home");
  }

  function boot() {
    initSetup();
    init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
