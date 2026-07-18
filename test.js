/* Logik-Tests: node test.js */

const Game = require("./game.js");
global.Game = Game;
const Bot = require("./bot.js");

let failed = 0;
function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) console.log(`  ok  ${label}`);
  else { failed++; console.error(`FAIL  ${label}\n      erwartet ${b}, erhalten ${a}`); }
}

console.log("Feedback:");
// Beispiel aus der Aufgabenstellung: Geheimcode 1234, Versuch 0246
eq(Game.feedback("1234", "0246"), ["miss", "hit", "near", "miss"], "1234 / 0246");
eq(Game.feedback("1234", "1234"), ["hit", "hit", "hit", "hit"], "Volltreffer");
eq(Game.feedback("1234", "4321"), ["near", "near", "near", "near"], "alles vertauscht");
eq(Game.feedback("1234", "5678"), ["miss", "miss", "miss", "miss"], "nichts enthalten");
// Duplikate: Geheimziffern werden nur einmal verbraucht
eq(Game.feedback("1223", "2222"), ["miss", "hit", "hit", "miss"], "Duplikate im Versuch");
eq(Game.feedback("1112", "2111"), ["near", "hit", "hit", "near"], "Duplikate im Code");
eq(Game.feedback("5678", "5555"), ["hit", "miss", "miss", "miss"], "eine 5 im Code, vier geraten");

console.log("Validierung:");
eq(Game.isValidCode("0123", false), true, "gueltig ohne Wiederholung");
eq(Game.isValidCode("0113", false), false, "Wiederholung verboten");
eq(Game.isValidCode("0113", true), true, "Wiederholung erlaubt");
eq(Game.isValidCode("12a4", true), false, "keine Buchstaben");
eq(Game.isValidCode("123", true), false, "zu kurz");

console.log("Codegenerierung:");
for (let i = 0; i < 200; i++) {
  const c1 = Game.randomCode(false);
  const c2 = Game.randomCode(true);
  if (!Game.isValidCode(c1, false) || !Game.isValidCode(c2, true)) {
    failed++; console.error("FAIL  randomCode erzeugte ungueltigen Code", c1, c2);
    break;
  }
}
console.log("  ok  200 Zufallscodes gueltig");
eq(Game.allCodes(false).length, 5040, "5040 Codes ohne Wiederholung");
eq(Game.allCodes(true).length, 10000, "10000 Codes mit Wiederholung");

console.log("Bot loest jedes Spiel (Stichprobe, alle Schwierigkeiten):");
for (const diff of ["easy", "normal", "hard"]) {
  for (const rep of [false, true]) {
    let totalTries = 0, maxTries = 0;
    const games = diff === "easy" ? 30 : 60;
    for (let i = 0; i < games; i++) {
      const secret = Game.randomCode(rep);
      const bot = Bot.create(rep, diff);
      let tries = 0;
      for (;;) {
        const g = bot ? Bot.nextGuess(bot) : null;
        tries++;
        const fb = Game.feedback(secret, g);
        if (Game.isSolved(fb)) break;
        Bot.observe(bot, g, fb);
        if (tries > 500) { failed++; console.error(`FAIL  Bot (${diff}) loest ${secret} nicht`); break; }
      }
      totalTries += tries;
      if (tries > maxTries) maxTries = tries;
    }
    console.log(`  ok  ${diff} ${rep ? "(mit Wdh.)" : "(ohne Wdh.)"}: Schnitt ${(totalTries / games).toFixed(1)}, max ${maxTries}`);
  }
}

if (failed === 0) console.log("\nAlle Tests bestanden.");
else { console.error(`\n${failed} Test(s) fehlgeschlagen.`); process.exit(1); }
