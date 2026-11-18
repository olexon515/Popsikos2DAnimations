import { streetLocation } from "./street";
import type { LocationDefinition } from "./types";

export const LOCATIONS = {
  street: streetLocation,
} as const satisfies Record<string, LocationDefinition>;

export type LocationId = keyof typeof LOCATIONS;

export const DEFAULT_LOCATION: LocationId = "street";

export const getLocation = (id: LocationId = DEFAULT_LOCATION): LocationDefinition =>
  LOCATIONS[id];

export type { LocationDefinition, LocationLayerProps, LocationSkyProps } from "./types";
