let canvas, ctx, particles = [], animationId;

function createCanvas() {
  canvas = document.createElement('canvas');
  canvas.id = 'fireworksCanvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '9999';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function randomColor() {
  return `hsl(${Math.random() * 360}, 100%, 70%)`;
}

function createBurst(x, y) {
  const burst = 30;
  for (let i = 0; i < burst; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 5 + 2;
    particles.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 2,
      color: randomColor(),
      life: 60
    });
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, i) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.05; // gravity
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  });
  animationId = requestAnimationFrame(animate);
}

export function showFireworks({ duration = 3000, bursts = 5 } = {}) {
  if (!document.getElementById('fireworksCanvas')) {
    createCanvas();
  }

    // 🔊 Play celebration sound once per full fireworks session
    const audio = new Audio('./audio/fireworks.mp3');
    audio.volume = 0.8;
    audio.play().catch(e => {
      console.log('Audio autoplay was blocked:', e);
    });

  for (let i = 0; i < bursts; i++) {
    setTimeout(() => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height * 0.6;
      createBurst(x, y);
    }, i * 400);
  }

  animate();

  setTimeout(() => {
    cancelAnimationFrame(animationId);
    particles = [];
    if (canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      document.body.removeChild(canvas);
    }
  }, duration);
}
