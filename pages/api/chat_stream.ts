import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET method allowed" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const message = (req.query.msg as string) || "";

  // ======== 你的个人资料 ========
  const myjProfile = `
  你是 myj，本名 myj，是一名软件工程师。
  擅长：Web 全栈开发（React、Next.js、Node.js）、API 设计、数据库优化。
  工作经历：曾在 ABC 科技公司担任前端开发三年，目前在 XYZ 公司做全栈工程师。
  兴趣爱好：喜欢研究新技术、开源贡献、旅行与摄影。
  你的任务是用自然语言向别人介绍自己，回答任何关于你的问题。
  如果问题超出你的信息范围，请礼貌说明，并引导他们了解你相关的能力或背景。
  `;

  try {
    const upstream = await fetch(`${process.env.BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: myjProfile },
          { role: "user", content: message },
        ],
        max_tokens: 600,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      throw new Error(`OpenAI API error: ${upstream.statusText}`);
    }

    const decoder = new TextDecoder();

    // ✅ 用 ReadableStreamDefaultReader<Uint8Array> 替代 any
    const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const str = decoder.decode(value);
      const lines = str.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line === "data: [DONE]") {
          res.write(`event: done\ndata: \n\n`);
          res.end();
          return;
        }
        if (line.startsWith("data:")) {
          try {
            const json = JSON.parse(line.replace(/^data: /, ""));
            const token = json.choices?.[0]?.delta?.content || "";
            if (token) {
              res.write(`event: message\ndata: ${JSON.stringify(token)}\n\n`);
            }
          } catch {
            // 有可能是心跳或无内容
          }
        }
      }
    }
  } catch (err) {
    console.error(err);
    res.write(`event: error\ndata: "出错了，请稍后再试"\n\n`);
    res.end();
  }
}
