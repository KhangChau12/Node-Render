// KaTeX styles live here (not in formula.tsx) so Node scripts can import the registry.
import "katex/dist/katex.min.css";
import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, Series, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import { ensureFonts } from "../fonts";
import { guessLanguage, setContentLanguage } from "../locale";
import { color, ease, fonts, sizes } from "../theme";
import { SceneTimingProvider, useSceneTime, useSceneTiming } from "../timing/context";
import { captionChunks, type SceneTiming } from "../timing/estimate";
import { DynamicScene } from "./DynamicScene";

ensureFonts();

export type VideoScene = {
  id: string;
  title: string;
  code: string;
  timing: SceneTiming;
};

export type VideoInput = {
  fps: number;
  width: number;
  height: number;
  captions: boolean;
  scenes: VideoScene[];
};

export const sceneFrames = (s: VideoScene, fps: number) => Math.max(1, Math.ceil(s.timing.duration * fps));

export function Captions() {
  const timing = useSceneTiming();
  const t = useSceneTime();
  const chunks = useMemo(() => captionChunks(timing), [timing]);
  const cur = chunks.find((c) => t >= c.start - 0.05 && t < c.end);
  if (!cur) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54, pointerEvents: "none" }}>
      <div
        style={{
          maxWidth: 1500,
          background: "rgba(0,0,0,0.62)",
          color: color("text"),
          fontFamily: fonts.sans,
          fontSize: sizes.caption,
          lineHeight: 1.35,
          padding: "10px 26px",
          textAlign: "center",
        }}
      >
        {cur.text}
      </div>
    </AbsoluteFill>
  );
}

/**
 * Slow ambient motion behind every scene (drifting glows, a faint moving dot
 * grid) so no frame is ever completely still. Uses the global frame, so it
 * flows continuously across scene cuts.
 */
export function Backdrop() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = frame / fps;
  const ax = 30 + 12 * Math.sin(s / 9);
  const ay = 28 + 10 * Math.cos(s / 11);
  const bx = 72 + 10 * Math.cos(s / 13);
  const by = 70 + 12 * Math.sin(s / 10);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ background: `radial-gradient(900px 640px at ${ax}% ${ay}%, rgba(255,122,69,0.07), transparent 70%), radial-gradient(1000px 700px at ${bx}% ${by}%, rgba(115,167,255,0.06), transparent 70%)` }} />
      <AbsoluteFill
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1.6px, transparent 1.6px)",
          backgroundSize: "48px 48px",
          backgroundPosition: `${(s * 6) % 48}px ${(s * 3) % 48}px`,
          maskImage: "radial-gradient(ellipse at center, #000 30%, transparent 80%)",
        }}
      />
    </AbsoluteFill>
  );
}

/** Scene transitions: a short fade with a gentle push-in on enter, so cuts feel deliberate. */
function SceneShell({ frames, children }: { frames: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.min(Math.round(fps * 0.35), Math.floor(frames / 4));
  if (f <= 0) return <AbsoluteFill>{children}</AbsoluteFill>;
  const opacity = interpolate(frame, [0, f, frames - f, frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enter = interpolate(frame, [0, f * 1.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  const exit = interpolate(frame, [frames - f, frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity, transform: `scale(${1.03 - 0.03 * enter - 0.015 * exit})` }}>{children}</AbsoluteFill>;
}

export function SceneFrame({ scene, captions, fade = true }: { scene: VideoScene; captions: boolean; fade?: boolean }) {
  // Numbers and kit-drawn words follow the language of this scene's narration.
  setContentLanguage(guessLanguage(scene.timing.text));
  const { fps } = useVideoConfig();
  const frames = sceneFrames(scene, fps);
  const body = (
    <SceneTimingProvider timing={scene.timing}>
      <DynamicScene code={scene.code} sceneId={scene.id} />
      {captions ? <Captions /> : null}
    </SceneTimingProvider>
  );
  return fade ? <SceneShell frames={frames}>{body}</SceneShell> : body;
}

/** The whole lecture: every scene back to back. */
export function LectureVideo({ scenes, captions }: VideoInput) {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: color("bg"), color: color("text"), fontFamily: fonts.sans }}>
      <Backdrop />
      <Series>
        {scenes.map((s) => (
          <Series.Sequence key={s.id} durationInFrames={sceneFrames(s, fps)} name={s.title}>
            <SceneFrame scene={s} captions={captions} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}

/** One scene on its own (thumbnails, kit gallery). */
export function SingleScene({ scene, captions }: { scene: VideoScene; captions: boolean }) {
  return (
    <AbsoluteFill style={{ background: color("bg"), color: color("text"), fontFamily: fonts.sans }}>
      <Backdrop />
      <SceneFrame scene={scene} captions={captions} fade={false} />
    </AbsoluteFill>
  );
}

export function totalFrames(input: Pick<VideoInput, "scenes" | "fps">): number {
  return Math.max(1, input.scenes.reduce((n, s) => n + sceneFrames(s, input.fps), 0));
}

export const calculateLectureMetadata: CalculateMetadataFunction<VideoInput> = ({ props }) => ({
  durationInFrames: totalFrames(props),
  fps: props.fps,
  width: props.width,
  height: props.height,
});
