import { PALETTE } from "../palette";
import type { CharacterPreset } from "./types";

/**
 * engineer_noa - the wiry mechanic of the cell.
 * Teal work jumpsuit, a tight bun, square glasses and a tool backpack.
 * Acting default: hands-on explain, hunched over a workbench.
 */
export const engineerNoa: CharacterPreset = {
  id: "engineer_noa",
  name: "Noa",
  role: "Engineer / medic",
  look: {
    scale: 1.0,
    eyeType: "normal",
    mouthType: "closed",
    bodyColor: PALETTE.jacketTeal,
    skinColor: "#F0BC93",
    hairColor: PALETTE.hairBlonde,
    hairStyle: "bun",
    glasses: "square",
    backpack: true,
    accentColor: "#2F5B60",
    armPose: "explain",
    bodyPosture: "slumped",
    headTilt: -4,
    sunSide: "left",
    breathePhase: 1.3,
    seed: 83,
  },
};
