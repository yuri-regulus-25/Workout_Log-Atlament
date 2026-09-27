import { useEffect, useRef } from "react";
import { LightVeil } from "./LightVeil";
import { sampleAmbientColor } from "./ambientColor";
import {
  ambientBudget,
  particleAlpha,
  particleCharacter as p,
  preFix,
} from "./materials";

type Particle = {
  age: number;
  x: number;
  speed: number;
  angle: number;
  sprite: HTMLCanvasElement;
  retiring?: number;
};

/** routeの外に常駐。Reactの毎フレーム更新・粒子ごとのblurを避け、焼き込んだ光点をCanvasへ描く。 */
export function Ambient({
  reduced,
  paused,
}: {
  reduced: boolean;
  paused: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const control = useRef({ reduced, paused });
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    control.current = { reduced, paused };
    wake.current();
  }, [reduced, paused]);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const sprites = [0, 1, 2].map((i) => {
      const sprite = document.createElement("canvas");
      sprite.width = sprite.height = 96;
      const ctx = sprite.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.shadowColor = "white";
      ctx.shadowBlur = p.glow * 2;
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(
        24,
        24,
        p.minSize + ((p.maxSize - p.minSize) * i) / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      return sprite;
    });
    let width = document.documentElement.clientWidth,
      height = innerHeight;
    let budget = ambientBudget(
      width,
      height,
      width < 700 || navigator.hardwareConcurrency <= 4,
    );
    let frame = 0,
      last = 0,
      emission = 0;
    // 光点とglowのalphaを再利用し、Spawn時だけ固定色を焼き込む。毎フレームの着色は不要。
    const coloredSprite = () => {
      const sprite = document.createElement("canvas");
      sprite.width = sprite.height = 96;
      const ctx = sprite.getContext("2d")!;
      ctx.drawImage(sprites[Math.floor(Math.random() * 3)], 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = `rgb(${sampleAmbientColor()})`;
      ctx.fillRect(0, 0, 96, 96);
      return sprite;
    };
    const born = (age = 0): Particle => ({
      age,
      x: Math.random() * width,
      speed: p.speed * (0.55 + Math.random() * 0.65),
      angle: (Math.random() * 2 - 1) * p.angle,
      sprite: coloredSprite(),
    });
    // 定常状態を先行配置し、起動直後も空間が成立する。route変更では作り直さない。
    const particles = Array.from({ length: budget.count }, () =>
      born(Math.random() * preFix.ambient.lifetime),
    );
    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const dot of particles) {
        const x = dot.x + Math.sin(dot.angle) * dot.speed * dot.age;
        const y = height + 16 - Math.cos(dot.angle) * dot.speed * dot.age;
        context.globalAlpha =
          particleAlpha(dot.age) *
          (dot.retiring === undefined ? 1 : dot.retiring / 2.4);
        context.drawImage(dot.sprite, x - 24, y - 24, 48, 48);
      }
      context.globalAlpha = 1;
    };
    const tick = (now: number) => {
      frame = 0;
      if (control.current.paused || control.current.reduced) {
        last = 0;
        return;
      }
      if (!last) last = now;
      const delta = (now - last) / 1000;
      if (delta >= 1 / budget.fps) {
        const dt = Math.min(delta, 0.1);
        last = now;
        for (let i = particles.length - 1; i >= 0; i--) {
          particles[i].age += dt;
          if (particles[i].retiring !== undefined)
            particles[i].retiring = Math.max(0, particles[i].retiring! - dt);
          if (
            particles[i].age >= preFix.ambient.lifetime ||
            particles[i].retiring === 0
          )
            particles.splice(i, 1);
        }
        emission += dt * budget.spawnPerSecond;
        while (emission >= 1) {
          if (particles.length < budget.count) particles.push(born());
          emission--;
        }
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      draw();
      if (!control.current.reduced && !control.current.paused)
        frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const oldWidth = width;
      width = document.documentElement.clientWidth;
      height = innerHeight;
      budget = ambientBudget(
        width,
        height,
        width < 700 || navigator.hardwareConcurrency <= 4,
      );
      particles.forEach((dot) => {
        dot.x *= width / oldWidth;
      });
      // 画面回転で予算が減っても突然消さず、位置を維持したまま2.4秒で間引く。
      particles.slice(budget.count).forEach((dot) => {
        dot.retiring ??= 2.4;
      });
      const dpr = Math.min(devicePixelRatio || 1, budget.dpr);
      element.width = Math.round(width * dpr);
      element.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resume();
    };
    wake.current = resume;
    resize();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      wake.current = () => {};
    };
  }, []);
  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient-light" />
      <LightVeil reduced={reduced} paused={paused} />
      <canvas ref={canvas} />
    </div>
  );
}
