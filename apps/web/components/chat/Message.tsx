import { CancelIcon } from "@/components/icons";
import { MarkdownLite } from "./MarkdownLite";
import type { UIChatMessage } from "@/types";

export function Message({ m }: { m: UIChatMessage }) {
  const isUser = m.role === "user";
  const time = new Date(m.createdAt);
  return (
    <div className="msg">
      <div className="msg__rail">
        <span className={"msg__role " + (isUser ? "msg__role--user" : "msg__role--asst")}>
          {isUser ? "You" : "Assistant"}
        </span>
        <span className="msg__time mono">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        {!isUser && m.model && (
          <span className="msg__time mono" style={{ marginTop: 2 }}>
            {m.provider}/{m.model}
          </span>
        )}
      </div>
      <div>
        <div className="msg__body">
          <MarkdownLite text={m.content} />
          {m.streaming && <span className="cursor" />}
        </div>

        {!isUser && !m.streaming && !m.cancelled && (
          <div className="msg__meta">
            {m.latencyMs != null && (
              <>
                <span>
                  <b>{(m.latencyMs / 1000).toFixed(2)}s</b> latency
                </span>
                <span className="msg__meta-dot" />
              </>
            )}
            <span>
              in <b>{m.tokensIn ?? 0}</b> tok
            </span>
            <span className="msg__meta-dot" />
            <span>
              out <b>{m.tokensOut ?? 0}</b> tok
            </span>
            <span className="msg__meta-dot" />
            <span>
              req_<b>{(m.id || "").slice(-8)}</b>
            </span>
            <span className="msg__meta-dot" />
            <span className="status status--ok" style={{ fontSize: 9.5 }}>
              logged
            </span>
          </div>
        )}

        {m.cancelled && (
          <div className="msg__cancelled">
            <CancelIcon style={{ width: 10, height: 10 }} /> response cancelled · partial log emitted
          </div>
        )}
      </div>
    </div>
  );
}
