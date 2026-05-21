"use client";

import { usePathname, useRouter } from "next/navigation";
import { PlusIcon } from "@/components/icons";
import type { Conversation } from "@/types";

export function TopBar({ activeConv }: { activeConv: Conversation | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const isChat = pathname === "/" || pathname.startsWith("/conversations/");

  let crumbs: React.ReactNode = null;
  if (pathname === "/") {
    crumbs = (
      <>
        <span>LLMTrace</span>
        <span className="sep">/</span>
        <span>chat</span>
        <span className="sep">/</span>
        <b>new</b>
      </>
    );
  } else if (pathname.startsWith("/conversations/") && pathname.split("/").length > 2) {
    crumbs = (
      <>
        <span>LLMTrace</span>
        <span className="sep">/</span>
        <span>chat</span>
        {activeConv && (
          <>
            <span className="sep">/</span>
            <b>{activeConv.title ?? "Untitled"}</b>
            <span className="sep">·</span>
            <span className="mono">{activeConv.id.slice(0, 8)}</span>
          </>
        )}
      </>
    );
  } else if (pathname === "/conversations") {
    crumbs = (
      <>
        <span>LLMTrace</span>
        <span className="sep">/</span>
        <b>conversations</b>
      </>
    );
  } else if (pathname === "/dashboard") {
    crumbs = (
      <>
        <span>LLMTrace</span>
        <span className="sep">/</span>
        <b>dashboard</b>
      </>
    );
  } else if (pathname === "/inference-logs") {
    crumbs = (
      <>
        <span>LLMTrace</span>
        <span className="sep">/</span>
        <b>inference logs</b>
      </>
    );
  }

  return (
    <header className="topbar">
      <div className="crumbs">{crumbs}</div>
      <div className="topbar__right">
        <span>
          <span
            className="led"
            style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }}
          />
          live
        </span>
        {isChat && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => router.push("/")}
            style={{ borderColor: "var(--rule-soft)" }}
          >
            <PlusIcon style={{ width: 12, height: 12 }} /> New chat
          </button>
        )}
      </div>
    </header>
  );
}
