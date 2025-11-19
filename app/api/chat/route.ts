// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 前端会传过来的标识：gpt-4o-mini / gpt-4o / gpt-5.1
type FrontendModel = "gpt-4o-mini" | "gpt-4o" | "gpt-5.1";

// 把前端标识映射到真正的 OpenAI 模型名称
function mapModel(m: FrontendModel): string {
  switch (m) {
    case "gpt-4o-mini":
      return "gpt-4o-mini";
    case "gpt-4o":
      return "gpt-4o";
    case "gpt-5.1":
      // 🔧 目前 5.1 对应的 API 模型名是 gpt-4.1
      return "gpt-4.1";
    default:
      return "gpt-4o-mini";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model = "gpt-4o-mini" } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      model?: FrontendModel;
    };

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY on server" },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body: messages is required" },
        { status: 400 }
      );
    }

    const apiModel = mapModel(model as FrontendModel);

    const completion = await openai.chat.completions.create({
      model: apiModel,
      messages,
      stream: true,
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(encoder.encode(delta));
            }
          }
        } catch (err) {
          console.error("OpenAI stream error:", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("API /api/chat error:", error);
    return NextResponse.json(
      { error: "Server error while calling OpenAI" },
      { status: 500 }
    );
  }
}
