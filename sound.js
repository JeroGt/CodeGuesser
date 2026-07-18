/* CodeDuell · Sound-Engine (Web Audio, keine Samples)
   Klangdesign: warm und kurz. Jeder Ton ist Triangle + leiser Sub-Sinus
   eine Oktave tiefer, mit exponentieller Hüllkurve und Lowpass gegen Schärfe.
   Aufdeck-Töne folgen einem C-Dur-Arpeggio: eine komplett richtige Reihe
   klingt dadurch automatisch als aufsteigender Akkord. */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let enabled = true;
  try { enabled = localStorage.getItem("codeduell-sound") !== "off"; } catch (_) {}

  function ensure() {
    if (!enabled) return false;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.5;
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = "lowpass";
        lowpass.frequency.value = 4800;
        lowpass.Q.value = 0.4;
        master.connect(lowpass);
        lowpass.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume();
      return ctx.state !== "closed";
    } catch (_) { return false; }
  }

  /* Ein Ton: { freq, at, dur, vol, type, slide, attack } */
  function tone(o) {
    if (!ensure()) return;
    try {
      const t0 = ctx.currentTime + (o.at || 0);
      const dur = o.dur || 0.15;
      const vol = o.vol || 0.12;
      const osc = ctx.createOscillator();
      osc.type = o.type || "sine";
      osc.frequency.setValueAtTime(o.freq, t0);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.008));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch (_) {}
  }

  /* Warme Doppel-Schicht: Triangle + Sub-Sinus */
  function note(freq, at, dur, vol) {
    tone({ freq, at, dur, vol, type: "triangle" });
    tone({ freq: freq / 2, at, dur: dur * 1.15, vol: vol * 0.35, type: "sine" });
  }

  // C-Dur-Arpeggio C5 E5 G5 C6 für die vier Tile-Positionen
  const ARP = [523.25, 659.25, 783.99, 1046.5];

  return {
    isOn: () => enabled,
    setOn(v) {
      enabled = !!v;
      try { localStorage.setItem("codeduell-sound", enabled ? "on" : "off"); } catch (_) {}
      if (enabled) ensure();
    },

    /* Ziffer getippt: kurzer weicher Tick, leicht variierend */
    tap() {
      tone({ freq: 620 + Math.random() * 70, slide: 470, dur: 0.045, vol: 0.05 });
    },

    /* Ziffer gelöscht: gleicher Tick, nach unten */
    erase() {
      tone({ freq: 420, slide: 320, dur: 0.05, vol: 0.05 });
    },

    /* Ungültige Eingabe: zwei dumpfe, tiefe Pulse ("uh-uh") */
    invalid() {
      tone({ freq: 185, slide: 165, dur: 0.09, vol: 0.08, type: "triangle" });
      tone({ freq: 165, slide: 145, at: 0.11, dur: 0.12, vol: 0.08, type: "triangle" });
    },

    /* Tile-Aufdeckung: Treffer = Akkordton, nah dran = Quarte tiefer, daneben = Tock */
    tile(i, status) {
      if (status === "hit") note(ARP[i], 0, 0.22, 0.1);
      else if (status === "near") note(ARP[i] * 0.749, 0, 0.18, 0.07);
      else tone({ freq: 175, slide: 140, dur: 0.07, vol: 0.045 });
    },

    /* Sieg: aufsteigendes Arpeggio mit leisem Schimmer obendrauf */
    win() {
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => note(f, i * 0.09, 0.5, 0.11));
      tone({ freq: 2093, at: 0.36, dur: 0.8, vol: 0.025, attack: 0.15 });
    },

    /* Niederlage: sanfte fallende kleine Terz, kein Trauermarsch */
    lose() {
      note(392, 0, 0.3, 0.08);
      note(311.13, 0.24, 0.55, 0.07);
    },

    /* Unentschieden: zweimal derselbe neutrale Ton */
    draw() {
      note(523.25, 0, 0.22, 0.08);
      note(523.25, 0.2, 0.4, 0.07);
    },

    /* Gegner hat gezogen (Bot/Online): dezentes Zwei-Ton-Signal */
    notify() {
      tone({ freq: 587.33, dur: 0.07, vol: 0.055 });
      tone({ freq: 783.99, at: 0.075, dur: 0.11, vol: 0.055 });
    },

    /* Online-Verbindung steht: freundliches Auf-Signal */
    connect() {
      note(659.25, 0, 0.14, 0.08);
      note(880, 0.12, 0.28, 0.08);
    },
  };
})();

if (typeof module !== "undefined") module.exports = Sound;
