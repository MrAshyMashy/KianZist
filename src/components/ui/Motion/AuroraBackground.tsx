"use client";

import { useEffect, useRef, useState } from "react";

/**
 * AuroraBackground v4 — Silk Ribbons
 *
 * What changed vs v3:
 *  - Waves: three layered sine ribbons (soft core + wide halo) instead of blocky
 *    value-noise blobs. Result: continuous, silky bands that flow across the page.
 *  - No dark "holes": a faint ambient veil fills the gaps between ribbons and the
 *    output alpha is soft-compressed (no hard clamp), so there is no black hollow.
 *  - Much cheaper: ZERO noise/hash/texture lookups, only a handful of sin/exp per pixel.
 *  - Static uniforms are uploaded once; only time/dark/mouse change per frame.
 *  - Adaptive resolution: if the device cannot hold its frame budget, the render
 *    scale is lowered automatically (the browser upscales the canvas for free).
 *  - Spring physics only runs while it is still moving; delta-time based motion.
 *  - Pauses when the tab is hidden; reduced-motion = one still frame.
 *
 * Theme: follows the `.dark` class on <html> (next-themes) and cross-fades.
 */

/** Tweak to taste. */
const SPEED = 1.0; // flow speed (lower = calmer)
const GLOW = 1.0; // overall brightness multiplier
const JELLY = 1.0; // 0 = no elastic motion, 1.5 = bouncier

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform float uDark;   // 0 = light, 1 = dark
uniform vec2  uMouse;  // spring-smoothed pointer ~0..1
uniform float uGlow;
uniform float uJelly;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// One silky ribbon: soft bright core + very wide halo (halo removes dark gaps).
float ribbon(float x, float y, float base, float amp, float fr, float ph, float sharp, float t){
  float c = base
          + amp        * sin(x * fr        + t * 0.55 + ph)
          + amp * 0.50 * sin(x * fr * 2.13 - t * 0.42 + ph * 1.7)
          + amp * 0.22 * sin(x * fr * 3.70 + t * 0.30 + ph * 2.3);
  float d = y - c;
  float dd = d * d;
  return exp(-dd * sharp) + 0.42 * exp(-dd * sharp * 0.16);
}

