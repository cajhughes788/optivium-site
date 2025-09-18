class BinaryRain {
  constructor() {
    this.canvas = document.getElementById('binary-rain');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.drops = [];
    this.animationId = null;
    this.mousePos = { x: 0, y: 0 };
    this.running = true;              // animation state
    this.binaryChars = ['0', '1'];
    this.headline = document.getElementById('heroHeadline');

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.canvas.style.display = 'none';
      return;
    }

    this.setupCanvas();
    this.createDrops();
    this.attachEvents();
    this.startLoop();
    this.updateFade(); // initialize opacity based on current scroll
  }

  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Reset transform before resizing (avoids compounded scales)
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.scale(dpr, dpr);

    this.ctx.textBaseline = 'top';
  }

  attachEvents() {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.createDrops();
      this.updateFade();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    }, { passive: true });

    window.addEventListener('scroll', () => this.updateFade(), { passive: true });
  }

  updateFade() {
    // Fade only when the headline is reached
    let fadeStart, fadeEnd;

    if (this.headline) {
      const rect = this.headline.getBoundingClientRect();
      const hTop = rect.top + window.pageYOffset;
      fadeStart = hTop - window.innerHeight * 0.5; // start a bit before H1 hits mid-viewport
      fadeEnd   = fadeStart + window.innerHeight * 0.9;
    } else {
      // Fallback: fade after first viewport
      fadeStart = window.innerHeight * 0.8;
      fadeEnd   = fadeStart + window.innerHeight * 0.9;
    }

    const y = window.pageYOffset;
    const t = Math.min(Math.max((y - fadeStart) / (fadeEnd - fadeStart), 0), 1);
    const opacity = 1 - t;
    this.canvas.style.opacity = opacity.toFixed(3);

    if (t >= 1 && this.running) {
      this.running = false;
      this.stopLoop();
      // Clear once at device pixels
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    } else if (t < 1 && !this.running) {
      this.running = true;
      this.startLoop();
    }
  }

  createDrops() {
    this.drops.length = 0;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const density = 25; // lower = denser
    const dropCount = Math.max(10, Math.floor(width / density));

    for (let i = 0; i < dropCount; i++) {
      this.drops.push(this.makeDrop(width, height));
    }
  }

  makeDrop(width, height) {
    const charCount = Math.floor(Math.random() * 15) + 5; // 5–20
    const characters = Array.from({ length: charCount }, () =>
      this.binaryChars[Math.random() < 0.5 ? 0 : 1]
    );

    return {
      x: Math.random() * width,
      y: Math.random() * -height,     // start above the screen
      speed: Math.random() * 2 + 1,   // 1–3 px/frame → faster
      characters,
      updateFrequency: Math.floor(Math.random() * 10) + 5,
      lastUpdate: 0
    };
  }

  startLoop() {
    if (this.animationId) return;
    const loop = () => {
      this.animate();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (!this.animationId) return;
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  animate() {
    if (!this.running) return;

    const width  = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Trail effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    this.ctx.fillRect(0, 0, width, height);
    this.ctx.font = '18px monospace';

    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];

      // Mouse proximity glow
      const dx = this.mousePos.x - drop.x;
      const dy = this.mousePos.y - drop.y;
      const distance = Math.hypot(dx, dy);
      const influenceRadius = 180;

      for (let j = 0; j < drop.characters.length; j++) {
        const y = drop.y - j * 24; // char spacing
        if (y < 0 || y > height) continue;

        if (distance < influenceRadius) {
          const intensity = 1 - distance / influenceRadius;
          const r = Math.floor(120 * intensity);
          const g = Math.floor(220 * intensity);
          const b = Math.floor(255 * intensity);
          this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else {
          const alpha = j === 0 ? 1 : 1 - j / drop.characters.length;
          this.ctx.fillStyle = `rgba(180, 180, 180, ${alpha})`;
        }

        this.ctx.fillText(drop.characters[j], drop.x, y);
      }

      // Move drop
      drop.y += drop.speed;

      // Randomly change leading char
      if (++drop.lastUpdate > drop.updateFrequency) {
        drop.lastUpdate = 0;
        drop.characters[0] = this.binaryChars[Math.random() < 0.5 ? 0 : 1];
      }

      // Reset when fully past bottom
      if (drop.y - drop.characters.length * 24 > height) {
        this.drops[i] = this.makeDrop(width, height);
      }
    }
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new BinaryRain();
});
