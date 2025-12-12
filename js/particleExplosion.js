let canvas, ctx, particles = [], animationId;

function createCanvas() {
  canvas = document.createElement('canvas');
  canvas.id = 'particleExplosionCanvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
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
  return `hsl(${Math.random() * 360}, 100%, 65%)`;
}

function createExplosion(x, y, count = 40) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 6 + 2;
    particles.push({
      x,
      y,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 2,
      color: randomColor(),
      alpha: 1,
      decay: Math.random() * 0.015 + 0.005
    });
  }

  if (!animationId) {
    animate();
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, index) => {
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.1; // gravity
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(index, 1);
      return;
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${hexToRgb(p.color)}, ${p.alpha})`;
    ctx.fill();
  });

  if (particles.length > 0) {
    animationId = requestAnimationFrame(animate);
  } else {
    cancelAnimationFrame(animationId);
    animationId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function hexToRgb(hslColor) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = hslColor;
  const computed = ctx.fillStyle;
  document.body.appendChild(canvas);
  ctx.fillStyle = computed;
  const rgb = window.getComputedStyle(canvas).color.match(/\d+/g);
  document.body.removeChild(canvas);
  return rgb.join(',');
}

export function explodeAt(x, y) {
  if (!document.getElementById('particleExplosionCanvas')) {
    createCanvas();
  }
  createExplosion(x, y);
  const audio = new Audio('./audio/particles.mp3');
    audio.volume = 0.9;
    audio.play().catch(e => console.log('Sound blocked:', e));

}
