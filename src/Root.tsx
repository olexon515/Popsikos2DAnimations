import { Composition } from "remotion";
import { DEFAULT_LOCATION } from "./locations";
import { MainScene } from "./MainScene";
import { DURATION, FPS, HEIGHT, WIDTH } from "./palette";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Popsikos2DAnimations"
      component={MainScene}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{ location: DEFAULT_LOCATION }}
    />
  );
};
