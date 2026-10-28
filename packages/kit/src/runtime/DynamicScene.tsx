import React, { useEffect, useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { color, fonts } from "../theme";
import { compileScene } from "./compile";
import { errorMessage, reportSceneError } from "./errors";

export function SceneErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <AbsoluteFill style={{ background: color("bg"), padding: 96, justifyContent: "center" }}>
      <div style={{ borderLeft: `6px solid ${color("err")}`, background: color("surface"), padding: "32px 40px", maxWidth: 1500 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2, textTransform: "uppercase", color: color("err"), marginBottom: 14 }}>{title}</div>
        <div style={{ fontFamily: fonts.mono, fontSize: 28, color: color("text"), whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{message}</div>
      </div>
    </AbsoluteFill>
  );
}

class Boundary extends React.Component<{ sceneId: string; children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: unknown) {
    return { error: errorMessage(err) };
  }
  componentDidCatch(err: unknown) {
    reportSceneError({ sceneId: this.props.sceneId, kind: "runtime", message: errorMessage(err) });
  }
  componentDidUpdate(prev: { children: React.ReactNode }) {
    if (prev.children !== this.props.children && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) return <SceneErrorCard title="Error while running the scene" message={this.state.error} />;
    return this.props.children;
  }
}

/** Compile and render one scene's source, reporting failures to the editor. */
export function DynamicScene({ code, sceneId }: { code: string; sceneId: string }) {
  const result = useMemo(() => {
    try {
      return { Comp: compileScene(code), error: null };
    } catch (err) {
      return { Comp: null, error: errorMessage(err) };
    }
  }, [code]);

  useEffect(() => {
    if (result.error) reportSceneError({ sceneId, kind: "compile", message: result.error });
  }, [result.error, sceneId]);

  if (!result.Comp) return <SceneErrorCard title="Error compiling the scene" message={result.error ?? ""} />;
  const Comp = result.Comp;
  return (
    <Boundary key={code} sceneId={sceneId}>
      <Comp />
    </Boundary>
  );
}
