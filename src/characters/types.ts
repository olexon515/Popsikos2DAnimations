import type {
  ArmPose,
  BodyPosture,
  EyeType,
  GlassesStyle,
  HairStyle,
  MouthType,
} from "../Character";

/**
 * Everything a character preset may hard-code. Stage position (`x`/`y`),
 * live acting (`isTalking`, `voiceAmplitude`, `lookAt`, `isListening`) and the
 * frame clock stay in the scene, so one preset can be reused in any shot.
 */
export type CharacterLook = {
  scale?: number;
  flipX?: boolean;
  eyeType?: EyeType;
  mouthType?: MouthType;
  bodyColor?: string;
  skinColor?: string;
  hairColor?: string;
  sunSide?: "left" | "right";
  breathePhase?: number;
  seed?: number;

  /* acting defaults */
  armPose?: ArmPose;
  bodyPosture?: BodyPosture;
  headTilt?: number;

  /* wardrobe */
  hairStyle?: HairStyle;
  glasses?: GlassesStyle;
  hood?: boolean;
  backpack?: boolean;
  beard?: boolean;
  beardColor?: string;
  accentColor?: string;
};

export type CharacterPreset = {
  /** Stable registry key, e.g. `survivor_alex`. */
  id: string;
  /** Display name for captions / HUD. */
  name: string;
  /** One-line role, useful for casting notes and agent prompts. */
  role: string;
  /** Default look + acting stance, spread directly into `<Character />`. */
  look: CharacterLook;
};
