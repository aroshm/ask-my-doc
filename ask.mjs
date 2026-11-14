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
- For any price or stock question, always call get_price. If it finds nothing, say so.



<document>
${doc}
</document>`;

const products = {
  "pro-13": { name: "Pro 13", price: 1299, stock: 8 },
  "air-13": { name: "Air 13", price: 999, stock: 0 },
};

const tools = [
  {
    name: "get_price",
    description:
      "Get the current price and stock for a product by id. Use this for any price or availability question.",
    input_schema: {
      type: "object",
      properties: {
        product_id: {
          type: "string",
          description: "Product id, for example pro-13",
        },
      },
      required: ["product_id"],
    },
  },
];

const runTool = (name, input) => {
  if (name === "get_price") {
    // console.log(`[tool] ${name}`, input);
    const p = products[input.product_id];
    return p ? JSON.stringify(p) : "No product with that ID.";
  }
  return "Unknown tool";
};

const reply = async (messages) => {
  for (let i = 0; i < 5; i++) {
    const response = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 500,
      system,
      tools,
      messages,
    });
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return response.content.find((b) => b.type === "text")?.text ?? "";
    }

    const results = response.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({
        type: "tool_result",
        tool_use_id: b.id,
        content: runTool(b.name, b.input),
      }));
    messages.push({ role: "user", content: results });
  }
  throw new Error("Tool loop did not finish");
};

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
