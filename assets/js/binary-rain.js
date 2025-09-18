class BinaryRain {
  constructor() {
    this.canvas = document.getElementById('binary-rain');
    this.ctx = this.canvas.getContext('2d');
    this.drops = [];
    this.animationId = null;
    this.mousePos = { x: 0, y: 0 };
    this.scrollOpacity = 1;
    this.isActive = true;
    
    // Binary characters (only 0 and 1)
    this.binaryChars = ['0', '1'];
    
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    
    this.init();
  }
  
  init() {
    this.setupCanvas();
    this.setupEventListeners();
    this.createDrops();
    this.animate();
  }
  
  setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
  }
  
  setupEventListeners() {
    // Handle resize
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.createDrops();
    });
    
    // Track mouse position
    window.addEventListener('mousemove', (e) => {
      this.mousePos.x = e.clientX;
      this.mousePos.y = e.clientY;
    });
    
    // Handle scroll for opacity fade
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;
      
      if (scrollY >= viewportHeight) {
        // Stop and clear after 100vh scroll
        this.isActive = false;
        this.canvas.style.opacity = '0';
        if (this.animationId) {
          cancelAnimationFrame(this.animationId);
          this.animationId = null;
        }
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      } else {
        // Fade opacity during first 100vh
        this.scrollOpacity = 1 - (scrollY / viewportHeight);
        this.canvas.style.opacity = this.scrollOpacity.toString();
        
        // Restart animation if it was stopped
        if (!this.animationId && this.isActive) {
          this.animate();
        }
      }
    });
  }
  
  createDrops() {
    this.drops = [];
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    const dropCount = Math.floor(width / 25); // Adjust density
    
    for (let i = 0; i < dropCount; i++) {
      this.drops.push(this.createDrop(width, height));
    }
  }
  
  createDrop(width, height) {
    const charCount = Math.floor(Math.random() * 15) + 5; // 5-20 characters
    const characters = [];
    
    for (let i = 0; i < charCount; i++) {
      const randomIndex = Math.floor(Math.random() * this.binaryChars.length);
      characters.push(this.binaryChars[randomIndex]);
    }
    
    return {
      x: Math.random() * width,
      y: Math.random() * -height, // Start above screen
      speed: Math.random() * 2 + 1, // Random speed 0.3-1.1
      characters,
      updateFrequency: Math.floor(Math.random() * 10) + 5,
      lastUpdate: 0
    };
  }
  
  animate() {
    if (!this.isActive) return;
    
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    
    // Semi-transparent black background for trail effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(0, 0, width, height);
    
    // Update and draw each drop
    this.drops.forEach((drop, index) => {
      // Calculate distance from mouse
      const dx = this.mousePos.x - drop.x;
      const dy = this.mousePos.y - drop.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const influenceRadius = 180;
      
      // Draw each character in the drop
      drop.characters.forEach((char, charIndex) => {
        const y = drop.y - charIndex * 24; // Character spacing
        
        if (y < height && y > 0) {
          // Color based on mouse proximity
          if (distance < influenceRadius) {
            const intensity = 1 - distance / influenceRadius;
            const r = Math.floor(120 * intensity);
            const g = Math.floor(220 * intensity);
            const b = Math.floor(255 * intensity);
            this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          } else {
            // Default with trail fade
            const opacity = charIndex === 0 ? 1 : 1 - charIndex / drop.characters.length;
            this.ctx.fillStyle = `rgba(180, 180, 180, ${opacity})`;
          }
          
          // Draw character
          this.ctx.font = '18px monospace';
          this.ctx.fillText(char, drop.x, y);
        }
      });
      
      // Update drop position
      drop.y += drop.speed;
      drop.lastUpdate++;
      
      // Randomly change first character
      if (drop.lastUpdate > drop.updateFrequency) {
        drop.lastUpdate = 0;
        const randomIndex = Math.floor(Math.random() * this.binaryChars.length);
        drop.characters[0] = this.binaryChars[randomIndex];
      }
      
      // Reset drop when off screen
      if (drop.y - drop.characters.length * 24 > height) {
        this.drops[index] = this.createDrop(width, height);
      }
    });
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  new BinaryRain();
});
