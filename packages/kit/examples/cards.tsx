import { Cards, TitleWithVisual } from "@kit";

export const narration =
  "Có ba cách chọn pivot. Lấy phần tử cuối thì đơn giản. Chọn ngẫu nhiên tránh được dữ liệu xấu. Trung vị của ba là lựa chọn thực dụng nhất.";

export default function Scene() {
  return (
    <TitleWithVisual title="Chọn pivot thế nào?">
      <Cards
        at="cue:ba cách"
        cards={[
          { title: "Phần tử cuối", points: ["Đơn giản", "Tệ với mảng đã sắp"], tone: "warn" },
          { title: "Ngẫu nhiên", points: ["Tránh dữ liệu xấu", "Cần sinh số ngẫu nhiên"], tone: "info" },
          { title: "Trung vị của ba", points: ["Đầu, giữa, cuối", "Ổn định trong thực tế"], tone: "ok" },
        ]}
        focus={[
          { index: 0, at: "cue:phần tử cuối" },
          { index: 1, at: "cue:ngẫu nhiên" },
          { index: 2, at: "cue:trung vị" },
        ]}
      />
    </TitleWithVisual>
  );
}
