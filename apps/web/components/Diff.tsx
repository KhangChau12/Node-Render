"use client";
import { diffWords } from "diff";

/** Word-level inline diff for lesson suggestions. */
export function WordDiff({ before, after }: { before: string; after: string }) {
  const parts = diffWords(before, after);
  return (
    <div className="diffbody">
      {parts.map((p, i) => (p.added ? <ins key={i}>{p.value}</ins> : p.removed ? <del key={i}>{p.value}</del> : <span key={i}>{p.value}</span>))}
    </div>
  );
}

export function diffStats(before: string, after: string): { plus: number; minus: number } {
  let plus = 0;
  let minus = 0;
  for (const p of diffWords(before, after)) {
    const n = p.value.split(/\s+/).filter(Boolean).length;
    if (p.added) plus += n;
    if (p.removed) minus += n;
  }
  return { plus, minus };
}
