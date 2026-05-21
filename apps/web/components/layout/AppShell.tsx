"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { api } from "@/lib/api";
import type { Conversation } from "@/types";

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
