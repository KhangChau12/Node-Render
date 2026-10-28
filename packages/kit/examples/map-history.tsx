import { TitleWithVisual, WorldMap } from "@kit";

export const narration =
  "Thế kỷ mười lăm, châu Âu tìm đường biển sang châu Á. Năm 1498, Vasco da Gama đi từ Bồ Đào Nha, vòng qua mũi Hảo Vọng, tới Ấn Độ. Con đường này mở ra thời đại giao thương toàn cầu.";

// The route is drawn as the narration follows it; the countries at both ends light up.
export default function Scene() {
  return (
    <TitleWithVisual title="Đường biển sang Ấn Độ">
      <WorldMap
        region={[-30, 95, -42, 50]}
        at="cue:thế kỷ"
        highlights={[
          { countries: ["Bồ Đào Nha"], at: "cue:bồ đào nha", color: "accent" },
          { countries: ["Ấn Độ"], at: "cue:tới ấn độ", color: "ok", label: "Ấn Độ" },
        ]}
        markers={[
          { at: [-9.1, 38.7], label: "Lisbon", when: "cue:bồ đào nha", dir: "l" },
          { at: [18.5, -34.4], label: "Mũi Hảo Vọng", when: "cue:mũi hảo vọng", dir: "r" },
          { at: [75.8, 11.3], label: "Calicut", when: "cue:tới ấn độ", dir: "r" },
        ]}
        routes={[
          {
            points: [[-9.1, 38.7], [-18, 22], [-20, 2], [-5, -22], [18.5, -36.5], [36, -22], [42, -4], [55, 8], [75.8, 11.3]],
            when: "cue:năm 1498",
            duration: 5,
            color: "err",
          },
        ]}
      />
    </TitleWithVisual>
  );
}
