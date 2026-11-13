import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

function App() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Keep the newest text in view as it streams in.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, error]);

  // Send `history` (which must end with a user message) and stream the reply.
  const run = async (history: Msg[]) => {
    setMessages([...history, { role: "assistant", content: "" }]);
    setError(false);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("Request failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg, i) =>
            i === m.length - 1 ? { ...msg, content: msg.content + chunk } : msg,
          ),
        );
      }
    } catch {
      // Drop the unfinished bot message so the history ends on the user's
      // question again. That lets Retry send the same history.
      setMessages(history);
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    if (!input.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: input }];
    setInput("");
    run(next);
  };

  const retry = () => run(messages);

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold">Ask My Docs</h1>
        <p className="text-sm text-slate-400">
          Answers come only from the product document.
        </p>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="m-auto text-sm text-slate-500">
            Ask a question to get started.
          </p>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          const isTyping = !isUser && busy && msg.content === "";
          const isRefusal = msg.content.startsWith("I don't have that information");
          return (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                isUser
                  ? "self-end bg-indigo-600 text-white"
                  : isRefusal
                    ? "self-start border border-amber-500/40 bg-amber-500/10 text-amber-200"
                    : "self-start border border-slate-700 bg-slate-800"
              }`}
            >
              {isTyping ? (
                <span className="flex gap-1 py-1" aria-label="Bot is typing">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                </span>
              ) : (
                msg.content
              )}
            </div>
          );
        })}

        {error && (
          <div className="flex items-center gap-3 self-start rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            <span>Something went wrong. Please try again.</span>
            <button
              type="button"
              onClick={retry}
              disabled={busy}
              className="rounded-lg bg-red-500/20 px-3 py-1 font-medium hover:bg-red-500/30 disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        className="flex gap-2 border-t border-slate-700 bg-slate-800 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400 disabled:opacity-60"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask about the product"
        />
        <button
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default App;
