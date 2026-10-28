import { TitleWithVisual, WorldMap } from "@kit";

export const narration =
  "In the fifteenth century, Europe looked for a sea route to Asia. In 1498 Vasco da Gama sailed from Portugal, around the Cape of Good Hope, to India. That route opened an age of global trade.";

// The route is drawn as the narration follows it; the countries at both ends light up.
export default function Scene() {
  return (
    <TitleWithVisual title="The sea route to India">
      <WorldMap
        region={[-30, 95, -42, 50]}
        at="cue:in the"
        highlights={[
          { countries: ["Portugal"], at: "cue:from portugal", color: "accent" },
          { countries: ["India"], at: "cue:to india", color: "ok", label: "India" },
        ]}
        markers={[
          { at: [-9.1, 38.7], label: "Lisbon", when: "cue:from portugal", dir: "l" },
          { at: [18.5, -34.4], label: "Cape of Good Hope", when: "cue:the cape", dir: "r" },
          { at: [75.8, 11.3], label: "Calicut", when: "cue:to india", dir: "r" },
        ]}
        routes={[
          {
            points: [[-9.1, 38.7], [-18, 22], [-20, 2], [-5, -22], [18.5, -36.5], [36, -22], [42, -4], [55, 8], [75.8, 11.3]],
            when: "cue:in 1498",
            duration: 5,
            color: "err",
          },
        ]}
      />
    </TitleWithVisual>
  );
}
