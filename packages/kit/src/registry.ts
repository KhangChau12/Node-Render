import type { KitEntry } from "./define";
import { calloutMeta, bulletRevealMeta, codeBlockMeta, titleCardMeta } from "./components/text";
import { formulaMeta, formulaStepsMeta } from "./components/formula";
import { graphMeta } from "./components/graph";
import { mathMorphMeta } from "./components/morph";
import { numberLineMeta } from "./components/numberline";
import { braceMeta, dotGridMeta, surroundMeta } from "./components/annotate";
import { iconMeta } from "./components/icon";
import { cycleMeta, derivationMeta, mindMapMeta, passageMeta, timelineMeta } from "./components/content";
import { gridVizMeta, liveTexMeta, pieChartMeta, sliderMeta, vennMeta } from "./components/charts";
import { atomMeta, moleculeMeta } from "./components/science";
import { worldMapMeta } from "./components/geo";
import { axes3DMeta, curve3DMeta, point3DMeta, segment3DMeta, solidMeta, surfaceMeta, vector3DMeta } from "./math/three";
import { angleMeta, areaUnderMeta, axesMeta, braceBetweenMeta, circleMeta, epicyclesMeta, groupMeta, labelMeta, parametricMeta, pathMeta, plotMeta, pointMeta, polygonMeta, regionMeta, riemannMeta, scatterMeta, secantMeta, segmentMeta, springMeta, stageMeta, tangentMeta, vectorFieldMeta, vectorMeta } from "./math/axes";
import { diagramMeta } from "./components/diagram";
import { arrayVizMeta } from "./components/array";
import { barChartMeta, cardsMeta, tableMeta, treeMeta } from "./components/data";
import { fullVisualMeta, titleWithVisualMeta, twoColumnMeta } from "./layouts";
import { animateMeta, arrowMeta, cameraMeta, counterMeta, drawPathMeta, fadeInMeta, highlightMeta, panelsMeta, pulseMeta, rowMeta, stackMeta, staggerMeta, switchMeta, typewriterMeta } from "./primitives";

/** Every public kit element, in docs order. Add new components here. */
export const registry: KitEntry[] = [
  titleWithVisualMeta,
  twoColumnMeta,
  fullVisualMeta,
  titleCardMeta,
  bulletRevealMeta,
  formulaMeta,
  formulaStepsMeta,
  mathMorphMeta,
  derivationMeta,
  axesMeta,
  stageMeta,
  axes3DMeta,
  graphMeta,
  numberLineMeta,
  arrayVizMeta,
  treeMeta,
  diagramMeta,
  barChartMeta,
  tableMeta,
  cardsMeta,
  dotGridMeta,
  calloutMeta,
  codeBlockMeta,
  timelineMeta,
  cycleMeta,
  mindMapMeta,
  passageMeta,
  vennMeta,
  pieChartMeta,
  gridVizMeta,
  worldMapMeta,
  atomMeta,
  moleculeMeta,
  plotMeta,
  parametricMeta,
  pointMeta,
  vectorMeta,
  segmentMeta,
  polygonMeta,
  circleMeta,
  angleMeta,
  areaUnderMeta,
  riemannMeta,
  tangentMeta,
  vectorFieldMeta,
  labelMeta,
  groupMeta,
  secantMeta,
  regionMeta,
  braceBetweenMeta,
  scatterMeta,
  epicyclesMeta,
  pathMeta,
  springMeta,
  surfaceMeta,
  curve3DMeta,
  point3DMeta,
  vector3DMeta,
  segment3DMeta,
  solidMeta,
  stackMeta,
  rowMeta,
  switchMeta,
  panelsMeta,
  pulseMeta,
  cameraMeta,
  animateMeta,
  counterMeta,
  arrowMeta,
  fadeInMeta,
  staggerMeta,
  typewriterMeta,
  highlightMeta,
  braceMeta,
  drawPathMeta,
  surroundMeta,
  iconMeta,
  sliderMeta,
  liveTexMeta,
];

export function findEntry(name: string): KitEntry | undefined {
  return registry.find((e) => e.name.toLowerCase() === name.toLowerCase());
}
