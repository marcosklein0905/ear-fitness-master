let confettiCanvas, ctx;

export function startConfetti(duration = 3000, confettiCount = 300) {
  confettiCanvas = document.getElementById('confettiCanvas');

  if (!confettiCanvas) {
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.id = 'confettiCanvas';
    document.body.appendChild(confettiCanvas);
  }

  Object.assign(confettiCanvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    display: 'block',
    margin: '0',
    padding: '0',
    background: 'transparent',
    border: 'none',
    pointerEvents: 'none',
    zIndex: '9999',
  });

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';

  ctx = confettiCanvas.getContext('2d');
  resizeCanvas();

  const audio = new Audio('./audio/cheer.mp3');
  audio.volume = 0.5;
  audio.play().catch(e => console.warn('Audio autoplay blocked:', e));

  const confetti = [];
  for (let i = 0; i < confettiCount; i++) {
    confetti.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * 10 + 10,
      color: `hsl(${Math.random() * 360}, 100%, 50%)`,
      tilt: Math.random() * 10 - 5,
    });
  }

  let angle = 0;
  let animationId;

  function draw() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    angle += 0.01;
    for (let c of confetti) {
      ctx.beginPath();
      ctx.fillStyle = c.color;
      ctx.ellipse(c.x + c.tilt, c.y, c.r, c.r / 2, 0, 0, 2 * Math.PI);
      ctx.fill();
      c.y += Math.cos(angle + c.d) + 1 + c.r / 2;
      c.tilt += Math.sin(angle) * 2;
    }
    animationId = requestAnimationFrame(draw);
  }

  draw();

  setTimeout(() => {
    cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    if (confettiCanvas && confettiCanvas.parentNode) {
      confettiCanvas.parentNode.removeChild(confettiCanvas);
    }
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }, duration);
}

function resizeCanvas() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
