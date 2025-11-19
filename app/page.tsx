"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant";
type Provider = "openai" | "openai51" | "gemini";

interface ChatMessage {
  role: Role;
  content: string;
}

/** Emoji 选择器 */
function getAssistantEmoji(content: string, index: number): string {
  if (index === 0) return "👋";

  const text = content.toLowerCase();
  if (text.includes("summary") || text.includes("总结")) return "📝";
  if (text.includes("plan") || text.includes("规划")) return "📋";
  if (text.includes("idea") || text.includes("想法")) return "💡";
  if (text.includes("example") || text.includes("案例")) return "📚";
  if (text.includes("steps") || text.includes("步骤")) return "🪜";

  return "💬";
}

/** 初始欢迎语 */
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

  /** 默认使用 GPT-4o，可切换：GPT-4o → GPT-5.1 → Gemini 3.0 */
  const [provider, setProvider] = useState<Provider>("openai");

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
          provider: provider,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated.length - 1;
            updated[last] = { role: "assistant", content: fullText };
            return updated;
          });
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
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
      {/* 顶部导航栏 */}
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

          {/* 🌟 三模型切换按钮 */}
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setProvider("openai")}
              className={`px-3 py-1 rounded-full ${
                provider === "openai"
                  ? "bg-blue-600 text-white"
                  : "bg-white/60 border border-slate-300"
              }`}
            >
              GPT-4o
            </button>

            <button
              onClick={() => setProvider("openai51")}
              className={`px-3 py-1 rounded-full ${
                provider === "openai51"
                  ? "bg-purple-600 text-white"
                  : "bg-white/60 border border-slate-300"
              }`}
            >
              GPT-5.1
            </button>

            <button
              onClick={() => setProvider("gemini")}
              className={`px-3 py-1 rounded-full ${
                provider === "gemini"
                  ? "bg-green-600 text-white"
                  : "bg-white/60 border border-slate-300"
              }`}
            >
              Gemini 3.0
            </button>
          </div>
        </div>
      </header>

      {/* 消息区 */}
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const emoji = msg.role === "assistant"
                  ? getAssistantEmoji(msg.content, index)
                  : "";

                return (
                  <div
                    key={index}
                    className={`flex w-full ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isUser
                          ? "bg-blue-600 text-white"
                          : "bg-white/90 text-slate-900 border"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="flex items-start gap-2">
                          <span className="mt-1">{emoji}</span>
                          <div className="prose prose-slate prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      )}

                      {msg.role === "assistant" && msg.content && (
                        <button
                          className="mt-2 text-xs text-blue-500 hover:underline"
                          onClick={() =>
                            navigator.clipboard.writeText(msg.content)
                          }
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

        {/* 底部输入栏 */}
        <div className="border-t border-white/60 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
            <p className="mb-2 text-center text-[11px] text-slate-400">
              Notra 不会存储你的私人对话，请放心使用。
            </p>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
                placeholder="Ask Notra anything about your learning, essays, or ideas..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />

              <button
                type="submit"
                disabled={!input.trim() || isSending}
                className={`rounded-full px-4 py-1.5 text-xs font-medium text-white transition ${
                  isSending || !input.trim()
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500"
                }`}
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