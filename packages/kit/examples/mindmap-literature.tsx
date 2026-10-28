import { MindMap, TitleWithVisual } from "@kit";

export const narration =
  "Truyện Kiều có thể nhìn từ bốn phía. Về nội dung, đó là số phận người phụ nữ tài hoa bạc mệnh. Về nhân vật, Thuý Kiều hiện lên tài sắc và hiếu nghĩa. Về nghệ thuật, Nguyễn Du dùng thể lục bát điêu luyện. Và giá trị nhân đạo thấm trong từng câu thơ.";

// Branches arrive with their sentence; `focus` stays on the branch being discussed.
export default function Scene() {
  return (
    <TitleWithVisual title="Truyện Kiều qua bốn góc nhìn">
      <MindMap
        center="Truyện Kiều"
        at="cue:truyện kiều"
        branches={[
          { label: "Nội dung", items: ["Số phận người phụ nữ", "Tài hoa bạc mệnh"], at: "cue:về nội dung", icon: "book" },
          { label: "Nhân vật", items: ["Thuý Kiều: tài, sắc", "Hiếu nghĩa"], at: "cue:về nhân vật", icon: "person" },
          { label: "Nghệ thuật", items: ["Thể lục bát", "Ngôn ngữ điêu luyện"], at: "cue:về nghệ thuật", icon: "feather" },
          { label: "Giá trị", items: ["Nhân đạo", "Tố cáo xã hội"], at: "cue:giá trị nhân đạo", icon: "heart" },
        ]}
        focus={[
          { at: "cue:về nội dung", index: 0 },
          { at: "cue:về nhân vật", index: 1 },
          { at: "cue:về nghệ thuật", index: 2 },
          { at: "cue:giá trị nhân đạo", index: 3 },
        ]}
      />
    </TitleWithVisual>
  );
}
