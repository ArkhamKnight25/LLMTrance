"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { api } from "@/lib/api";
import { apiBase } from "@/lib/api-base";
import type { Conversation } from "@/types";

const KEEPALIVE_MS = 10 * 60 * 1000;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);

  async function refresh() {
    try {
      const { conversations } = await api.listConversations();
      setConversations(conversations);
    } catch {
      // ignore — sidebar still renders empty
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ping = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetch(`${apiBase()}/healthz`, { cache: "no-store", keepalive: true }).catch(() => {});
    };
    const t = setInterval(ping, KEEPALIVE_MS);
    const onVisible = () => {
      if (!document.hidden) ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    const match = pathname.match(/^\/conversations\/([^/]+)/);
    const id = match?.[1] ?? null;
    if (!id) {
      setActiveConv(null);
      return;
    }
    const c = conversations.find((x) => x.id === id);
    setActiveConv(c ?? null);
  }, [pathname, conversations]);

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConv?.id ?? null}
      />
      <main className="main">
        <TopBar activeConv={activeConv} />
        {children}
      </main>
    </div>
  );
}
