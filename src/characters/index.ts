import type { CharacterProps } from "../Character";
import { commanderViktor } from "./commander_viktor";
import { engineerNoa } from "./engineer_noa";
import { scoutMaya } from "./scout_maya";
import { survivorAlex } from "./survivor_alex";
import type { CharacterPreset } from "./types";

/**
 * Character registry.
 *
 * Add a new hero by dropping a preset file next to this one and registering it
 * below - `CharacterId` then picks the new key up automatically.
 */
export const CHARACTERS = {
  survivor_alex: survivorAlex,
  scout_maya: scoutMaya,
  commander_viktor: commanderViktor,
  engineer_noa: engineerNoa,
} as const satisfies Record<string, CharacterPreset>;

export type CharacterId = keyof typeof CHARACTERS;

export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];

export const CHARACTER_LIST: readonly CharacterPreset[] = CHARACTER_IDS.map(
  (id) => CHARACTERS[id],
);

export const DEFAULT_CHARACTER: CharacterId = "survivor_alex";

export const getCharacter = (id: CharacterId = DEFAULT_CHARACTER): CharacterPreset =>
  CHARACTERS[id];

/**
 * Spread-ready props for a preset:
 *
 * ```tsx
 * <Character
 *   x={540}
 *   y={1660}
 *   {...characterProps("scout_maya", { lookAt: { x: 760, y: 1180 } })}
 *   isListening
 * />
 * ```
 *
 * `x`, `y` and any live acting prop can be overridden per shot; the preset only
 * owns the look and the default stance.
 */
export const characterProps = (
  id: CharacterId,
  overrides: Partial<CharacterProps> = {},
): Partial<CharacterProps> => ({ ...CHARACTERS[id].look, ...overrides });

export { commanderViktor, engineerNoa, scoutMaya, survivorAlex };
export type { CharacterLook, CharacterPreset } from "./types";
