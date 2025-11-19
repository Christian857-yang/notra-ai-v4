"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gpt-4o-mini");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: input }
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        messages: newMessages,
        model: model,
      }),
    });

    if (!res.ok) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "⚠️ Something went wrong. Please check your API key." }
      ]);
      setLoading(false);
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    let assistantReply = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      assistantReply += decoder.decode(value);
      setMessages([
        ...newMessages,
        { role: "assistant", content: assistantReply }
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="notra-root">
      <div className="notra-shell">

        {/* 顶部标题栏 */}
        <div className="notra-header">
          <div className="notra-title">Notra — Learning Companion</div>

          {/* ⭐ 三模型选择按钮 */}
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg text-xs shadow-sm ${
                model === "gpt-4o-mini" ? "bg-blue-600 text-white" : "bg-slate-200"
              }`}
              onClick={() => setModel("gpt-4o-mini")}
            >
              GPT-4o-mini
            </button>

            <button
              className={`px-3 py-1.5 rounded-lg text-xs shadow-sm ${
                model === "gpt-4o" ? "bg-blue-600 text-white" : "bg-slate-200"
              }`}
              onClick={() => setModel("gpt-4o")}
            >
              GPT-4o
            </button>

            <button
              className={`px-3 py-1.5 rounded-lg text-xs shadow-sm ${
                model === "gpt-5.1" ? "bg-blue-600 text-white" : "bg-slate-200"
              }`}
              onClick={() => setModel("gpt-5.1")}
            >
              GPT-5.1
            </button>
          </div>
        </div>

        {/* 聊天窗口 */}
        <div className="notra-chat">
          <div className="notra-chat-scroll">

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`notra-msg-row ${
                  msg.role === "user" ? "notra-msg-row-user" : "notra-msg-row-assistant"
                }`}
              >
                <div
                  className={`notra-bubble ${
                    msg.role === "user" ? "notra-bubble-user" : "notra-bubble-assistant"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="notra-input-bar">
            <div className="notra-input-inner">
              <textarea
                className="notra-input"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Notra anything..."
              />
              <button
                className="notra-send-btn"
                disabled={loading}
                onClick={sendMessage}
              >
                Send
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

  
