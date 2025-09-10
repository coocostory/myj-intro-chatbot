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
    <div style={{ padding: 20, maxWidth: 700, margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1>💬 了解 myj（gpt-5-nano - 浏览器直连版）</h1>

      {/* 聊天记录显示 */}
      <div style={{ border: "1px solid #ccc", borderRadius: 6, padding: 10, height: 400, overflowY: "auto", marginBottom: 10 }}>
        {chatLog.map((msg, idx) => (
          <div key={idx} style={{ textAlign: msg.role === "user" ? "right" : "left", marginBottom: 8 }}>
            <b>{msg.role === "user" ? "🧑 你" : "🤖 myj"}：</b> {msg.content}
          </div>
        ))}
        {currentReply && (
          <div style={{ textAlign: "left" }}>
            <b>🤖 myj：</b> {currentReply}
            <span className="cursor">▋</span>
          </div>
        )}
      </div>

      {/* 快捷按钮 */}
      <div style={{ marginBottom: 10 }}>
        {quickReplies.map((q, i) => (
          <button
            key={i}
            style={{ padding: "6px 12px", marginRight: 6, marginBottom: 6 }}
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="输入你的问题..."
        />
        <button
          style={{
            padding: "8px 16px",
            background: "#4cafef",
            border: "none",
            color: "#fff",
            borderRadius: 4,
            marginLeft: 5
          }}
          onClick={() => sendMessage()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
