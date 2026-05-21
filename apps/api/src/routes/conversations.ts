import type { FastifyInstance } from "fastify";
import {
  ConversationCreateSchema,
  ConversationUpdateSchema,
} from "@llmtrace/shared";
import { prisma } from "../lib/prisma.js";

export async function registerConversationsRoutes(app: FastifyInstance) {
  app.post("/api/conversations", async (req, reply) => {
    const parsed = ConversationCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: "invalid_body", issues: parsed.error.flatten() };
    }
    const c = await prisma.conversation.create({
      data: { title: parsed.data.title ?? null },
    });
    return c;
  });

  app.get("/api/conversations", async (req) => {
    const q = req.query as { status?: string; limit?: string };
    const limit = Math.min(Math.max(Number(q.limit ?? 50), 1), 200);
    const where = q.status ? { status: q.status } : {};
    const rows = await prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      include: { _count: { select: { messages: true } } },
    });
    return {
      conversations: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        messageCount: r._count.messages,
      })),
    };
  });

  app.get<{ Params: { id: string } }>(
    "/api/conversations/:id/messages",
    async (req, reply) => {
      const c = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!c) {
        reply.code(404);
        return { error: "not_found" };
      }
      return {
        conversation: {
          id: c.id,
          title: c.title,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
        },
        messages: c.messages.map((m) => ({
          id: m.id,
          conversationId: m.conversationId,
          role: m.role,
          content: m.content,
          provider: m.provider,
          model: m.model,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/api/conversations/:id",
    async (req, reply) => {
      const parsed = ConversationUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: "invalid_body", issues: parsed.error.flatten() };
      }
      try {
        const c = await prisma.conversation.update({
          where: { id: req.params.id },
          data: {
            ...(parsed.data.status ? { status: parsed.data.status } : {}),
            ...(parsed.data.title ? { title: parsed.data.title } : {}),
          },
        });
        return c;
      } catch {
        reply.code(404);
        return { error: "not_found" };
      }
    }
  );
}
