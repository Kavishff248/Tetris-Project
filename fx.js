
const FX = {
  particles: [],
  overlays: [],
  distortions: [],
  lastTime: 0,
};

class Particle {
  constructor(x, y, vx, vy, life, size, color, type = "generic") {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.life = life; this.maxLife = life;
    this.size = size; this.color = color; this.type = type;
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
  }
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

function fxAddParticle(p) { FX.particles.push(p); }
function fxAddOverlay(fn) { FX.overlays.push(fn); }
function fxAddDistortion(fn) { FX.distortions.push(fn); }

// Clear overlays when switching themes to avoid accumulation
function fxClearOverlays() {
  FX.overlays = [];
  FX.distortions = [];
}

// Update and draw; called from main loop after primary rendering
function fxUpdateAndDraw(ctx, time) {
  const dt = (time - FX.lastTime) / 1000 || 0;
  FX.lastTime = time;

  FX.particles = FX.particles.filter(p => {
    p.update(dt);
    return p.life > 0;
  });

  // Overlays run first (they draw full-screen effects)
  for (const fn of FX.overlays) {
    try { fn(ctx, dt); } catch (e) { console.error("FX overlay error", e); }
  }

  // Particles
  for (const p of FX.particles) {
    p.draw(ctx);
  }

  // Distortions run last and are cleared each frame (they are transient)
  for (const fn of FX.distortions) {
    try { fn(ctx, dt); } catch (e) { console.error("FX distortion error", e); }
  }
  FX.distortions = [];
}

// Expose to window
window.FX = FX;
window.Particle = Particle;
window.fxAddParticle = fxAddParticle;
window.fxAddOverlay = fxAddOverlay;
window.fxAddDistortion = fxAddDistortion;
window.fxUpdateAndDraw = fxUpdateAndDraw;
window.fxClearOverlays = fxClearOverlays;

