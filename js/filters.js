import { createFFTAnalyzer, preloadFFTGrid } from './FFTAnalyzer.js';

const audioFiles = ['Donald Fagen - The NightFly.mp3', 'Sam Gellaitry - Dreamscapes.mp3', 'Pink_Noise.mp3', 'Clean Gtr.wav', 'Overdrive_Gtr.wav', 'Metal_Gtr.wav', 'Funk_Gtr.wav', 'Amped_Bass.wav', 'Bass_DI.wav', 'Female_Voice.mp3'];
let context, source, fixedGainNode, gainNode, filters = [], startTime = 0, pauseTime = 0, buffer, isPlaying = false, uploadedBuffer = null;

let fftAnalyzerInstance;

const feedbackDiv = document.getElementById('feedback');

window.onload = () => {
  const audioSelect = document.getElementById('audioSelect');
  const resolutionSelect = document.getElementById('resolution');
  const playBtn = document.getElementById('playBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const fileUpload = document.getElementById('fileUpload');

  // FFT STUFF ====

  const canvas = document.getElementById('fftCanvas');
  const compressCheckbox = document.getElementById('compressLow');
  preloadFFTGrid(canvas, 44100, compressCheckbox);

  // FFT STUFF ====

  createSliders();

  audioFiles.forEach(file => {
    const option = document.createElement('option');
    option.value = file;
    option.textContent = file;
    audioSelect.appendChild(option);
  });

  resolutionSelect.onchange = () => {
    createSliders();
    if (isPlaying) {
      source.disconnect();
      connectFilters();
    }
  };

  playBtn.onclick = () => {
    if (!isPlaying) startAudio();
  };

  pauseBtn.onclick = () => pauseAudio();

  audioSelect.onchange = () => {
    if (isPlaying) {
      pauseAudio(); // stop current playback safely
    }
    uploadedBuffer = null;  // clear uploaded buffer
    buffer = null;          // clear existing buffer
    pauseTime = 0;
  };
  
  fileUpload.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
    uploadedBuffer = await context.decodeAudioData(arrayBuffer);
  
    if (isPlaying) pauseAudio();
    buffer = null;
    pauseTime = 0;
  
    document.getElementById('audioSelect').value = ''; // clear static selection
  };

};

async function loadAudio(file) {
  const response = await fetch(`../audio/${file}`);
  const arrayBuffer = await response.arrayBuffer();
  return await context.decodeAudioData(arrayBuffer);
}

async function startAudio() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();

  if (uploadedBuffer) {
    buffer = uploadedBuffer;
  } else if (!buffer) {
    const selectedFile = document.getElementById('audioSelect').value;
    buffer = await loadAudio(selectedFile);
  }

  source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  fixedGainNode = context.createGain();
  fixedGainNode.gain.value = 0.25; // ~-12 dB pad

  gainNode = context.createGain();

  connectFilters();

  source.start(0, pauseTime);
  startTime = context.currentTime - pauseTime;
  isPlaying = true;
}

function pauseAudio() {
  if (source) {
    source.stop();
    pauseTime = context.currentTime - startTime;
    isPlaying = false;
    feedbackDiv.textContent = 'Adjusting:';
  }
}

function connectFilters() {
  filters = [];

  const resolution = document.getElementById('resolution').value;
  const frequencies = resolution === 'octave'
    ? [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    : [63, 80, 100, 125, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000];

  filters = frequencies.map(freq => {
    const filter = context.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = freq;
    filter.gain.value = 0;
    return filter;
  });

  source.connect(filters[0]);
  for (let i = 0; i < filters.length - 1; i++) {
    filters[i].connect(filters[i + 1]);
  }

  filters[filters.length - 1].connect(gainNode);

  // CREATE FFT
  const canvas = document.getElementById('fftCanvas');
  const compressLowCheckbox = document.getElementById('compressLow');

  if (fftAnalyzerInstance) {
    fftAnalyzerInstance.stop();
  }

  fftAnalyzerInstance = createFFTAnalyzer({
    canvas,
    audioContext: context,
    analyserNode: gainNode,
    compressLowCheckbox
  });

  fftAnalyzerInstance.node.connect(context.destination);
}

function createSliders() {
  const slidersDiv = document.getElementById('sliders');
  slidersDiv.innerHTML = '';
  const resolution = document.getElementById('resolution').value;
  const frequencies = resolution === 'octave'
    ? [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
    : [63, 80, 100, 125, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000];

  frequencies.forEach((freq, index) => {
    const container = document.createElement('div');
    container.className = 'slider-container';

    const label = document.createElement('label');
    label.textContent = `${freq} Hz`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = -12;
    slider.max = 12;
    slider.value = 0;
    slider.step = 1;

    slider.oninput = () => {
      const gainValue = parseFloat(slider.value);
      if (filters[index]) filters[index].gain.value = gainValue;
      feedbackDiv.textContent = `Adjusting ${freq} Hz: ${gainValue} dB`;
    };

    container.appendChild(label);
    container.appendChild(slider);
    slidersDiv.appendChild(container);
  });
}

const tooltip = document.getElementById('tooltip-text')

tooltip.innerHTML = `Este aplicativo tem o objetivo trabalhar a audição do efeito de filtros peaking em arquivos musicais. O menu de seleção apresenta alguns arquivos carregados, mas também permite o upload de arquivos.  Interaja com os controles que alteram o ganho nas frequências determinadas.`