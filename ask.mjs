import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const client = new Anthropic(); // reads Anthropic api key
const doc = readFileSync("product.md", "utf-8");
const question = process.argv[2] ?? "What does it cost?";
const system = `You are a product assistant. Answer using only the information inside <document>.
Rules:
- If the answer is not in the document, reply exactly: "I don't have that information."
- Do not guess, and do not use outside knowledge about the product.
- When you answer, quote the line from the document that supports it.

<document>
${doc}
</document>`;

const response = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 500,
  system: system,
  messages: [{ role: "user", content: question }],
});

const text = response.content.find((b) => b.type === "text")?.text ?? "";
console.log(text);
console.log(response.stop_reason, response.usage);
