import { TOTAL_FRAMES } from "./dialogueTimeline";

/** Shared colour system for the whole film. */
export const INK = "#0B0710";

export const PALETTE = {
  // sky
  skyNight: "#1F0F2C",
  skyTop: "#2C1635",
  skyMid: "#4A1C40",
  skyMaroon: "#8A2C46",
  skyWarm: "#FF5E3A",
  skyHot: "#FF9A57",
  sunCore: "#FFF6D8",
  sunMid: "#FFD98A",
  sunEdge: "#FF8A47",
  // distant city
  silhouette: "#241234",
  silhouetteDeep: "#180E26",
  haze: "#FF6B3D",
  // ground
  asphaltTop: "#2B3450",
  asphaltBottom: "#10141F",
  asphaltCrack: "#080A12",
  // light / particles
  ember: "#FFC489",
  emberHot: "#FF7A3D",
  ash: "#9C8FA8",
  // characters
  skin: "#F2C49B",
  jacketBlue: "#2E3A57",
  jacketPlum: "#3B2B4E",
  hair: "#1B1224",
  shadow: "#1A2238",
  // character wardrobe (src/characters/ presets)
  jacketOlive: "#4B4A34",
  jacketTeal: "#2A474B",
  coatCommand: "#3B2230",
  strap: "#161220",
  hairGrey: "#8B8794",
  hairAuburn: "#5A2B23",
  hairBlonde: "#8A6A3C",
  lens: "#8FE3F0",
} as const;

export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;
/** Video length in frames. Driven by `src/dialogueTimeline.ts` (1800 default = 60 s). */
export const DURATION = TOTAL_FRAMES;
export const HORIZON_Y = 1180;
