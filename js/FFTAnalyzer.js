export function createFFTAnalyzer({ canvas, audioContext, analyserNode, compressLowCheckbox }) {
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight || 300;
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    drawTicks();
  });

  resizeCanvas();

  const tooltip = document.createElement('div');
  tooltip.style.position = 'absolute';
  tooltip.style.padding = '4px 8px';
  tooltip.style.background = '#222';
  tooltip.style.color = '#fff';
  tooltip.style.border = '1px solid #888';
  tooltip.style.fontSize = '12px';
  tooltip.style.borderRadius = '4px';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.display = 'none';
  document.body.appendChild(tooltip);

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const compress = compressLowCheckbox && compressLowCheckbox.checked;

    let xRatio = x / canvas.width;
    if (compress) {
      const full = Math.log10(audioContext.sampleRate / 2) - Math.log10(20);
      xRatio = xRatio > 0.5 ? 0.5 + (xRatio - 0.5) * 2 : xRatio * 2;
      xRatio = xRatio * full;
    } else {
      xRatio = xRatio * (Math.log10(audioContext.sampleRate / 2) - Math.log10(20));
    }

    const freq = Math.pow(10, xRatio + Math.log10(20));
    tooltip.style.left = `${e.pageX + 10}px`;
    tooltip.style.top = `${e.pageY + 10}px`;
    tooltip.style.display = 'block';
    tooltip.textContent = `${Math.round(freq)} Hz`;
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  const analyser = audioContext.createAnalyser();
  analyserNode.connect(analyser);
  analyser.fftSize = 8192;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  let animationFrameId;

  function draw() {
    animationFrameId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const logMin = Math.log10(20);
    const logMax = Math.log10(audioContext.sampleRate / 2);

    for (let i = 1; i < bufferLength; i++) {
      const value = dataArray[i];
      const percent = value / 255;
      const height = canvas.height * percent;
      const y = canvas.height - height;

      const freq = i * audioContext.sampleRate / analyser.fftSize;
      let logX = (Math.log10(freq) - logMin) / (logMax - logMin);

      if (compressLowCheckbox && compressLowCheckbox.checked && freq < 125) {
        logX *= 0.5;
      }

      const x = logX * canvas.width;

      ctx.fillStyle = 'lime';
      ctx.fillRect(x, y, 2, height);
    }

    drawTicks();
  }

  function drawTicks() {
    const freqs = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    ctx.strokeStyle = '#333';
    ctx.fillStyle = '#888';
    ctx.font = '10px sans-serif';

    freqs.forEach(freq => {
      let x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(audioContext.sampleRate / 2) - Math.log10(20));
      if (compressLowCheckbox && compressLowCheckbox.checked && freq < 125) x *= 0.5;
      x *= canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
      ctx.fillText(`${freq} Hz`, x + 2, 10);
    });
  }

  draw();

  return {
    node: analyser,
    stop: () => cancelAnimationFrame(animationFrameId)
  };
}

export function preloadFFTGrid(canvas, sampleRate = 44100, compressLowCheckbox = null) {
  const ctx = canvas.getContext('2d');
  canvas.style.width = '90%';
  canvas.style.height = 'auto';
  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight || 400;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const freqs = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  ctx.strokeStyle = '#333';
  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';

  freqs.forEach(freq => {
    let x = (Math.log10(freq) - Math.log10(20)) / (Math.log10(sampleRate / 2) - Math.log10(20));
    if (compressLowCheckbox && compressLowCheckbox.checked && freq < 125) x *= 0.5;
    x *= canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.fillText(`${freq} Hz`, x + 2, 10);
  });
}