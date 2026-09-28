import { useEffect, useRef } from "react";
import { sampleAmbientColor } from "../src/visual/ambientColor";
import {
  ambientBudget,
  particleAlpha,
  particleCharacter,
  preFix,
} from "../src/visual/materials";
import { THEME_PROFILES, type ThemeName } from "./theme";

type Point = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  cycle: number;
  color: string;
  rare: boolean;
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function makePoints(mode: Exclude<ThemeName, "plasma">): Point[] {
  const random = seededRandom(mode === "abyss" ? 318 : 1221);
  return Array.from({ length: Number(THEME_PROFILES[mode].particleCount) }, (_, index) => {
    const sizeRoll = random();
    return {
      x: random(),
      y: random(),
      size:
        mode === "abyss"
            ? sizeRoll > 0.91
              ? 6 + random() * 4.5
              : 1.8 + sizeRoll * 3.2
            : sizeRoll > 0.95
              ? 2.1
              : 0.45 + sizeRoll * 1.35,
      speed: 0.5 + random() * 0.9,
      drift: random() * 2 - 1,
      phase: random() * Math.PI * 2,
      cycle: 3.2 + random() * 6.8,
      color:
        mode === "abyss"
            ? "rgb(174 222 255)"
            : index % 11 === 0
              ? "rgb(180 219 255)"
              : "rgb(239 246 255)",
      rare: mode === "night" && index % 29 === 0,
    };
  });
}

type PlasmaParticle = {
  age: number;
  x: number;
  speed: number;
  angle: number;
  sprite: HTMLCanvasElement;
  retiring?: number;
};

/** 本番Ambientと同じ運動式・寿命・描画Budgetを、Playground内の表示領域へ適用する。 */
function PlasmaCanvas({
  running,
  paused,
  reduced,
}: {
  running: boolean;
  paused: boolean;
  reduced: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const control = useRef({ running, paused, reduced });
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    control.current = { running, paused, reduced };
    wake.current();
  }, [paused, reduced, running]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    const sprites = [0, 1, 2].map((index) => {
      const sprite = document.createElement("canvas");
      sprite.width = sprite.height = 96;
      const spriteContext = sprite.getContext("2d")!;
      spriteContext.scale(2, 2);
      spriteContext.shadowColor = "white";
      spriteContext.shadowBlur = particleCharacter.glow * 2;
      spriteContext.fillStyle = "white";
      spriteContext.beginPath();
      spriteContext.arc(
        24,
        24,
        particleCharacter.minSize +
          ((particleCharacter.maxSize - particleCharacter.minSize) * index) / 2,
        0,
        Math.PI * 2,
      );
      spriteContext.fill();
      return sprite;
    });

    let width = Math.max(1, host.getBoundingClientRect().width);
    let height = Math.max(1, host.getBoundingClientRect().height);
    let budget = ambientBudget(
      width,
      height,
      width < 700 || navigator.hardwareConcurrency <= 4,
    );
    let frame = 0;
    let last = 0;
    let emission = 0;

    const coloredSprite = () => {
      const sprite = document.createElement("canvas");
      sprite.width = sprite.height = 96;
      const spriteContext = sprite.getContext("2d")!;
      spriteContext.drawImage(sprites[Math.floor(Math.random() * 3)], 0, 0);
      spriteContext.globalCompositeOperation = "source-in";
      spriteContext.fillStyle = `rgb(${sampleAmbientColor()})`;
      spriteContext.fillRect(0, 0, 96, 96);
      return sprite;
    };

    const born = (age = 0): PlasmaParticle => ({
      age,
      x: Math.random() * width,
      speed: particleCharacter.speed * (0.55 + Math.random() * 0.65),
      angle: (Math.random() * 2 - 1) * particleCharacter.angle,
      sprite: coloredSprite(),
    });

    const particles = Array.from({ length: budget.count }, () =>
      born(Math.random() * preFix.ambient.lifetime),
    );

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        const x =
          particle.x +
          Math.sin(particle.angle) * particle.speed * particle.age;
        const y =
          height + 16 -
          Math.cos(particle.angle) * particle.speed * particle.age;
        context.globalAlpha =
          particleAlpha(particle.age) *
          (particle.retiring === undefined ? 1 : particle.retiring / 2.4);
        context.drawImage(particle.sprite, x - 24, y - 24, 48, 48);
      }
      context.globalAlpha = 1;
    };

    const tick = (now: number) => {
      frame = 0;
      if (
        !control.current.running ||
        control.current.paused ||
        control.current.reduced
      ) {
        last = 0;
        return;
      }
      if (!last) last = now;
      const delta = (now - last) / 1000;
      if (delta >= 1 / budget.fps) {
        const dt = Math.min(delta, 0.1);
        last = now;
        for (let index = particles.length - 1; index >= 0; index--) {
          particles[index].age += dt;
          if (particles[index].retiring !== undefined) {
            particles[index].retiring = Math.max(
              0,
              particles[index].retiring! - dt,
            );
          }
          if (
            particles[index].age >= preFix.ambient.lifetime ||
            particles[index].retiring === 0
          ) {
            particles.splice(index, 1);
          }
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
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      draw();
      if (
        control.current.running &&
        !control.current.reduced &&
        !control.current.paused
      ) {
        frame = requestAnimationFrame(tick);
      }
    };

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      const oldWidth = width;
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      budget = ambientBudget(
        width,
        height,
        width < 700 || navigator.hardwareConcurrency <= 4,
      );
      particles.forEach((particle) => {
        particle.x *= width / oldWidth;
      });
      particles.slice(budget.count).forEach((particle) => {
        particle.retiring ??= 2.4;
      });
      const dpr = Math.min(devicePixelRatio || 1, budget.dpr);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      resume();
    };

    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(host);
    wake.current = resume;
    resize();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      wake.current = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} className="theme-points" aria-hidden="true" />;
}

