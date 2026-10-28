import React from "react";
import { Composition } from "remotion";
import { calculateLectureMetadata, LectureVideo, type VideoInput } from "../src";

const empty: VideoInput = { fps: 30, width: 1920, height: 1080, captions: true, scenes: [] };

/** Entry used by the render worker; all data comes from inputProps. */
export function RenderRoot() {
  return (
    <Composition
      id="Lecture"
      component={LectureVideo}
      defaultProps={empty}
      calculateMetadata={calculateLectureMetadata}
      durationInFrames={30}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
