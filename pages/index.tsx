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

    // 添加用户消息
    setChatLog((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setCurrentReply("");

    // 建立 SSE 连接
    const es = new EventSource(`/api/chat_stream?msg=${encodeURIComponent(userMessage)}`);

    es.addEventListener("message", (e) => {
      const token = JSON.parse(e.data);
      setCurrentReply((prev) => prev + token);
    });

    es.addEventListener("done", () => {
      setChatLog((prev) => [...prev, { role: "assistant", content: currentReply }]);
      setCurrentReply("");
      es.close();
    });

    es.addEventListener("error", (err) => {
      console.error("SSE error", err);
      es.close();
    });
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 700, margin: "auto" }}>
      <h1>💬 了解 myj（流式输出版）</h1>

      {/* 聊天记录框 */}
      <div
        style={{
          border: "1px solid #ccc",
          padding: 10,
          height: 400,
          overflowY: "auto",
          borderRadius: 6,
          marginBottom: 10,
        }}
      >
        {chatLog.map((msg, idx) => (
          <div
            key={idx}
            style={{
              margin: "8px 0",
              textAlign: msg.role === "user" ? "right" : "left",
            }}
          >
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
          style={{
            flex: 1,
            padding: 8,
            border: "1px solid #ccc",
            borderRadius: 4,
          }}
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
