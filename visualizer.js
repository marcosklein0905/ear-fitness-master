let cachedWaveformImage = null; // Cache the waveform to optimize performance
let loopStart = null;
let loopEnd = null;

/**
 * Cache the waveform image for optimized playback visualization.
 * @param {string} canvasId - The ID of the canvas element.
 * @param {AudioBuffer} audioBuffer - The audio buffer to visualize.
 */
export function cacheWaveform(canvasId, audioBuffer) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Enable optimized mode
    const width = canvas.width;
    const height = canvas.height;
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height); // Clear the canvas
    ctx.beginPath();

    for (let i = 0; i < width; i++) {
        const min = Math.min(...channelData.subarray(i * step, (i + 1) * step));
        const max = Math.max(...channelData.subarray(i * step, (i + 1) * step));
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }

    ctx.strokeStyle = '#3498db'; // Waveform color
    ctx.stroke();

    // Cache the waveform image
    cachedWaveformImage = ctx.getImageData(0, 0, width, height);
    console.log("Waveform cached.");
}

/**
 * Draw the playhead on the canvas during playback.
 * @param {string} canvasId - The ID of the canvas element.
 * @param {number} currentTime - The current playback time.
 * @param {number} duration - The total duration of the audio.
 */
export function drawPlayhead(canvasId, currentTime, duration) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d', { willReadFrequently: true }); // Enable optimized mode
    const width = canvas.width;
    const height = canvas.height;

    if (cachedWaveformImage) {
        ctx.putImageData(cachedWaveformImage, 0, 0); // Redraw cached waveform
    }

    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
    ctx.fillRect(playheadX - 1, 0, 2, height); // Draw playhead
}

/**
 * Draw the loop region on the canvas.
 * @param {string} canvasId - The ID of the canvas element.
 * @param {number|null} loopStart - The start time of the loop (in seconds).
 * @param {number|null} loopEnd - The end time of the loop (in seconds).
 * @param {number} duration - The total duration of the audio.
 */
export function drawLoopRegion(canvasId, loopStart, loopEnd, duration) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    if (cachedWaveformImage) {
        ctx.putImageData(cachedWaveformImage, 0, 0); // Redraw cached waveform
    }

    if (loopStart !== null && loopEnd !== null) {
        const startX = (loopStart / duration) * width;
        const endX = (loopEnd / duration) * width;

        ctx.fillStyle = 'rgba(0, 128, 255, 0.3)'; // Loop region color
        ctx.fillRect(startX, 0, endX - startX, height); // Draw loop region
    }
}

/**
 * Configura o clique na waveform para mover o playhead.
 * @param {string} canvasId - ID do canvas da waveform
 * @param {number} duration - Duração total do áudio em segundos
 * @param {Function} scrubCallback - Função chamada ao clicar (recebe o tempo)
 */

export function setupCanvas(canvasId, duration, scrubCallback) {
    const canvas = document.getElementById(canvasId);

    function getOffsetX(event) {
        const rect = canvas.getBoundingClientRect();
        // Detecta se é toque (mobile) ou mouse
        const clientX = event.touches ? event.touches[0].clientX : event.clientX;
        return clientX - rect.left;
    }

    function handleScrub(event) {
        event.preventDefault(); // Evita scroll e zoom indesejados
        const rect = canvas.getBoundingClientRect();
        const offsetX = getOffsetX(event);
        const scrubTime = (offsetX / rect.width) * duration;
        scrubCallback(scrubTime);
    }

    // Mouse events
    canvas.addEventListener('mousedown', handleScrub);
    // Touch events
    canvas.addEventListener('touchstart', handleScrub);
}


/**
 * Visualize the playback with a moving playhead.
 * @param {AudioContext} context - The current AudioContext.
 * @param {string} canvasId - The ID of the canvas element.
 * @param {AudioBuffer} audioBuffer - The audio buffer to visualize.
 * @param {number} startTime - The playback start time.
 * @param {Function} isPlayingFn - Function to check if playback is active.
 */
export function visualize(context, canvasId, audioBuffer, startTime, isPlayingFn) {
    const duration = audioBuffer.duration;

    function draw() {
        if (!isPlayingFn()) return;

        const currentTime = context.currentTime - startTime;
        drawPlayhead(canvasId, currentTime, duration);

        requestAnimationFrame(draw);
    }

    draw();
}
