// app/api/notra/route.ts
import { NextRequest } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs"; // 明确用 Node 运行时

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return new Response("服务器缺少 OPENAI_API_KEY，请检查环境变量配置。", {
      status: 500,
    });
  }

  try {
    const body = await req.json();

    const messages =
      body.messages && Array.isArray(body.messages)
        ? body.messages
        : body.message
        ? [{ role: "user", content: body.message }]
        : [];

    if (!messages.length) {
      return new Response("请求里没有发现有效的 messages / message 字段。", {
        status: 400,
      });
    }

    const systemPrompt = {
      role: "system" as const,
      content: `
你是 Notra，一位聪明、专业、有温度的中文 AI 助手。
要求：
- 用自然、清晰的中文回答；
- 自动分段排版，适当使用 Markdown 标题 / 列表；
- 有逻辑、有重点，举例恰到好处；
- 不要提到你是基于某个模型或 OpenAI，只以“Notra”自称。
`,
    };

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await client.chat.completions.create({
            model: "gpt-4o-mini", // 需要更强就改成 "gpt-4o"
            temperature: 0.9,
            stream: true,
            messages: [systemPrompt, ...messages],
          });

          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          console.error("Notra stream error:", err);
          controller.enqueue(encoder.encode("【系统暂时开小差了，请稍后再试】"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (err) {
    console.error("Notra route error:", err);
    return new Response("服务器解析请求出错，请稍后再试。", { status: 500 });
  }
}