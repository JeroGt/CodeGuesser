/* CodeDuell · Bot-Gegner mit Kandidaten-Eliminierung */

const Bot = (() => {

  function create(allowRepeats, difficulty) {
    return {
      allowRepeats,
      difficulty,          // 'easy' | 'normal' | 'hard'
      candidates: Game.allCodes(allowRepeats),
      guessed: new Set(),
    };
  }

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomFresh(bot) {
    let code;
    do {
      code = Game.randomCode(bot.allowRepeats);
    } while (bot.guessed.has(code));
    return code;
  }

  /* Nächster Zug. Kandidatenliste ist durch observe() immer konsistent
     mit allem bisherigen Feedback. */
  function nextGuess(bot) {
    const c = bot.candidates.filter((code) => !bot.guessed.has(code));
    let guess;

    if (bot.difficulty === "easy") {
      // Nutzt sein Wissen nur selten: rät meist einfach irgendwas Neues.
      guess = (Math.random() < 0.25 && c.length > 0) ? pick(c) : randomFresh(bot);
    } else if (bot.difficulty === "normal") {
      // Menschliches Niveau: spielt meist konsistent, verschenkt aber Züge.
      guess = (Math.random() < 0.7 && c.length > 0) ? pick(c) : randomFresh(bot);
    } else if (bot.difficulty === "hard" && c.length > 1 && c.length <= 250) {
      // Minimax-lite: wählt den Kandidaten, der die verbleibende
      // Möglichkeitsmenge im schlimmsten Fall am stärksten schrumpft.
      let best = c[0];
      let bestWorst = Infinity;
      for (const g of c) {
        const parts = new Map();
        for (const s of c) {
          const key = Game.feedback(s, g).join(",");
          parts.set(key, (parts.get(key) || 0) + 1);
        }
        let worst = 0;
        for (const size of parts.values()) if (size > worst) worst = size;
        if (worst < bestWorst) {
          bestWorst = worst;
          best = g;
        }
      }
      guess = best;
    } else {
      guess = c.length > 0 ? pick(c) : randomFresh(bot);
    }

    bot.guessed.add(guess);
    return guess;
  }

  function observe(bot, guess, fb) {
    const key = fb.join(",");
    bot.candidates = bot.candidates.filter(
      (s) => Game.feedback(s, guess).join(",") === key
    );
  }

  return { create, nextGuess, observe };
})();

if (typeof module !== "undefined") module.exports = Bot;
