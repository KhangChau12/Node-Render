import katex from "katex";
import React from "react";

/* Renders lesson bodies: blank-line paragraphs, "- " bullets, $…$ and $$…$$ math. */

function tex(src: string, display: boolean) {
  return katex.renderToString(src, { displayMode: display, throwOnError: false, strict: "ignore" });
}

/** One line of text with inline $…$ math (chat messages, short labels). */
export function Inline({ text }: { text: string }) {
  const parts = text.split(/(\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\$[^$]+\$$/.test(p) ? <span key={i} dangerouslySetInnerHTML={{ __html: tex(p.slice(1, -1), false) }} /> : <React.Fragment key={i}>{p}</React.Fragment>,
      )}
    </>
  );
}

type Block = { kind: "eq"; tex: string } | { kind: "p"; lines: string[] } | { kind: "ul"; items: string[] };

const isBullet = (l: string) => /^\s*[-*•] /.test(l);

export function parseProse(body: string): Block[] {
  const blocks: Block[] = [];
  // Display math first, so its contents are never split as paragraphs.
  for (const chunk of body.replace(/\r/g, "").split(/(\$\$[\s\S]+?\$\$)/g)) {
    if (/^\$\$[\s\S]+\$\$$/.test(chunk.trim())) {
      blocks.push({ kind: "eq", tex: chunk.trim().slice(2, -2).trim() });
      continue;
    }
    for (const para of chunk.split(/\n\s*\n/)) {
      const lines = para.split("\n").filter((l) => l.trim());
      lines.forEach((line, j) => {
        const last = blocks[blocks.length - 1];
        if (isBullet(line)) {
          const item = line.replace(/^\s*[-*•] /, "");
          if (j > 0 && last?.kind === "ul") last.items.push(item);
          else blocks.push({ kind: "ul", items: [item] });
        } else if (j > 0 && last?.kind === "p" && !isBullet(lines[j - 1])) {
          last.lines.push(line); // soft line break inside a paragraph
        } else {
          blocks.push({ kind: "p", lines: [line] });
        }
      });
    }
  }
  return blocks;
}

export function Prose({ body }: { body: string }) {
  return (
    <div className="prose">
      {parseProse(body).map((b, i) => {
        if (b.kind === "eq") return <div key={i} className="eq" dangerouslySetInnerHTML={{ __html: tex(b.tex, true) }} />;
        if (b.kind === "ul")
          return (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}><Inline text={it} /></li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            {b.lines.map((l, j) => (
              <React.Fragment key={j}>
                {j > 0 ? <br /> : null}
                <Inline text={l} />
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
