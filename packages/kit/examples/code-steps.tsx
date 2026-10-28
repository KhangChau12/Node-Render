import { Callout, CodeBlock, Stack, Switch, TwoColumn } from "@kit";

export const narration =
  "Ba lỗi hay gặp. Thứ nhất, khởi tạo i sai: phải là l trừ một. Thứ hai, vòng j chạy quá xa. Thứ ba, quên hoán đổi cuối cùng với pivot.";

export default function Scene() {
  return (
    <TwoColumn title="Lỗi hay gặp khi cài Lomuto" ratio={0.58}>
      <CodeBlock
        size={30}
        lineGap={0}
        at="cue:ba lỗi"
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
          { at: "cue:khởi tạo", highlight: [3] },
          { at: "cue:vòng j", highlight: [4] },
          { at: "cue:quên hoán đổi", highlight: [8] },
        ]}
      />
      <Stack>
        <Switch at={["cue:khởi tạo", "cue:vòng j", "cue:quên hoán đổi"]}>
          <Callout tone="err" title="Lỗi 1" text="Khởi tạo $i = l$ thay vì $l - 1$" width={620} />
          <Callout tone="err" title="Lỗi 2" text="$j$ chạy tới $r$, so pivot với chính nó" width={620} />
          <Callout tone="err" title="Lỗi 3" text="Quên đặt pivot vào $A[i+1]$" width={620} />
        </Switch>
      </Stack>
    </TwoColumn>
  );
}
