import { useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [currentReply, setCurrentReply] = useState("");

  const quickReplies = [
    "你是谁？",
    "你会哪些技能？",
    "介绍一下你的工作经历",
    "你最近在做什么项目？",
    "你的兴趣爱好是什么？"
  ];

  const sendMessage = async (preset?: string) => {
    const userMessage = preset || message;
    if (!userMessage.trim()) return;

    setChatLog((prev) => [...prev, { role: "user", content: userMessage }]);
    setMessage("");
    setCurrentReply("");

    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`, // 暴露给前端用
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          {
            role: "system",
            content: `你是 myj，本名 myj，是一名软件工程师。
                      擅长：Web 全栈开发（React、Next.js、Node.js）、API 设计、数据库优化。
                      工作经历：曾在 ABC 科技公司担任前端开发三年，目前在 XYZ 公司做全栈工程师。
                      兴趣爱好：喜欢研究新技术、开源贡献、旅行与摄影。
                      你的任务是用自然语言向别人介绍自己，回答任何关于你的问题。
                      如果问题超出你的信息范围，请礼貌说明，并引导他们了解你相关的能力或背景。`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 600,
        stream: true
      })
    });

    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line === "data: [DONE]") {
          setChatLog((prev) => [...prev, { role: "assistant", content: fullText }]);
          return;
        }
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.replace("data: ", ""));
            const token = json.choices?.[0]?.delta?.content || "";
            if (token) {
              fullText += token;
              setCurrentReply(fullText);
            }
          } catch (e) {
            console.error("解析SSE出错", e);
          }
        }
      }
    }
  };

  return (
    <div style={{
      padding: 32,
      fontFamily: "Inter, 'Segoe UI', Arial, sans-serif",
      maxWidth: 600,
      margin: "40px auto",
      background: "#f8fafc",
      borderRadius: 16,
      boxShadow: "0 4px 24px rgba(60,80,120,0.08)",
      border: "1px solid #e0e7ef"
    }}>
      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        color: "#1e293b",
        marginBottom: 24,
        letterSpacing: 1
      }}>💬 了解 myj（gpt-5-nano 流式直连版）</h1>

      {/* 聊天记录显示 */}
      <div style={{ border: "none", padding: 10, height: 400, overflowY: "auto", borderRadius: 10, marginBottom: 18, background: "#fff", boxShadow: "0 2px 8px rgba(60,80,120,0.04)" }}>
        {chatLog.map((msg, idx) => (
          <div key={idx} style={{
            margin: "12px 0",
            display: "flex",
            flexDirection: msg.role === "user" ? "row-reverse" : "row",
            alignItems: "flex-end"
          }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: msg.role === "user" ? "#4cafef" : "#e0e7ef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: msg.role === "user" ? "#fff" : "#4cafef",
              margin: msg.role === "user" ? "0 0 0 12px" : "0 12px 0 0"
            }}>
              {msg.role === "user" ? "🧑" : "🤖"}
            </div>
            <div style={{
              maxWidth: "70%",
              background: msg.role === "user" ? "linear-gradient(90deg,#4cafef 60%,#60a5fa 100%)" : "#f1f5f9",
              color: msg.role === "user" ? "#fff" : "#222",
              borderRadius: msg.role === "user" ? "16px 0 16px 16px" : "0 16px 16px 16px",
              padding: "10px 16px",
              fontSize: 16,
              boxShadow: msg.role === "user" ? "0 2px 8px rgba(76,175,239,0.08)" : "0 2px 8px rgba(60,80,120,0.04)",
              wordBreak: "break-word"
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {currentReply && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#e0e7ef",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: "#4cafef",
              margin: "0 12px 0 0"
            }}>
              🤖
            </div>
            <div style={{
              maxWidth: "70%",
              background: "#f1f5f9",
              color: "#222",
              borderRadius: "0 16px 16px 16px",
              padding: "10px 16px",
              fontSize: 16,
              boxShadow: "0 2px 8px rgba(60,80,120,0.04)",
              wordBreak: "break-word"
            }}>
              {currentReply}
              <span style={{ background: "#ccc" }}>▋</span>
            </div>
          </div>
        )}
      </div>

      {/* 快捷按钮 */}
      <div style={{ marginBottom: 18, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {quickReplies.map((q, idx) => (
          <button
            key={idx}
            style={{
              padding: "8px 18px",
              background: "#e0e7ef",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              color: "#4cafef",
              fontWeight: 500,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(60,80,120,0.04)",
              transition: "background 0.2s"
            }}
            onClick={() => sendMessage(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* 输入框 */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{
            flex: 1,
            padding: "12px 16px",
            border: "1.5px solid #b6c2d6",
            borderRadius: 8,
            fontSize: 16,
            outline: "none",
            background: "#f8fafc",
            transition: "border-color 0.2s",
            boxShadow: "0 1px 4px rgba(60,80,120,0.04)",
          }}
          type="text"
          placeholder="输入你的问题..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button
          style={{
            padding: "0 24px",
            background: "linear-gradient(90deg,#4cafef 60%,#60a5fa 100%)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            boxShadow: "0 2px 8px rgba(76,175,239,0.08)",
            cursor: "pointer",
            transition: "background 0.2s",
            height: 48,
            display: "flex",
            alignItems: "center"
          }}
          onClick={() => sendMessage()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
