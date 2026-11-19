import { PALETTE } from "../palette";
import type { CharacterPreset } from "./types";

/**
 * commander_viktor - the heavy, sceptical leader.
 * Burgundy command coat, grey shaved head, full beard and folded arms.
 * Acting default: crossed arms + upright posture; snaps to `point` when giving orders.
 */
export const commanderViktor: CharacterPreset = {
  id: "commander_viktor",
  name: "Viktor",
  role: "Commander / quartermaster",
  look: {
    scale: 1.14,
    eyeType: "angry",
    mouthType: "sad",
    bodyColor: PALETTE.coatCommand,
    skinColor: "#D9A57E",
    hairColor: PALETTE.hairGrey,
    hairStyle: "bald",
    beard: true,
    beardColor: "#514D5C",
    accentColor: "#7B2E3A",
    armPose: "crossed",
    bodyPosture: "neutral",
    headTilt: 2,
    sunSide: "right",
    breathePhase: 4.1,
    seed: 47,
  },
};
