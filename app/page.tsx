"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

function getAssistantEmoji(content: string, index: number): string {
  if (index === 0) return "👋";

  const t = content.toLowerCase();
  if (t.includes("summary") || t.includes("总结")) return "📝";
  if (t.includes("idea") || t.includes("brainstorm")) return "💡";
  if (t.includes("plan") || t.includes("大纲")) return "📋";
  if (t.includes("steps") || t.includes("步骤")) return "🪜";

  return "💬";
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Hi, I'm Notra — your intelligent learning & writing companion. What would you like to work on today?",
};

export default function NotraChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ⭐ 模型切换： gpt-4o-mini / gpt-4o / gpt-5.1
  const [model, setModel] = useState("gpt-4o-mini");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];

    setMessages(next);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          model, // ⭐ 传给后端
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request error");
      }

      // 插入空助手消息
      setMessages((p) => [...p, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: dr } = await reader.read();
        done = dr;

        if (value) {
          const chunk = decoder.decode(value);
          fullText += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated.length - 1;
            updated[last] = { role: "assistant", content: fullText };
            return updated;
          });
        }
      }
    } catch (e) {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: "⚠️ Something went wrong. Please check your API key.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-md">
              <span className="text-sm font-semibold text-white">N</span>
            </div>

            <div className="flex flex-col">
              <span className="text-sm font-semibold">Notra</span>
              <span className="text-xs text-slate-500">
                Your Intelligent Learning & Writing Companion
              </span>
            </div>
          </div>

          {/* ⭐ 模型选择 */}
          <div className="flex gap-2 text-xs">
            {["gpt-4o-mini", "gpt-4o", "gpt-5.1"].map((m) => (
              <button
                key={m}
                className={`px-3 py-1.5 rounded-lg shadow-sm ${
                  model === m
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
                onClick={() => setModel(m)}
              >
                {m === "gpt-4o-mini" && "GPT-4o-mini"}
                {m === "gpt-4o" && "GPT-4o"}
                {m === "gpt-5.1" && "GPT-5.1"}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Chat */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-5xl flex-col px-4 py-4">
            <div className="space-y-4">
              {messages.map((msg, i) => {
                const isA = msg.role === "assistant";
                const emoji = isA ? getAssistantEmoji(msg.content, i) : "";

                return (
                  <div
                    key={i}
                    className={`w-full flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        msg.role === "user"
                          ? "bg-blue-600 text-white rounded-br-sm"
                          : "bg-white/90 text-slate-900 border border-white/70 rounded-bl-sm"
                      }`}
                    >
                      {isA ? (
                        <div className="flex gap-2">
                          <span>{emoji}</span>
                          <div className="prose prose-slate prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      )}

                      {isA && msg.content && (
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="mt-2 text-xs text-blue-500 hover:underline"
                        >
                          Copy
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        {/* 输入栏 */}
        <div className="border-t bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <p className="mb-2 text-center text-[11px] text-slate-400">
              Notra 不会存储你的私人对话，请放心使用。
            </p>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-full border px-3 py-2 bg-white/90">
              <input
                className="flex-1 bg-transparent text-sm focus:outline-none"
                placeholder="Ask Notra anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className="rounded-full px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300"
              >
                {isSending ? "Thinking..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
