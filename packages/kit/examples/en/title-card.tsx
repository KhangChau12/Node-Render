import { FullVisual, TitleCard } from "@kit";

export const narration = "Hello everyone. Today we explore the derivative, starting from a very everyday question.";

export default function Scene() {
  return (
    <FullVisual align="left">
      <TitleCard kicker="Calculus · Lesson 1" title="The derivative, from intuition" subtitle="How do we measure speed at one instant?" at="cue:the derivative" />
    </FullVisual>
  );
}
