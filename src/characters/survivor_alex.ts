import { PALETTE } from "../palette";
import type { CharacterPreset } from "./types";

/**
 * survivor_alex - the everyman of the group.
 * Blue field jacket, short dark crop, stubble and a scavenger backpack.
 * Acting default: open-palm explain, slightly leaning into the conversation.
 */
export const survivorAlex: CharacterPreset = {
  id: "survivor_alex",
  name: "Alex",
  role: "Scavenger / survivor",
  look: {
    scale: 1.1,
    eyeType: "normal",
    mouthType: "closed",
    bodyColor: PALETTE.jacketBlue,
    skinColor: PALETTE.skin,
    hairColor: PALETTE.hair,
    hairStyle: "crop",
    beard: true,
    beardColor: "#211731",
    backpack: true,
    accentColor: PALETTE.strap,
    armPose: "explain",
    bodyPosture: "lean-forward",
    headTilt: -2,
    sunSide: "right",
    breathePhase: 0.2,
    seed: 11,
  },
};
