// === Typewriter helper ===
function typeWriter(el, text, {
  charDelay = 38,
  startDelay = 80,   // starts almost immediately with the rain
  showCursor = true
} = {}) {
  if (!el) return;
  let i = 0;
  const write = () => {
    el.style.opacity = 1;
    if (showCursor) el.classList.add('typing');
    const timer = setInterval(() => {
      el.textContent += text.charAt(i);
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        if (showCursor) setTimeout(() => el.classList.remove('typing'), 250);
      }
    }, charDelay);
  };
  setTimeout(write, startDelay);
}


class BinaryRain {
  constructor() {
    this.canvas = document.getElementById('binary-rain');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.drops = [];
    this.animationId = null;
    this.mousePos = { x: 0, y: 0 };
    this.running = true;          // loop running
    this.stoppedAtHeadline = false;
    this.binaryChars = ['0', '1'];
    this.headline = document.getElementById('heroHeadline');
    this.edgeEl = document.getElementById('edge-line');
    this._typedStarted = false;


    
    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.canvas.style.display = 'none';
      return;
    }

    this.setupCanvas();
    this.createDrops();
    this.attachEvents();
    this.updateStopAtHeadline();  // set initial state based on current scroll
    this.startLoop();
    this.startTypewriter();
  }

  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Reset transform before resizing to avoid compounded scales
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
      this.updateStopAtHeadline();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    }, { passive: true });

    window.addEventListener('scroll', () => this.updateStopAtHeadline(), { passive: true });
  }

  // === Keep raining until headline, then stop instantly ===
  updateStopAtHeadline() {
    const y = window.pageYOffset;

    // Where to stop: when the top of the H1 reaches ~mid viewport
    let triggerY;
    if (this.headline) {
      const rect = this.headline.getBoundingClientRect();
      const hTop = rect.top + window.pageYOffset;
      const STOP_AT = 0.50; // 0.50 = mid-viewport; tweak to taste (e.g., 0.60)
      triggerY = hTop - window.innerHeight * STOP_AT;
    } else {
      // Fallback if H1 missing: after first viewport
      triggerY = window.innerHeight;
    }

    if (y >= triggerY && !this.stoppedAtHeadline) {
      // Stop & clear immediately
      this.stoppedAtHeadline = true;
      this.stopLoop();
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
      this.canvas.style.opacity = '0'; // hide canvas so the page is clean
    } else if (y < triggerY && this.stoppedAtHeadline) {
      // Scrolled back above: resume rain at full opacity
      this.stoppedAtHeadline = false;
      this.canvas.style.opacity = '1';
      this.startLoop();
    } else if (!this.stoppedAtHeadline) {
      // Ensure visible while before trigger
      this.canvas.style.opacity = '1';
    }
  }

  createDrops() {
    this.drops.length = 0;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const density = 25; // lower = denser
    const dropCount = Math.max(12, Math.floor(width / density));

    for (let i = 0; i < dropCount; i++) {
      this.drops.push(this.makeDrop(width, height));
    }
  }

  makeDrop(width, height) {
    const charCount = Math.floor(Math.random() * 15) + 5; // 5–20
    const characters = Array.from({ length: charCount }, () =>
      this.binaryChars[(Math.random() < 0.5) ? 0 : 1]
    );

    return {
      x: Math.random() * width,
      y: Math.random() * -height,     // start above the screen
      speed: Math.random() * 2 + 1,   // 1–3 px/frame (increase both numbers for faster)
      characters,
      updateFrequency: Math.floor(Math.random() * 10) + 5,
      lastUpdate: 0
    };
  }

  startLoop() {
    if (this.animationId) return;
    const loop = () => {
      if (!this.stoppedAtHeadline) this.animate();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  startTypewriter(){
  if (this._typedStarted) return;
  if (!this.edgeEl) return;
  this._typedStarted = true;

  // Use straight apostrophes for absolute UTF-8 safety across devices
  const message = "AI isnt your enemy; its your edge";

  typeWriter(this.edgeEl, message, {
    charDelay: 36,
    startDelay: 120,   // tiny offset so it feels synced with first frame
    showCursor: true
  });
}

  
  stopLoop() {
    if (!this.animationId) return;
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  animate() {
    const width  = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Trail effect (slightly lighter for readability over hero)
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

      // Change leading char occasionally
      if (++drop.lastUpdate > drop.updateFrequency) {
        drop.lastUpdate = 0;
        drop.characters[0] = this.binaryChars[(Math.random() < 0.5) ? 0 : 1];
      }

      // Reset when fully off-screen
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
