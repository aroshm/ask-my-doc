import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";

const app = express();
app.use(express.json({ limit: "50kb" }));
const client = new Anthropic();
const doc = readFileSync("product.md", "utf-8");
const system = `You are a product assistant. Answer using only the information inside <document>.
Rules:
- If the answer is not in the document, reply exactly: "I don't have that information."
- Do not guess, and do not use outside knowledge about the product.
- When you answer, quote the line from the document that supports it.

<document>
${doc}
</document>`;

const MAX_MESSAGES = 30;
const MAX_CHARS = 2000;

const cleanMessages = (input) => {
  if (
    !Array.isArray(input) ||
    input.length === 0 ||
    input.length > MAX_MESSAGES
  )
    return null;

  const clean = [];
  for (const m of input) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string") return null;
    const content = m.content.trim();
    if (!content || content.length > MAX_CHARS) return null;
    clean.push({ role: m.role, content });
  }

  if (clean[clean.length - 1].role !== "user") return null;
  return clean;
};

app.post("/api/chat", async (req, res) => {
  const messages = cleanMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ error: "Invalid message." });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  try {
    const stream = client.messages.stream({
      model: "claude-sonnet-5-5",
      max_tokens: 1500,
      system,
      messages,
    });
    stream.on("text", (t) => res.write(t));
    const final = await stream.finalMessage();
    console.log(final.stop_reason, final.usage);
  } catch (err) {
    res.write("\n[Something went wrong. Please try again.]");
    console.error(err);
  } finally {
    res.end();
  }
});

app.listen(3001, () => console.log("API on :3001"));
