"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi, I'm Notra — your intelligent learning & writing companion. What would you like to work on today?",
};

export default function NotraChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // ⭐ 新增：模型切换
  const [model, setModel] = useState<"gpt-4o-mini" | "gpt-4o" | "gpt-5.1">(
    "gpt-4o-mini"
  );

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          model, // ⭐ 发送选择的模型
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          fullText += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            const i = updated.length - 1;
            if (updated[i].role === "assistant") {
              updated[i] = { role: "assistant", content: fullText };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Something went wrong. Please check your network or API key and try again.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-sky-50 via-blue-50 to-indigo-100 text-slate-900">
      {/* 顶部栏 */}
      <header className="border-b border-white/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">

          {/* 左侧品牌 */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-md">
              <span className="text-sm font-semibold text-white">N</span>
            </div>
            <div>
              <span className="text-sm font-semibold">Notra</span>
            </div>
          </div>

          {/* ⭐ 新增：模型切换 */}
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setModel("gpt-4o-mini")}
              className={`px-3 py-1 rounded-full border ${
                model === "gpt-4o-mini"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              GPT-4o-mini
            </button>

            <button
              onClick={() => setModel("gpt-4o")}
              className={`px-3 py-1 rounded-full border ${
                model === "gpt-4o"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              GPT-4o
            </button>

            <button
              onClick={() => setModel("gpt-5.1")}
              className={`px-3 py-1 rounded-full border ${
                model === "gpt-5.1"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-600"
              }`}
            >
              GPT-5.1
            </button>
          </div>
        </div>
      </header>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white/90 text-slate-900 border"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* 输入 */}
      <div className="border-t bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-2 border rounded-full bg-white"
          >
            <input
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Ask Notra anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs"
            >
              {isSending ? "Thinking..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
