/* CodeDuell · Kernlogik (rein, ohne DOM) */

const Game = (() => {

  function randomCode(allowRepeats) {
    if (allowRepeats) {
      let code = "";
      for (let i = 0; i < 4; i++) code += Math.floor(Math.random() * 10);
      return code;
    }
    const pool = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
    let code = "";
    for (let i = 0; i < 4; i++) {
      const j = Math.floor(Math.random() * pool.length);
      code += pool.splice(j, 1)[0];
    }
    return code;
  }

  function isValidCode(code, allowRepeats) {
    if (!/^\d{4}$/.test(code)) return false;
    if (!allowRepeats && new Set(code).size !== 4) return false;
    return true;
  }

  /* Wordle-Feedback: 'hit' = richtige Stelle, 'near' = enthalten, 'miss' = nicht im Code.
     Duplikate wie bei Wordle: jede Geheimziffer wird höchstens einmal verbraucht. */
  function feedback(secret, guess) {
    const result = ["miss", "miss", "miss", "miss"];
    const rest = [];
    for (let i = 0; i < 4; i++) {
      if (guess[i] === secret[i]) result[i] = "hit";
      else rest.push(secret[i]);
    }
    for (let i = 0; i < 4; i++) {
      if (result[i] === "hit") continue;
      const idx = rest.indexOf(guess[i]);
      if (idx !== -1) {
        result[i] = "near";
        rest.splice(idx, 1);
      }
    }
    return result;
  }

  function isSolved(fb) {
    return fb.every((s) => s === "hit");
  }

  function allCodes(allowRepeats) {
    const codes = [];
    for (let n = 0; n < 10000; n++) {
      const code = String(n).padStart(4, "0");
      if (!allowRepeats && new Set(code).size !== 4) continue;
      codes.push(code);
    }
    return codes;
  }

  return { randomCode, isValidCode, feedback, isSolved, allCodes };
})();

if (typeof module !== "undefined") module.exports = Game;
