'use client';
import { useEffect, useRef } from 'react';

/**
 * Particle wordmark: particles fly in and assemble into NEXCUST ("NEX" in Deep Forest Green, "CUST" in Muted Gold,
 * as in the logo), scatter away from the pointer and drift back. Solid dots only: no glow, gradient or shadow.
 * Capped particle count and no particle-to-particle work, so it stays smooth on modest phones.
 * With reduced motion requested, the wordmark is drawn assembled and still.
 */
const GREEN = '#174D38', GOLD = '#C5A34A', CANVAS = [250, 250, 247];

function startParticles(canvas: HTMLCanvasElement, opt: { y: number; size: number; max: number }) {
  const ctx = canvas.getContext('2d')!;
  const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true })!;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const MAX = opt.max;
  let W = 0, H = 0, count = 0, t = 0, last = 0, running = true, raf = 0;
  const px = new Float32Array(MAX), py = new Float32Array(MAX), vx = new Float32Array(MAX), vy = new Float32Array(MAX),
    tx = new Float32Array(MAX), ty = new Float32Array(MAX), ph = new Float32Array(MAX), sz = new Float32Array(MAX), gold = new Uint8Array(MAX);
  const mouse = { x: -9999, y: -9999, on: false };
  const dot = (colour: string) => { const s = 16, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d')!; x.fillStyle = colour; x.beginPath(); x.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2); x.fill(); return c; };
  const SPR = [dot(GREEN), dot(GOLD)];

  /** Lit pixels of the word: red channel = NEX, green channel = CUST, so each particle knows its colour. */
  function sample() {
    off.width = W; off.height = H; octx.clearRect(0, 0, W, H);
    const font = (s: number) => `800 ${s}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
    let size = Math.min(H * opt.size, W * 0.3);
    octx.font = font(size);
    const spacing = () => Math.round(size * 0.08);
    const widthOf = (s: string) => octx.measureText(s).width + spacing() * s.length;
    size = Math.min(size, (size * W * 0.86) / Math.max(1, widthOf('NEXCUST')));
    octx.font = font(size);
    try { (octx as unknown as { letterSpacing: string }).letterSpacing = `${spacing()}px`; } catch { /* older browsers */ }
    octx.textBaseline = 'middle'; octx.textAlign = 'left';
    const total = octx.measureText('NEXCUST').width, x0 = (W - total) / 2, yy = H * opt.y;
    octx.fillStyle = '#ff0000'; octx.fillText('NEX', x0, yy);
    octx.fillStyle = '#00ff00'; octx.fillText('CUST', x0 + octx.measureText('NEX').width, yy);
    const data = octx.getImageData(0, 0, W, H).data;
    let lit = 0; for (let i = 3; i < data.length; i += 28) if (data[i] > 128) lit++;
    let step = Math.max(2, Math.ceil(Math.sqrt((lit * 7) / MAX)));
    const pts: number[] = [];
    for (;;) {
      pts.length = 0;
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) { const k = (y * W + x) * 4; if (data[k + 3] > 128) pts.push(x, y, data[k + 1] > data[k] ? 1 : 0); }
      if (pts.length / 3 <= MAX) break; step++;
    }
    return pts;
  }

  function assemble(initial: boolean) {
    const pts = sample(), n = pts.length / 3; if (!n) return;
    const prev = count; count = n;
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; i < n; i++) {
      const k = order[i] * 3; tx[i] = pts[k]; ty[i] = pts[k + 1]; gold[i] = pts[k + 2];
      if (reduce) { px[i] = tx[i]; py[i] = ty[i]; vx[i] = vy[i] = 0; sz[i] = 2.4; continue; }
      if (i >= prev || initial) {
        const a = Math.random() * Math.PI * 2, r = Math.max(W, H) * (0.35 + Math.random() * 0.5);
        px[i] = W / 2 + Math.cos(a) * r; py[i] = H * opt.y + Math.sin(a) * r; vx[i] = vy[i] = 0; ph[i] = Math.random() * 6.283; sz[i] = 2 + Math.random() * 1.4;
      }
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, Math.floor(r.width)); H = Math.max(1, Math.floor(r.height));
    canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    assemble(count === 0);
    if (reduce) draw(1);
  }

  function draw(dt: number) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${CANVAS.join(',')})`; // full repaint each frame: a fading trail leaves ghost marks on a light canvas
    ctx.fillRect(0, 0, W, H);
    const R = Math.max(70, Math.min(W, H) * 0.14), R2 = R * R, spring = 0.02 * dt, damp = Math.pow(0.86, dt), idle = 1.2;
    for (let i = 0; i < count; i++) {
      if (!reduce) {
        const hx = tx[i] + Math.cos(t * 0.9 + ph[i]) * idle, hy = ty[i] + Math.sin(t * 1.1 + ph[i] * 1.7) * idle;
        let ax = (hx - px[i]) * spring, ay = (hy - py[i]) * spring;
        if (mouse.on) { const dx = px[i] - mouse.x, dy = py[i] - mouse.y, d2 = dx * dx + dy * dy; if (d2 < R2) { const d = Math.sqrt(d2) + 0.01, f = 1 - d / R, push = f * f * 5 * dt; ax += (dx / d) * push; ay += (dy / d) * push; } }
        vx[i] = (vx[i] + ax) * damp; vy[i] = (vy[i] + ay) * damp; px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      }
      const s = sz[i];
      ctx.globalAlpha = 0.92; ctx.drawImage(SPR[gold[i]], px[i] - s / 2, py[i] - s / 2, s, s);
    }
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(2.2, (now - last) / 16.667 || 1); last = now; t += 0.016 * dt;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  const point = (e: PointerEvent) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true; };
  const leave = () => { mouse.on = false; };
  const up = (e: PointerEvent) => { if (e.pointerType !== 'mouse') mouse.on = false; };
  let rz: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => { clearTimeout(rz); rz = setTimeout(resize, 120); };
  const onVisible = () => { running = !document.hidden && !reduce; if (running) raf = requestAnimationFrame((n) => { last = n; frame(n); }); };
  window.addEventListener('pointermove', point, { passive: true }); window.addEventListener('pointerdown', point, { passive: true });
  document.addEventListener('pointerleave', leave); window.addEventListener('pointerup', up);
  window.addEventListener('resize', onResize); document.addEventListener('visibilitychange', onVisible);
  ctx.fillStyle = `rgb(${CANVAS.join(',')})`;
  resize();
  if (!reduce) raf = requestAnimationFrame((n) => { last = n; frame(n); });
  return () => {
    running = false; cancelAnimationFrame(raf); clearTimeout(rz);
    window.removeEventListener('pointermove', point); window.removeEventListener('pointerdown', point);
    document.removeEventListener('pointerleave', leave); window.removeEventListener('pointerup', up);
    window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Full-bleed canvas behind a page or a dialog. `y` and `size` are fractions of the canvas height. */
export function ParticleBackdrop({ y = 0.3, size = 0.2, max = 2000, fixed = true }: { y?: number; size?: number; max?: number; fixed?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => (ref.current ? startParticles(ref.current, { y, size, max: Math.min(2600, max) }) : undefined), [y, size, max]);
  return <canvas ref={ref} aria-hidden="true" data-testid="particles" className={`${fixed ? 'fixed' : 'absolute'} inset-0 z-0 h-full w-full`} />;
}
