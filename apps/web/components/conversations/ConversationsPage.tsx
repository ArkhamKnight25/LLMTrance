"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, PlusIcon } from "@/components/icons";
import { api } from "@/lib/api";
import { relTime } from "@/lib/format";
import type { Conversation, ConversationStatus } from "@/types";

const FILTERS: [string, string][] = [
  ["all", "All"],
  ["active", "Active"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["error", "Error"],
];

export function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { conversations } = await api.listConversations();
        if (active) setConversations(conversations);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const counts: Record<string, number> = { all: conversations.length };
  for (const c of conversations) {
    counts[c.status] = (counts[c.status] ?? 0) + 1;
  }
  const totalMessages = conversations.reduce((s, c) => s + c.messageCount, 0);
  const list =
    filter === "all" ? conversations : conversations.filter((c) => c.status === filter);

  return (
    <div className="convos">
      <div className="convos__hed">
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            VOLUME · 02 — CONVERSATIONS
          </div>
          <h1>
            All <em>conversations</em>
          </h1>
          <div className="convos__sub">
            {conversations.length} conversations · {totalMessages} total messages · indexed by conv_id
          </div>
        </div>
        <button className="btn" onClick={() => router.push("/")}>
          <PlusIcon style={{ width: 11, height: 11 }} />
          New conversation
        </button>
      </div>

      <div className="convos__filters">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            className={"convos__filter" + (filter === k ? " active" : "")}
            onClick={() => setFilter(k)}
          >
            {label}
            <span className="count">{counts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      <table className="convotab">
        <thead>
          <tr>
            <th style={{ width: "46%" }}>Title</th>
            <th style={{ width: "10%" }}>Status</th>
            <th style={{ width: "8%", textAlign: "right" }} className="num">
              Msgs
            </th>
            <th style={{ width: "14%" }}>Last activity</th>
            <th>Conv ID</th>
            <th style={{ width: 80, textAlign: "right" }}></th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} onClick={() => router.push(`/conversations/${c.id}`)}>
              <td>
                <div className="ttl">{c.title ?? "Untitled"}</div>
                <div className="id">{c.id}</div>
              </td>
              <td>
                <StatusInline status={c.status} />
              </td>
              <td className="meta-mono" style={{ textAlign: "right" }}>
                {c.messageCount}
              </td>
              <td className="meta-mono">{relTime(c.updatedAt)}</td>
              <td className="preview mono" style={{ fontSize: 11 }}>
                {c.id.slice(0, 24)}…
              </td>
              <td style={{ textAlign: "right" }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Resume <ArrowRightIcon style={{ width: 11, height: 11 }} />
                </span>
              </td>
            </tr>
          ))}
          {!loading && list.length === 0 && (
            <tr>
              <td colSpan={6} style={{ color: "var(--ink-4)", textAlign: "center", padding: 40 }}>
                no conversations match this filter
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusInline({ status }: { status: ConversationStatus }) {
  const cls =
    {
      active: "status status--ok",
      completed: "status",
      cancelled: "status status--cancel",
      error: "status status--err",
    }[status] || "status";
  const style: React.CSSProperties = status === "completed" ? { color: "var(--ink-3)" } : {};
  return (
    <span className={cls} style={style}>
      {status === "completed" && (
        <span
          style={{
            width: 7,
            height: 7,
            background: "var(--ink-4)",
            display: "inline-block",
            marginRight: 6,
          }}
        />
      )}
      {status}
    </span>
  );
}
