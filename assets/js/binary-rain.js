// === Typewriter helper (glow "edge") ===
function typeWriter(el, beforeText, edgeWord, { charDelay = 95 } = {}) {
  if (!el) return;
  el.textContent = '';
  el.style.opacity = 1;
  el.classList.add('typing');

  const beforeNode = document.createTextNode('');
  const edgeSpan = document.createElement('span');
  edgeSpan.id = 'edge-word';
  edgeSpan.textContent = '';
  el.appendChild(beforeNode);
  el.appendChild(edgeSpan);

  const totalLen = beforeText.length + edgeWord.length;
  let i = 0;
  const timer = setInterval(() => {
    if (i < beforeText.length) {
      beforeNode.textContent += beforeText.charAt(i);
    } else if (i < totalLen) {
      const idx = i - beforeText.length;
      edgeSpan.textContent += edgeWord.charAt(idx);
      if (idx === edgeWord.length - 1) {
        setTimeout(() => el.classList.remove('typing'), 300);
        edgeSpan.classList.add('edge-glow');
      }
    } else {
      clearInterval(timer);
    }
    i++;
  }, charDelay); // slower typing for phone feel
}

class BinaryRain {
  constructor() {
    this.canvas = document.getElementById('binary-rain');
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');

    // --- Mobile tuning flags ---
    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    this.dprCap   = this.isMobile ? 1.5 : 2;     // cap pixel density
    this.targetFPS = this.isMobile ? 48 : 60;    // cap FPS (smoother on iPhone)
    this.frameInterval = 1000 / this.targetFPS;
    this.lastTime = 0;

    this.drops = [];
    this.animationId = null;
    this.mousePos = { x: 0, y: 0 };
    this.stoppedAtHeadline = false;
    this.binaryChars = ['0', '1'];

    this.headline = document.getElementById('heroHeadline');
    this.edgeEl   = document.getElementById('edge-line');
    this._typedStarted = false;

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.canvas.style.display = 'none';
      return;
    }

