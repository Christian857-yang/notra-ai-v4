// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge"; // 为了流式输出更顺滑

type Provider = "openai" | "openai-5" | "gemini";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;

// 可以在 Vercel 日志里看到这些 warn，方便排查
if (!OPENAI_API_KEY) {
  console.warn("[Notra] OPENAI_API_KEY is not set.");
}
if (!GOOGLE_AI_API_KEY) {
  console.warn("[Notra] GOOGLE_AI_API_KEY is not set.");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider = "openai" }: { messages: any[]; provider?: Provider } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body: messages is required" },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // 1️⃣ OpenAI 分支（GPT-4o / GPT-5.1(gpt-4.1)）
    // ------------------------------------------------
    if (provider === "openai" || provider === "openai-5") {
      if (!OPENAI_API_KEY) {
        return NextResponse.json(
          { error: "Missing OPENAI_API_KEY on server" },
          { status: 500 }
        );
      }

      const openai = new OpenAI({
        apiKey: OPENAI_API_KEY,
      });

      // openai -> gpt-4o, openai-5 -> gpt-4.1
      const model = provider === "openai" ? "gpt-4o" : "gpt-4.1";

      const completion = await openai.chat.completions.create({
        model,
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
    }

    // ------------------------------------------------
    // 2️⃣ Gemini 3.0 分支（gemini-3-pro-preview + thinkingLevel=high）
    // ------------------------------------------------
    if (provider === "gemini") {
      if (!GOOGLE_AI_API_KEY) {
        return NextResponse.json(
          { error: "Missing GOOGLE_AI_API_KEY on server" },
          { status: 500 }
        );
      }

      // 把对话拼成一个长 prompt，保持和之前 messages 结构兼容
      const prompt = messages
        .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GOOGLE_AI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              thinkingConfig: {
                thinkingLevel: "high",
              },
            },
          }),
        }
      );

      if (!geminiRes.ok) {
        const errorText = await geminiRes.text();
        console.error("Gemini API error:", errorText);
        return NextResponse.json(
          { error: "Gemini API error", detail: errorText },
          { status: 500 }
        );
      }

      const data = await geminiRes.json();

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || "")
          .join("") || "Gemini 没有返回任何内容。";

      const encoder = new TextEncoder();

      // 这里为了稳定，用“一次性整体推送”的方式给前端
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(text));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    // ------------------------------------------------
    // 3️⃣ 未知 provider
    // ------------------------------------------------
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("API /api/chat error:", error);
    return NextResponse.json(
      { error: "Server error while calling AI provider" },
      { status: 500 }
    );
  }
}