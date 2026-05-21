import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { ChatStreamRequestSchema } from "@llmtrace/shared";
import { prisma } from "../lib/prisma.js";
import { inferenceClient } from "../lib/sdk.js";

const CONTEXT_WINDOW = 20;

export async function registerChatRoutes(app: FastifyInstance) {
  app.post("/api/chat/stream", async (req, reply) => {
    const parsed = ChatStreamRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body", issues: parsed.error.flatten() };
    }
    const { message, provider, model } = parsed.data;
    let conversationId = parsed.data.conversationId;

    if (!conversationId) {
      const c = await prisma.conversation.create({
        data: { title: message.slice(0, 80) },
      });
      conversationId = c.id;
    } else {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "active" },
      });
    }

    await prisma.chatMessage.create({
      data: {
        conversationId,
        role: "user",
        content: message,
      },
    });

    const history = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: CONTEXT_WINDOW,
    });
    const messages = history
      .reverse()
      .map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

    const origin = (req.headers.origin as string | undefined) ?? "*";
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.raw.setHeader("Access-Control-Allow-Origin", origin);
    reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
    reply.raw.setHeader("Vary", "Origin");
    reply.raw.flushHeaders?.();

    const assistantMessageId = randomUUID();
    const upstream = new AbortController();
    let collected = "";
    let cancelled = false;

    const sendEvent = (event: string, data: unknown) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    req.raw.on("close", () => {
      if (!reply.raw.writableEnded) {
        cancelled = true;
        upstream.abort();
      }
    });

    sendEvent("start", { conversationId, messageId: assistantMessageId });

    try {
      for await (const ev of inferenceClient.stream({
        provider,
        model,
        messages,
        conversationId,
        signal: upstream.signal,
      })) {
        if (ev.type === "token") {
          collected += ev.text;
          sendEvent("token", { text: ev.text });
        } else if (ev.type === "error") {
          sendEvent("error", { message: ev.error.message });
        }
      }
    } catch (err) {
      const e = err as Error;
      sendEvent("error", { message: e.message });
    }

    if (collected.length > 0) {
      try {
        await prisma.chatMessage.create({
          data: {
            id: assistantMessageId,
            conversationId,
            role: "assistant",
            content: collected,
            provider,
            model,
          },
        });
      } catch (err) {
        req.log.error({ err }, "failed to persist assistant message");
      }
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: cancelled ? "cancelled" : "completed" },
    });

    sendEvent("done", { messageId: assistantMessageId, cancelled });
    reply.raw.end();
  });
}
