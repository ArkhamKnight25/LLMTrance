function inlineMd(s: string): string {
  let out = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

export function MarkdownLite({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/```/);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          const lines = part.split("\n");
          if (lines[0] && /^[a-z]+$/i.test(lines[0])) lines.shift();
          return (
            <pre key={i}>
              <code>{lines.join("\n")}</code>
            </pre>
          );
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: inlineMd(part) }} />;
      })}
    </>
  );
}
