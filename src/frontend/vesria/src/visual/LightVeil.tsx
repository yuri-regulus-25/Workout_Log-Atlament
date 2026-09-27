import { useEffect, useRef, useId } from "react";
import "./lightVeil.css";
import { sampleAmbientColor } from "./ambientColor";
import { trailRibbon } from "./trailRibbon";

/** 曲線を進む粒子の残光。最大7本を時間差で出現させる独立した試作。 */
export const lightVeil = {
  enabled: true,
  durationSeconds: 12,
  intervalSeconds: 8,
  initialDelaySeconds: 0,
  count: 7,
  opacity: 0.42,
};

function Trail({ index, paused }: { index: number; paused: boolean }) {
  const gradientId = useId().replace(/:/g, "");
  const group = useRef<SVGGElement>(null);
  const animations = useRef<Animation[]>([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    const surface = group.current;
    if (!surface) return;
    let disposed = false;
    const start = (initial: boolean) => {
      if (disposed) return;
      const x = 140 + Math.random() * 720;
      const bend = (Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 130);
      // 色と曲線は個体の寿命中固定し、次の出現時だけ再抽選する。
      surface.style.setProperty("--trail-color", sampleAmbientColor());
      const cycle = lightVeil.durationSeconds + lightVeil.intervalSeconds;
      const pass = lightVeil.durationSeconds / cycle;
      animations.current = Array.from(surface.querySelectorAll("path")).map(
        (path) => {
          path.setAttribute("d", trailRibbon(x, bend, 0));
          // 輪郭を生成時に計算し、ブラウザーへ補間を委譲。Reactの毎フレーム更新は不要。
          const frames: Keyframe[] = Array.from({ length: 81 }, (_, i) => {
            const t = i / 80;
            return {
              d: `path('${trailRibbon(x, bend, t * 1.32)}')`,
              opacity: Math.min(1, t / 0.12, (1 - t) / 0.2),
              offset: pass * t,
            };
          });
          frames.push({ ...frames[80], offset: 1 });
          const animation = path.animate(frames, {
            duration: cycle * 1000,
            delay: initial
              ? (lightVeil.initialDelaySeconds +
                  (index * cycle) / lightVeil.count) *
                1000
              : 0,
            iterations: 1,
          });
          if (pausedRef.current) animation.pause();
          return animation;
        },
      );
      animations.current[0].onfinish = () => start(false);
    };
    start(true);
    return () => {
      disposed = true;
      animations.current.forEach((animation) => {
        animation.onfinish = null;
        animation.cancel();
      });
      animations.current = [];
    };
  }, [index]);
  useEffect(() => {
    animations.current.forEach((animation) =>
      paused ? animation.pause() : animation.play(),
    );
  }, [paused]);
  return (
    <g ref={group} className="light-trail">
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop
            offset="0"
            stopColor="rgb(var(--trail-color))"
            stopOpacity="0.9"
          />
          <stop
            offset="1"
            stopColor="rgb(var(--trail-color))"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} />
    </g>
  );
}

/** routeの外で寿命を管理。Reduced MotionではAnimationごと撤去する。 */
export function LightVeil({
  reduced,
  paused,
}: {
  reduced: boolean;
  paused: boolean;
}) {
  if (!lightVeil.enabled || reduced) return null;
  return (
    <svg
      className="light-veil"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity: lightVeil.opacity }}
    >
      {Array.from({ length: lightVeil.count }, (_, index) => (
        <Trail key={index} index={index} paused={paused} />
      ))}
    </svg>
  );
}
