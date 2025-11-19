"use client";

import React, { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Role = "user" | "assistant";

interface ChatMessage {
  role: Role;
  content: string;
}

/**
 * 根据助手回复内容，挑一个合适的 emoji
 */
function getAssistantEmoji(content: string, index: number): string {
  // 第一条欢迎语，只要一个 👋
  if (index === 0) return "👋";

  const text = content.toLowerCase();

  if (text.includes("summary") || text.includes("summarize") || text.includes("总结")) {
    return "📝";
  }
  if (text.includes("plan") || text.includes("outline") || text.includes("大纲") || text.includes("规划")) {
    return "📋";
  }
  if (text.includes("idea") || text.includes("brainstorm") || text.includes("想法") || text.includes("creative")) {
    return "💡";
  }
  if (text.includes("example") || text.includes("案例") || text.includes("例子")) {
    return "📚";
  }
  if (text.includes("steps") || text.includes("步骤") || text.includes("how to")) {
    return "🪜";
  }

  return "💬";
}

const INITIAL_ASSISTANT_MESSAGE: ChatMessage = {
  role: "assistant",
  // 注意：这里不带任何 emoji，由 getAssistantEmoji 统一加 👋
  content:
    "Hi, I'm Notra — your intelligent learning & writing companion. What would you like to work on today?",
};

export default function NotraChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    INITIAL_ASSISTANT_MESSAGE,
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 新增：模型提供方切换（OpenAI / Gemini）
  const [provider, setProvider] = useState<"openai" | "gemini">("openai");

  // 每次消息变化时，滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const nextMessages = [...messages, userMessage];

    // 先更新界面，再发请求
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          provider, // ✅ 把当前选择的模型一起传给后端
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      // 先插入一个空的 assistant 消息，用来实时填充
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: !done });
          fullText += chunk;

          // 实时更新“最后一条”助手消息
          setMessages((prev) => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (lastIndex >= 0 && updated[lastIndex].role === "assistant") {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: fullText,
              };
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error(error);
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
      {/* 顶部导航 / 品牌区 */}
      <header className="border-b border-white/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* 左上角 Logo 图标 */}
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-400 shadow-md">
              <span className="text-sm font-semibold text-white">N</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                Notra
              </span>
              <span className="text-xs text-slate-500">
                Your Intelligent Learning &amp; Writing Companion
              </span>
            </div>
          </div>

          {/* 右侧：版权 + 模型切换 */}
          <div className="flex items-center gap-3">
            <div className="hidden text-xs text-slate-400 sm:block">
              © 2025 Notra
            </div>

            {/* 模型切换按钮 */}
            <div className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 shadow-sm">
              <button
                type="button"
                onClick={() => setProvider("openai")}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  provider === "openai"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                GPT-4o
              </button>

              <button
                type="button"
                onClick={() => setProvider("gemini")}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  provider === "gemini"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Gemini 3.0
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 中间：消息区 + 底部输入区（输入区固定在底部） */}
      <div className="flex flex-1 flex-col">
        {/* 消息滚动区，占据除底部输入框以外的所有空间 */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
            <div className="space-y-4">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                const isAssistant = msg.role === "assistant";
                const emoji = isAssistant
                  ? getAssistantEmoji(msg.content, index)
                  : "";

                return (
                  <div
                    key={index}
                    className={`w-full flex ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`relative max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isUser
                          ? "bg-blue-600 text-white"
                          : "bg-white/90 text-slate-900 border border-white/70"
                      }`}
                    >
                      {isAssistant ? (
                        <div className="flex items-start gap-2">
                          {/* 每条助手消息左侧的 emoji */}
                          <span className="mt-[2px] select-none">
                            {emoji}
                          </span>
                          {/* Markdown 内容 */}
                          <div className="prose prose-slate prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        // 用户消息就不加 emoji，保持干净的蓝色气泡
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>
                      )}

                      {/* Copy 按钮（只给助手消息） */}
                      {isAssistant && msg.content && (
                        <button
                          type="button"
                          onClick={() =>
                            navigator.clipboard.writeText(msg.content)
                          }
                          className="mt-2 text-xs text-blue-500 hover:text-blue-600 hover:underline"
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

        {/* 底部输入栏：始终贴在页面最底部 */}
        <div className="border-t border-white/60 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
            {/* 提示语 */}
            <p className="mb-2 text-center text-[11px] text-slate-400">
              Notra 不会存储你的私人对话，请放心使用。
            </p>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 shadow-sm"
            >
              <input
                className="flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                placeholder="Ask Notra anything about your learning, essays, or ideas..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className={`rounded-full px-4 py-1.5 text-xs font-medium text-white shadow-sm transition ${
                  isSending || !input.trim()
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
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