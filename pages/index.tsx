"use client";
import { useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [message, setMessage] = useState<string>("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [currentReply, setCurrentReply] = useState<string>("");

  const quickReplies = [
    "你是谁？",
    "你会哪些技能？",
    "介绍一下你的工作经历",
    "你最近在做什么项目？",
    "你的兴趣爱好是什么？",
  ];

  const sendMessage = (content?: string) => {
    const userMessage = content || message;
    if (!userMessage.trim()) return;

    setChatLog((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setCurrentReply("");

    // 直接调用 OpenAI API (流式)
    const es = new EventSource(`${process.env.NEXT_PUBLIC_BASE_URL}/v1/chat/completions?stream=true`, {
      withCredentials: false // 无需cookie
    } as EventSourceInit);

    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        setChatLog((prev) => [...prev, { role: "assistant", content: currentReply }]);
        setCurrentReply("");
        es.close();
        return;
      }
      try {
        const json = JSON.parse(e.data);
        const token = json.choices?.[0]?.delta?.content || "";
        if (token) {
          setCurrentReply((prev) => prev + token);
        }
      } catch {}
    };

    es.onerror = (err) => {
      console.error("SSE error", err);
      es.close();
    };

    // 💡 这里使用 fetch 先发送一次创建会话
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano", // ✅ 直接换成 gpt-5-nano
        messages: [
          {
            role: "system",
            content: `
              你是 myj，本名 myj，是一名软件工程师。
              擅长：Web 全栈开发（React、Next.js、Node.js）、API 设计、数据库优化。
              工作经历：曾在 ABC 科技公司担任前端开发三年，目前在 XYZ 公司做全栈工程师。
              兴趣爱好：喜欢研究新技术、开源贡献、旅行与摄影。
              你的任务是用自然语言向别人介绍自己，回答任何关于你的问题。
              如果问题超出你的信息范围，请礼貌说明，并引导他们了解你相关的能力或背景。
            `,
          },
          { role: "user", content: userMessage },
        ],
        max_tokens: 600,
        temperature: 0.8,
        stream: true,
      }),
    }).catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 700, margin: "auto" }}>
      <h1>💬 了解 myj（gpt-5-nano 流式直连版）</h1>

      {/* 聊天记录 */}
      <div style={{ border: "1px solid #ccc", padding: 10, height: 400, overflowY: "auto", borderRadius: 6, marginBottom: 10 }}>
        {chatLog.map((msg, idx) => (
          <div key={idx} style={{ margin: "8px 0", textAlign: msg.role === "user" ? "right" : "left" }}>
            <b>{msg.role === "user" ? "🧑 你" : "🤖 myj"}：</b> {msg.content}
          </div>
        ))}
        {currentReply && (
          <div style={{ textAlign: "left", color: "#333" }}>
            <b>🤖 myj：</b> {currentReply}
            <span style={{ background: "#ccc" }}>▋</span>
          </div>
        )}
      </div>

      {/* 快捷按钮 */}
      <div style={{ marginBottom: 10 }}>
        {quickReplies.map((q, idx) => (
          <button
            key={idx}
            style={{
              padding: "6px 12px",
              margin: "0 5px 5px 0",
              background: "#f0f0f0",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
            }}
            onClick={() => sendMessage(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div style={{ display: "flex" }}>
        <input
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
          type="text"
          placeholder="输入你的问题..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          style={{
            padding: "8px 16px",
            marginLeft: 5,
            background: "#4cafef",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
          onClick={() => sendMessage()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
