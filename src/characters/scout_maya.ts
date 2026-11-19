import { PALETTE } from "../palette";
import type { CharacterPreset } from "./types";

/**
 * scout_maya - the fast, sharp-eyed pathfinder.
 * Plum hoodie, a long braid, goggles pushed up and a warm scarf.
 * Acting default: relaxed idle with a confident head tilt.
 */
export const scoutMaya: CharacterPreset = {
  id: "scout_maya",
  name: "Maya",
  role: "Scout / pathfinder",
  look: {
    scale: 1.05,
    flipX: true,
    eyeType: "squint",
    mouthType: "smirk",
    bodyColor: PALETTE.jacketPlum,
    skinColor: "#E8B085",
    hairColor: PALETTE.hairAuburn,
    hairStyle: "braid",
    glasses: "goggles",
    hood: false,
    backpack: false,
    accentColor: "#C2563C",
    armPose: "idle",
    bodyPosture: "neutral",
    headTilt: 4,
    sunSide: "left",
    breathePhase: 2.4,
    seed: 29,
  },
};
