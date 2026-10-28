import React from "react";
import { AbsoluteFill, Composition, Folder } from "remotion";
import { color, ensureFonts, estimateTiming, fonts, SceneTimingProvider, Captions } from "../src";
import { examples } from "../examples";

ensureFonts();

const FPS = 30;

function ExampleFrame({ id }: { id: string }) {
  const ex = examples.find((e) => e.id === id)!;
  const timing = estimateTiming(ex.mod.narration);
  const Scene = ex.mod.default;
  return (
    <AbsoluteFill style={{ background: color("bg"), color: color("text"), fontFamily: fonts.sans }}>
      <SceneTimingProvider timing={timing}>
        <Scene />
        <Captions />
      </SceneTimingProvider>
    </AbsoluteFill>
  );
}

/** Kit gallery: every example as its own composition. */
export function Root() {
  return (
    <Folder name="examples">
      {examples.map((ex) => (
        <Composition
          key={ex.id}
          id={ex.id}
          component={ExampleFrame}
          defaultProps={{ id: ex.id }}
          durationInFrames={Math.ceil(estimateTiming(ex.mod.narration).duration * FPS)}
          fps={FPS}
          width={1920}
          height={1080}
        />
      ))}
    </Folder>
  );
}
