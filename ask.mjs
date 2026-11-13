import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import readline from "node:readline/promises";

const client = new Anthropic(); // reads Anthropic api key
const doc = readFileSync("product.md", "utf-8");
const system = `You are a product assistant. Answer using only the information inside <document>.
Rules:
- If the answer is not in the document, reply exactly: "I don't have that information."
- Do not guess, and do not use outside knowledge about the product.
- When you answer, quote the line from the document that supports it.

<document>
${doc}
</document>`;

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
  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 500,
    system,
    messages,
  });

  const answer = response.content.find((b) => b.type === "text")?.text ?? "";
  messages.push({ role: "assistant", content: answer });
  console.log("Bot:", answer);
  console.log(`(input tokens: ${response.usage.input_tokens})`);
}

rl.close();