/** Abyss / Night用の低頻度Canvas。React stateをframeごとに更新しない。 */
function CharacterCanvas({
  mode,
  running,
  paused,
  reduced,
}: {
  mode: Exclude<ThemeName, "plasma">;
  running: boolean;
  paused: boolean;
  reduced: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    const points = makePoints(mode);
    let width = 1;
    let height = 1;
    let frame = 0;
    let lastDraw = 0;
    let elapsed = 0;
    let previous = performance.now();
    const fps = mode === "abyss" ? 24 : 20;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = Math.max(1, bounds.width);
      height = Math.max(1, bounds.height);
      const dpr = Math.min(devicePixelRatio || 1, width < 700 ? 1 : 1.4);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      for (const point of points) {
        let x = point.x * width;
        let y = point.y * height;
        let alpha = 1;
        if (mode === "abyss") {
          const travel = (point.y + (time * point.speed * 5) / (height + 80)) % 1;
          y = height + 30 - travel * (height + 80);
          x += Math.sin(time * 0.34 + point.phase) * point.drift * 15;
          alpha = 0.18 + point.size * 0.055;
        } else {
          const breath = (Math.sin((time / point.cycle) * Math.PI * 2 + point.phase) + 1) / 2;
          const glint = point.rare ? Math.pow(Math.max(0, Math.sin(time * 0.43 + point.phase)), 18) : 0;
          alpha = 0.22 + breath * 0.5 + glint * 0.28;
        }

        if (mode === "abyss") {
          const character = 0.7 + 0.3 * Math.sin(point.phase * 1.7);
          const membraneAlpha = Math.min(0.18, alpha * 0.32 * character);
          context.shadowBlur = 0;
          context.globalAlpha = membraneAlpha;
          context.strokeStyle = "rgb(92 158 205)";
          context.lineWidth = Math.max(0.42, Math.min(0.8, point.size * 0.12));
          context.beginPath();
          context.arc(x, y, point.size, 0, Math.PI * 2);
          context.stroke();

          context.globalAlpha = Math.min(0.42, alpha * (0.82 + character * 0.34));
          context.strokeStyle = "rgb(202 238 255)";
          context.lineWidth = Math.max(0.55, Math.min(1.05, point.size * 0.14));
          context.beginPath();
          context.arc(x, y, point.size, 3.72 + point.phase * 0.025, 4.78 + point.phase * 0.035);
          context.stroke();

          if (point.size > 3.2) {
            context.globalAlpha = Math.min(0.2, alpha * 0.46 * character);
            context.strokeStyle = "rgb(124 190 229)";
            context.lineWidth = 0.55;
            context.beginPath();
            context.arc(x, y, point.size * 0.86, 0.18, 0.82);
            context.stroke();
          }
        } else {
          context.globalAlpha = Math.min(0.94, alpha);
          context.fillStyle = point.color;
          context.shadowColor = point.color;
          context.shadowBlur = point.size * 5;
          context.beginPath();
          context.arc(x, y, point.size, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    };

    const tick = (now: number) => {
      const delta = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      if (!paused && !reduced) elapsed += delta;
      if (now - lastDraw >= 1000 / fps) {
        lastDraw = now;
        draw(elapsed);
      }
      frame = requestAnimationFrame(tick);
    };

    const observer = new ResizeObserver(() => {
      resize();
      draw(elapsed);
    });
    observer.observe(host);
    resize();
    draw(0);
    if (running && !reduced) frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [mode, paused, reduced, running]);

  return <canvas ref={canvasRef} className="theme-points" aria-hidden="true" />;
}

export function AmbientCanvas({
  mode,
  running,
  paused,
  reduced,
}: {
  mode: ThemeName;
  running: boolean;
  paused: boolean;
  reduced: boolean;
}) {
  return mode === "plasma" ? (
    <PlasmaCanvas running={running} paused={paused} reduced={reduced} />
  ) : (
    <CharacterCanvas mode={mode} running={running} paused={paused} reduced={reduced} />
  );
}
