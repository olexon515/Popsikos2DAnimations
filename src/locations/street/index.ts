import type { LocationDefinition } from "../types";
import { Embers } from "./Embers";
import { Ground } from "./Ground";
import { Horizon } from "./Horizon";
import { Midground } from "./Midground";
import { Sky } from "./Sky";

export const streetLocation: LocationDefinition = {
  id: "street",
  name: "Destroyed Street",
  Sky,
  Horizon,
  Ground,
  Midground,
  Embers,
  dustBandBackground:
    "linear-gradient(to bottom, rgba(255,107,61,0) 62%, rgba(255,138,76,0.14) 82%, rgba(255,138,76,0) 100%)",
};

export { Embers, Ground, Horizon, Midground, Sky };
