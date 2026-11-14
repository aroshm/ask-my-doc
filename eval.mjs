import { readFileSync } from "node:fs";
import { reply } from "./bot.mjs";

const tests = JSON.parse(readFileSync("tests.json", "utf-8"));
for (const t of tests) {
  const answer = await reply([
    ...(t.history ?? []),
    { role: "user", content: t.question },
  ]);

  console.log(
    `[${t.type}] ${t.question}\n-> ${answer}\n expected: ${t.expected}\n`,
  );
}