    this.setupCanvas();
    this.createDrops();
    this.attachEvents();
    this.updateStopAtHeadline();       // initial rain state
    this.startLoop();                  // start rain
    this.startTypewriter();            // start centered line typing
    this.updateTypeLineVisibility();   // initial visibility vs logo
  }

  setupCanvas() {
    const dprRaw = window.devicePixelRatio || 1;
    const dpr = Math.min(dprRaw, this.dprCap);   // <- cap DPR on mobile
    this.dpr = dpr;

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    // Reset and scale once
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.canvas.width  = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.scale(dpr, dpr);
    this.ctx.textBaseline = 'top';

    // Font/spacing computed once per resize, not every frame
    // Slightly smaller on phones to reduce glyph count per column
    const base = this.isMobile ? 110 : 90; // smaller number -> bigger font
    this.fontSize   = Math.max(14, Math.round(w / base));
    this.lineHeight = Math.round(this.fontSize * 1.33);
    this.ctx.font   = `${this.fontSize}px monospace`;
  }

  attachEvents() {
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.createDrops();
      this.updateStopAtHeadline();
      this.updateTypeLineVisibility();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    }, { passive: true });

    window.addEventListener('scroll', () => {
      this.updateStopAtHeadline();
      this.updateTypeLineVisibility();
    }, { passive: true });
  }

  // Fade the type line as soon as the logo approaches (avoid overlap)
  updateTypeLineVisibility() {
    if (!this.edgeEl) return;
    const wrapper = this.edgeEl.parentElement; // .type-header
    if (!wrapper) return;

    const y = window.pageYOffset;
    const logo = document.getElementById('logo');
    if (!logo) return;

    const rect = logo.getBoundingClientRect();
    const logoTop = rect.top + window.pageYOffset;

    // Fade earlier on phones for extra room
    const TRIGGER = this.isMobile ? 0.85 : 0.75; // % of viewport height
    const triggerY = logoTop - window.innerHeight * TRIGGER - 80; // padding

    wrapper.style.opacity = (y >= triggerY) ? '0' : '1';
  }

  // Keep raining until headline (or first viewport) then stop; resume when above
  updateStopAtHeadline() {
    const y = window.pageYOffset;

    let triggerY;
    if (this.headline) {
      const rect = this.headline.getBoundingClientRect();
      const hTop = rect.top + window.pageYOffset;
      const STOP_AT = 0.50; // mid-viewport
      triggerY = hTop - window.innerHeight * STOP_AT;
    } else {
      triggerY = window.innerHeight;
    }

    if (y >= triggerY && !this.stoppedAtHeadline) {
      this.stoppedAtHeadline = true;
      this.stopLoop();
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
      this.canvas.style.opacity = '0';
    } else if (y < triggerY && this.stoppedAtHeadline) {
      this.stoppedAtHeadline = false;
      this.canvas.style.opacity = '1';
      this.startLoop();
    } else if (!this.stoppedAtHeadline) {
      this.canvas.style.opacity = '1';
    }
  }

  createDrops() {
    this.drops.length = 0;
    const width = this.canvas.clientWidth;
    // Fewer columns/streams on phones
    const baseDensity = this.isMobile ? 42 : 25; // bigger => fewer drops
    const dropCount = Math.max(10, Math.floor(width / baseDensity));
    for (let i = 0; i < dropCount; i++) {
      this.drops.push(this.makeDrop(width, this.canvas.clientHeight));
    }
  }

  makeDrop(width, height) {
    // Shorter streams + slightly slower on phones
    const charCount = this.isMobile
      ? (Math.floor(Math.random() * 8) + 5)    // 5–12
      : (Math.floor(Math.random() * 15) + 5);  // 5–20

    const characters = Array.from({ length: charCount }, () =>
      this.binaryChars[(Math.random() < 0.5) ? 0 : 1]
    );

    return {
      x: Math.random() * width,
      y: Math.random() * -height,
      speed: (this.isMobile ? 0.8 : 1) * (Math.random() * 2 + 1), // 0.8–2.4 on phone
      characters,
      updateFrequency: Math.floor(Math.random() * 10) + 5,
      lastUpdate: 0
    };
  }

  startLoop() {
    if (this.animationId) return;
    const loop = (ts) => {
      if (!this.stoppedAtHeadline) {
        if (ts - this.lastTime >= this.frameInterval) {
          this.lastTime = ts;
          this.animate();
        }
      }
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (!this.animationId) return;
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  startTypewriter() {
    if (this._typedStarted || !this.edgeEl) return;
    this._typedStarted = true;
    const beforeText = "AI isnt your enemy; its your ";
    const edgeWord   = "edge";
    typeWriter(this.edgeEl, beforeText, edgeWord, { charDelay: 95 }); // slower on phone
  }

  animate() {
    const width  = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    // Lighter trail on phones (less overdraw)
    this.ctx.fillStyle = this.isMobile ? 'rgba(0, 0, 0, 0.12)' : 'rgba(0, 0, 0, 0.18)';
    this.ctx.fillRect(0, 0, width, height);

    const spacing = this.lineHeight;
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];

      const dx = this.mousePos.x - drop.x;
      const dy = this.mousePos.y - drop.y;
      const distance = Math.hypot(dx, dy);
      const influenceRadius = this.isMobile ? 120 : 180;

      for (let j = 0; j < drop.characters.length; j++) {
        const y = drop.y - j * spacing;
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

      drop.y += drop.speed;

      if (++drop.lastUpdate > drop.updateFrequency) {
        drop.lastUpdate = 0;
        drop.characters[0] = this.binaryChars[(Math.random() < 0.5) ? 0 : 1];
      }

      if (drop.y - drop.characters.length * spacing > height) {
        this.drops[i] = this.makeDrop(width, height);
      }
    }
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  new BinaryRain();
});
