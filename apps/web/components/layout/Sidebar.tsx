"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChatIcon,
  ConversationsIcon,
  DashboardIcon,
  LogsIcon,
  PlusIcon,
} from "@/components/icons";
import { StatusDot } from "./StatusDot";
import { relTime } from "@/lib/format";
import type { Conversation } from "@/types";

const NAV = [
  { href: "/", id: "chat", label: "Chat", Icon: ChatIcon },
  {
    href: "/conversations",
    id: "conversations",
    label: "Conversations",
    Icon: ConversationsIcon,
  },
  { href: "/dashboard", id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/inference-logs", id: "logs", label: "Inference logs", Icon: LogsIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/conversations/");
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  conversations,
  activeConversationId,
}: {
  conversations: Conversation[];
  activeConversationId: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand__wordmark">LLMTrace</div>
        <div className="brand__build">v0.1.0 · main</div>
      </div>

      <div className="nav">
        {NAV.map(({ href, label, Icon, id }) => (
          <Link
            key={id}
            href={href}
            className={"nav__item" + (isActive(pathname, href) ? " nav__item--active" : "")}
          >
            <Icon className="nav__icon" />
            <span>{label}</span>
            {id === "conversations" && conversations.length > 0 && (
              <span className="nav__count">{conversations.length}</span>
            )}
          </Link>
        ))}
      </div>

      <div className="nav__section" style={{ marginTop: 6 }}>
        <span>Recent</span>
        <button
          className="icon-btn"
          style={{ width: 18, height: 18 }}
          title="New chat"
          onClick={() => router.push("/")}
        >
          <PlusIcon style={{ width: 12, height: 12 }} />
        </button>
      </div>

      <div className="convo-list">
        {conversations.slice(0, 12).map((c) => {
          const active =
            activeConversationId === c.id && pathname.startsWith("/conversations/");
          return (
            <Link
              key={c.id}
              href={`/conversations/${c.id}`}
              className={"convo-row" + (active ? " convo-row--active" : "")}
            >
              <div className="convo-row__title">
                <StatusDot status={c.status} />
                {c.title ?? "Untitled"}
              </div>
              <div className="convo-row__meta">
                {relTime(c.updatedAt)} · {c.messageCount} msg
              </div>
            </Link>
          );
        })}
        {conversations.length === 0 && (
          <div className="convo-row" style={{ cursor: "default", opacity: 0.6 }}>
            <div className="convo-row__title" style={{ fontStyle: "italic" }}>
              no conversations yet
            </div>
            <div className="convo-row__meta">start a chat to populate</div>
          </div>
        )}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__footer-row">
          <span>api</span>
          <span>
            <span
              className="led"
              style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}
            />
            ok
          </span>
        </div>
        <div className="sidebar__footer-row">
          <span>worker</span>
          <span>
            <span
              className="led"
              style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }}
            />
            running
          </span>
        </div>
        <div className="sidebar__footer-row">
          <span>port</span>
          <span>
            <b>3232</b>
          </span>
        </div>
      </div>
    </aside>
  );
}
