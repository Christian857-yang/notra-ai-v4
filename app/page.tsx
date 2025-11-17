"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function NotraChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "你好，我是 Notra，你的智能学习助手。今天想一起解决什么问题？",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 聊天滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };

    // 先把用户消息推进去
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // 占位一条空的助手消息，后面流式往里写
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await fetch("/api/notra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder("utf-8");
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        assistantText += chunk;

        // 每次收到新内容，更新最后一条 assistant 消息，实现“打字机”效果
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
          };
          return updated;
        });
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ 网络或服务异常，请稍后重试。如果问题持续出现，可以检查服务器和 API Key 配置。",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* 顶部栏 */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white text-lg">
              N
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                Notra AI
              </span>
              <span className="text-xs text-slate-500">
                专注学习与写作的智能助手
              </span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} Notra
          </span>
        </div>
      </header>

      {/* 聊天内容 */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full max-w-4xl flex-col px-3 py-4 sm:px-6 sm:py-6">
          <div className="flex-1 space-y-4">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      isUser
                        ? "bg-blue-600 text-white"
                        : "bg-white text-slate-900 border border-slate-100"
                    }`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <div className="prose prose-slate prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content ||
                            (idx === messages.length - 1 && loading
                              ? "Notra 正在思考…"
                              : "")}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* 底部小提示 */}
          <div className="mt-4 text-[11px] text-slate-400">
            <span>⌨︎ 回车发送 · Shift + 回车换行 · Notra 不会引用任何 GPT 品牌，只代表我们自己的产品。</span>
          </div>
        </div>
      </main>

      {/* 底部输入区 */}
      <footer className="border-t bg-white">
        <div className="mx-auto flex max-w-4xl items-end gap-3 px-3 py-3 sm:px-6 sm:py-4">
          <textarea
            className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none ring-0 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            placeholder="输入你的问题，比如：『帮我梳理 UCL 的专业与申请要求』，回车发送，Shift+回车换行…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="mb-[2px] inline-flex h-[46px] items-center rounded-2xl bg-blue-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? "思考中…" : "发送"}
          </button>
        </div>
      </footer>
    </div>
  );
}