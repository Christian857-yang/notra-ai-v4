// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "edge"; // 保留流式输出

export async function POST(req: Request) {
  try {
    const { messages, provider = "openai-4o" } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body: messages is required" },
        { status: 400 }
      );
    }

    // ------------------------------------------------
    // 1️⃣ OpenAI GPT-4o（默认模型）
    // ------------------------------------------------
    if (provider === "openai-4o") {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: "Missing OPENAI_API_KEY" },
          { status: 500 }
        );
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        stream: true,
      });

      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            }
          } catch (err) {
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
    // 2️⃣ OpenAI GPT-4.1（ChatGPT 5.1）
    // ------------------------------------------------
    if (provider === "openai-5.1") {
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          { error: "Missing OPENAI_API_KEY" },
          { status: 500 }
        );
      }

      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await client.chat.completions.create({
        model: "gpt-4.1", // OpenAI 的 naming 就是这个
        messages,
        stream: true,
      });

      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            }
          } catch (err) {
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
    // 3️⃣ Gemini 3.0 Thinking（高智商模式）
    // ------------------------------------------------
    if (provider === "gemini") {
      if (!process.env.GOOGLE_AI_API_KEY) {
        return NextResponse.json(
          { error: "Missing GOOGLE_AI_API_KEY" },
          { status: 500 }
        );
      }

      const apiKey = process.env.GOOGLE_AI_API_KEY;

      // 把 messages 拼成一个纯文本 prompt
      const prompt = messages
        .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n");

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.0-pro:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              thinkingConfig: { thinkingLevel: "high" },
            },
          }),
        }
      );

      if (!response.ok) {
        const detail = await response.text();
        return NextResponse.json(
          { error: "Gemini API error", detail },
          { status: 500 }
        );
      }

      const data = await response.json();

      const text =
        data.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text || "")
          .join("") || "Gemini 返回了空内容。";

      const encoder = new TextEncoder();

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
    // 4️⃣ 未知 provider
    // ------------------------------------------------
    return NextResponse.json(
      { error: `Unknown provider: ${provider}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}