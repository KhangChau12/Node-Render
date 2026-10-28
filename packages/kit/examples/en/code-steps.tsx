import { Callout, CodeBlock, Stack, Switch, TwoColumn } from "@kit";

export const narration =
  "Three common mistakes. First, initialising i wrongly: it must be l minus one. Second, the j loop runs too far. Third, forgetting the final swap with the pivot.";

export default function Scene() {
  return (
    <TwoColumn title="Common bugs in Lomuto" ratio={0.58}>
      <CodeBlock
        size={30}
        lineGap={0}
        at="cue:three common"
        code={`function partition(A, l, r)
  pivot = A[r]
  i = l - 1
  for j = l to r - 1
    if A[j] < pivot
      i = i + 1
      swap A[i], A[j]
  swap A[i + 1], A[r]
  return i + 1`}
        steps={[
          { at: "cue:initialising", highlight: [3] },
          { at: "cue:the j loop", highlight: [4] },
          { at: "cue:forgetting", highlight: [8] },
        ]}
      />
      <Stack>
        <Switch at={["cue:initialising", "cue:the j loop", "cue:forgetting"]}>
          <Callout tone="err" title="Bug 1" text="Starting with $i = l$ instead of $l - 1$" width={620} />
          <Callout tone="err" title="Bug 2" text="$j$ runs up to $r$ and compares the pivot with itself" width={620} />
          <Callout tone="err" title="Bug 3" text="Forgetting to put the pivot at $A[i+1]$" width={620} />
        </Switch>
      </Stack>
    </TwoColumn>
  );
}