void main(){
  vec2 uv  = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p   = (uv - 0.5) * vec2(asp, 1.0);
  float t  = uTime;

  // Wave phase uses uv.x so the wave shape looks the same on any aspect ratio.
  float x = uv.x * 3.2;

  // Pointer pull (already spring-smoothed on CPU => jelly overshoot).
  vec2 mo = (uMouse - 0.5) * uJelly;

  // Elastic wobble that gives the ribbons a soft body.
  float wob = 0.020 * uJelly * sin(uv.x * 4.0 + t * 0.9);

  // Diagonal tilt so ribbons sweep corner to corner.
  float tilt = (uv.x - 0.5) * 0.30;
  float y = p.y - tilt + wob;

  float s1 = ribbon(x + mo.x * 0.9, y - mo.y * 0.10,  0.20, 0.085, 1.00, 0.0, 26.0, t);
  float s2 = ribbon(x - mo.x * 0.6, y + mo.y * 0.08, -0.04, 0.070, 1.30, 2.1, 30.0, t * 0.85);
  float s3 = ribbon(x + mo.x * 0.4, y - mo.y * 0.06, -0.30, 0.080, 0.85, 4.2, 24.0, t * 1.10);

  // Slow shimmer along each ribbon (filament feel without any noise sample).
  float sh1 = 0.78 + 0.22 * sin(x * 2.6 + t * 0.50);
  float sh2 = 0.78 + 0.22 * sin(x * 2.2 - t * 0.43 + 1.7);
  float sh3 = 0.78 + 0.22 * sin(x * 3.0 + t * 0.37 + 3.1);
  s1 *= sh1; s2 *= sh2; s3 *= sh3;

  // Palette (muted, no neon).
  vec3 emerald = mix(vec3(0.12, 0.62, 0.52), vec3(0.08, 0.66, 0.54), uDark);
  vec3 teal    = mix(vec3(0.10, 0.52, 0.64), vec3(0.08, 0.52, 0.66), uDark);
  vec3 azure   = mix(vec3(0.26, 0.46, 0.88), vec3(0.18, 0.44, 0.92), uDark);
  vec3 indigo  = mix(vec3(0.44, 0.42, 0.78), vec3(0.32, 0.32, 0.74), uDark);

  float k = uv.x;
  vec3 c1 = mix(emerald, teal,   smoothstep(0.05, 0.95, k));
  vec3 c2 = mix(teal,    azure,  smoothstep(0.00, 1.00, k));
  vec3 c3 = mix(azure,   indigo, smoothstep(0.10, 0.90, 1.0 - k));

  float breathe = 1.0 + 0.05 * sin(t * 0.33);
  float I = mix(0.17, 0.20, uDark) * uGlow * breathe;

  float a1 = s1 * I;
  float a2 = s2 * I * 0.92;
  float a3 = s3 * I * 0.85;

  // Ambient veil: fills the gaps so there are no black hollow areas.
  vec3  veilCol = mix(emerald, azure, uv.x * 0.8 + uv.y * 0.2);
  float veilA   = mix(0.030, 0.045, uDark) * uGlow * (0.65 + 0.35 * (1.0 - uv.y));

  // Keep the centre calmer so content stays crisp.
  float calm = 1.0 - 0.28 * exp(-dot(p, p) * 3.0);

  vec3  rgb = (c1 * a1 + c2 * a2 + c3 * a3 + veilCol * veilA) * calm;
  float aRaw = (a1 + a2 + a3 + veilA) * calm;

  // Soft compression instead of a hard clamp: no flat/dead patches.
  float cap = mix(0.26, 0.32, uDark);
  float a = cap * (1.0 - exp(-aRaw / cap));
  rgb *= a / max(aRaw, 1e-4);

  // Tiny dither to prevent banding in very soft gradients.
  float g = (hash(gl_FragCoord.xy) - 0.5) * (1.6 / 255.0);
  rgb += g * a;
  a   += g * a;

  gl_FragColor = vec4(rgb, a); // premultiplied alpha
}
`;

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function getRenderProfile() {
  const nav = navigator as NavigatorWithHints;
  const cores = nav.hardwareConcurrency || 6;
  const memory = nav.deviceMemory;
  const saveData = nav.connection?.saveData === true;
  const lowPower =
    saveData || cores <= 4 || (typeof memory === "number" && memory <= 4);

  return {
    baseScale: lowPower ? 0.3 : 0.38,
    pixelBudget: lowPower ? 200_000 : 320_000,
    frameInterval: lowPower ? 1000 / 30 : 1000 / 60,
  };
}

export const AuroraBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: "low-power",
        failIfMajorPerformanceCaveat: true,
        preserveDrawingBuffer: false,
      });
    } catch {
      setFallback(true);
      return;
    }
    if (!gl) {
      setFallback(true);
      return;
    }
    const ctx = gl;

    const compile = (type: number, src: string) => {
      const s = ctx.createShader(type);
      if (!s) return null;
      ctx.shaderSource(s, src);
      ctx.compileShader(s);
      if (!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)) {
        ctx.deleteShader(s);
        return null;
      }
      return s;
    };

    const vs = compile(ctx.VERTEX_SHADER, VERT);
    const fs = compile(ctx.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      if (vs) ctx.deleteShader(vs);
      if (fs) ctx.deleteShader(fs);
      setFallback(true);
      return;
    }

    const prog = ctx.createProgram();
    if (!prog) {
      ctx.deleteShader(vs);
      ctx.deleteShader(fs);
      setFallback(true);
      return;
    }
    ctx.attachShader(prog, vs);
    ctx.attachShader(prog, fs);
    ctx.linkProgram(prog);
    ctx.deleteShader(vs);
    ctx.deleteShader(fs);
    if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) {
      ctx.deleteProgram(prog);
      setFallback(true);
      return;
    }
    ctx.useProgram(prog);

    // One oversized triangle covers the screen with a single draw call.
    const buf = ctx.createBuffer();
    if (!buf) {
      ctx.deleteProgram(prog);
      setFallback(true);
      return;
    }
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(
      ctx.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      ctx.STATIC_DRAW,
    );
    const loc = ctx.getAttribLocation(prog, "aPos");
    ctx.enableVertexAttribArray(loc);
    ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    ctx.disable(ctx.DEPTH_TEST);
    ctx.disable(ctx.BLEND);

    const uRes = ctx.getUniformLocation(prog, "uRes");
    const uTime = ctx.getUniformLocation(prog, "uTime");
    const uDark = ctx.getUniformLocation(prog, "uDark");
    const uMouse = ctx.getUniformLocation(prog, "uMouse");
    const uGlow = ctx.getUniformLocation(prog, "uGlow");
    const uJelly = ctx.getUniformLocation(prog, "uJelly");
    // Static uniforms: uploaded once.
    ctx.uniform1f(uGlow, GLOW);
    ctx.uniform1f(uJelly, JELLY);

    const profile = getRenderProfile();
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = reduceQuery.matches;
    const root = document.documentElement;
    const isDark = () => (root.classList.contains("dark") ? 1 : 0);

    let darkTarget = isDark();
    let darkCur = darkTarget;

    // Under-damped spring for the pointer: soft overshoot, then settle (jelly).
    let tx = 0.5,
      ty = 0.5;
    let sx = 0.5,
      sy = 0.5;
    let vx = 0,
      vy = 0;
    const STIFFNESS = 16;
    const DAMPING = 4.6;

    let elapsed = 40;
    let raf = 0;
    let lastNow = 0;
    let lastDraw = 0;
    let disposed = false;
    let rafResize = 0;

    // Adaptive quality: lower resolution if frames can't keep up.
    let scaleMul = 1;
    let perfSum = 0;
    let perfCount = 0;

    const resize = () => {
      const width = Math.max(2, window.innerWidth);
      const height = Math.max(2, window.innerHeight);
      const scale =
        Math.min(
          profile.baseScale,
          Math.sqrt(profile.pixelBudget / (width * height)),
        ) * scaleMul;
      const w = Math.max(2, Math.floor(width * scale));
      const h = Math.max(2, Math.floor(height * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        ctx.viewport(0, 0, w, h);
        ctx.uniform2f(uRes, w, h);
      }
    };

    const draw = () => {
      ctx.uniform1f(uTime, elapsed);
      ctx.uniform1f(uDark, darkCur);
      ctx.uniform2f(uMouse, sx, sy);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(frame);
      if (lastDraw && now - lastDraw < profile.frameInterval - 2) return;

      const rawDelta = lastNow ? now - lastNow : 0;
      const dt = Math.min(rawDelta / 1000, 0.05);
      lastNow = now;
      lastDraw = now;
      elapsed += dt * SPEED;

      // Spring: integrate only while it is actually moving.
      const ex = tx - sx;
      const ey = ty - sy;
      if (
        Math.abs(ex) > 1e-4 ||
        Math.abs(ey) > 1e-4 ||
        Math.abs(vx) > 1e-4 ||
        Math.abs(vy) > 1e-4
      ) {
        vx += (ex * STIFFNESS - vx * DAMPING) * dt;
        vy += (ey * STIFFNESS - vy * DAMPING) * dt;
        sx += vx * dt;
        sy += vy * dt;
      }

      darkCur += (darkTarget - darkCur) * (1 - Math.exp(-dt * 4.2));
      draw();

      // Adaptive resolution (only ever steps down, min 55%).
      if (rawDelta > 0 && rawDelta < 250) {
        perfSum += rawDelta;
        perfCount++;
        if (perfCount >= 90) {
          const avg = perfSum / perfCount;
          perfSum = 0;
          perfCount = 0;
          if (avg > profile.frameInterval * 1.45 && scaleMul > 0.56) {
            scaleMul *= 0.85;
            resize();
          }
        }
      }
    };

    const start = () => {
      if (reduce || raf || disposed || document.hidden) return;
      lastNow = 0;
      lastDraw = 0;
      perfSum = 0;
      perfCount = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const onResize = () => {
      if (rafResize) return;
      rafResize = requestAnimationFrame(() => {
        rafResize = 0;
        resize();
        draw();
      });
    };
    const onPointer = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth;
      ty = 1 - e.clientY / window.innerHeight;
    };
    const onReduceChange = (e: MediaQueryListEvent) => {
      reduce = e.matches;
      if (reduce) {
        stop();
        darkCur = darkTarget;
        draw();
      } else {
        start();
      }
    };
    const mo = new MutationObserver(() => {
      darkTarget = isDark();
      if (reduce) {
        darkCur = darkTarget;
        draw();
      }
    });
    mo.observe(root, { attributes: true, attributeFilter: ["class"] });

    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
      setFallback(true);
    };

    canvas.addEventListener("webglcontextlost", onLost);
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    reduceQuery.addEventListener("change", onReduceChange);

    resize();
    draw();
    setReady(true);
    start();

    return () => {
      disposed = true;
      stop();
      if (rafResize) cancelAnimationFrame(rafResize);
      mo.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      reduceQuery.removeEventListener("change", onReduceChange);
      if (!ctx.isContextLost()) {
        ctx.deleteBuffer(buf);
        ctx.deleteProgram(prog);
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {fallback ? (
        <>
          <style
            dangerouslySetInnerHTML={{
              __html: `
.kz-aurora-fb{position:absolute;inset:0;
  background:
   radial-gradient(70% 60% at 85% 10%, rgb(20 150 120 / .12), transparent 72%),
   radial-gradient(70% 60% at 10% 95%, rgb(50 110 220 / .12), transparent 72%),
   linear-gradient(135deg, rgb(20 150 120 / .03), rgb(50 110 220 / .03));}
.dark .kz-aurora-fb{
  background:
   radial-gradient(70% 60% at 85% 10%, rgb(10 140 110 / .10), transparent 72%),
   radial-gradient(70% 60% at 10% 95%, rgb(20 95 210 / .10), transparent 72%),
   linear-gradient(135deg, rgb(10 140 110 / .04), rgb(20 95 210 / .04));}`,
            }}
          />
          <div className="kz-aurora-fb" />
        </>
      ) : (
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 2000ms ease-out",
          }}
        />
      )}
    </div>
  );
};
