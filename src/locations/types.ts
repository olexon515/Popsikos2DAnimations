import type React from "react";
import type { Camera } from "../Camera";

export type LocationLayerProps = {
  camera: Camera;
};

export type LocationSkyProps = LocationLayerProps & {
  flash: number;
};

export type LocationDefinition = {
  /** Unique location identifier used in the registry (e.g. "street"). */
  id: string;
  /** Human-readable name of the location. */
  name: string;
  /** Layer 1 (depth ~0.18): sky, sun/moon, clouds, optional explosion flash. */
  Sky: React.FC<LocationSkyProps>;
  /** Layer 2 (depth ~0.45): distant silhouettes and horizon haze. */
  Horizon: React.FC<LocationLayerProps>;
  /** Layer 4 (depth 1): floor/ground plane, rendered underneath props and actors. */
  Ground: React.FC<LocationLayerProps>;
  /** Layer 3 (depth ~0.78): midground props with 3px comic outline. */
  Midground: React.FC<LocationLayerProps>;
  /** Layer 5 (depth ~1.18): foreground atmospheric particles (embers, dust, snow, etc.). */
  Embers: React.FC<LocationLayerProps>;
  /** Optional CSS gradient for the thin dust band (depth 0.92) separating props and actors. */
  dustBandBackground?: string;
};
