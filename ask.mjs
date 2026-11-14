import readline from "node:readline/promises";
import { reply } from "./bot.mjs";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const messages = [];

while (true) {
  const q = await rl.question("You: ");
  if (q === "exit") break;
  if (!q.trim()) continue;

  messages.push({ role: "user", content: q });
  const answer = await reply(messages);
  console.log("Bot:", answer);
}

rl.close();
