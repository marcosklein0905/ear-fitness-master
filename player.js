import { cacheWaveform, visualize, setupCanvas } from './visualizer.js';
import { getCurrentPath, updatePathState } from './audioMain.js';
import { applyEQ, connectMyEQFilters, bypass } from './equalizer.js';

export function setupPlayer(context) {
    let audioBuffer = null;
    let sourceNode = null;
    let preGainNode = null;
    let startTime = 0;
    let pausedAt = 0;
    let isPlaying = false;

    const canvasId = 'waveform';

    // Handle audio file upload
    document.getElementById('audioFile').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            audioBuffer = await context.decodeAudioData(arrayBuffer);
            console.log(`🎵 Loaded "${file.name}" (${audioBuffer.duration.toFixed(2)}s)`);

            cacheWaveform(canvasId, audioBuffer);

            // Setup waveform click for scrubbing
            setupCanvas(canvasId, audioBuffer.duration, (scrubTime) => {
                if (!audioBuffer) return;
                console.log(`⏩ Scrub to ${scrubTime.toFixed(2)}s`);
                scrubToTime(scrubTime);
            });
        } catch (err) {
            console.error('Error decoding audio file:', err);
        }
    });

    function createSourceNode() {
        if (!audioBuffer) {
            console.warn('No audio buffer loaded yet.');
            return null;
        }

        const source = context.createBufferSource();
        source.buffer = audioBuffer;

        preGainNode = context.createGain();
        preGainNode.gain.value = 0.25;

        source.connect(preGainNode);
        preGainNode.connect(context.destination);

        source.onended = () => {
            isPlaying = false;
            pausedAt = 0;
            console.log('🔚 Playback ended.');
        };

        return source;
    }

    async function playAudio() {
        if (!audioBuffer) {
            console.warn('No audio loaded!');
            return;
        }

        if (context.state === 'suspended') {
            await context.resume();
            console.log('▶️ AudioContext resumed.');
        }

        // Stop any existing playback before starting new one
        if (isPlaying) stopAudio();

        sourceNode = createSourceNode();
        if (!sourceNode) return;

        try {
            sourceNode.start(0, pausedAt);
            startTime = context.currentTime - pausedAt;
            isPlaying = true;

            console.log(`▶️ Playback started at ${pausedAt.toFixed(2)}s`);
            visualize(context, canvasId, audioBuffer, startTime, () => isPlaying);
        } catch (err) {
            console.error('Error during playback start:', err);
        }
    }

    function stopAudio() {
        if (isPlaying && sourceNode) {
            console.log("🛑 Parando áudio e limpando conexões...");
            try {
                sourceNode.onended = null;
                sourceNode.stop(0);
            } catch (err) {
                console.warn("Erro ao parar sourceNode:", err);
            }
            try {
                sourceNode.disconnect();
            } catch {}
            sourceNode = null;
            isPlaying = false;
            pausedAt = 0;
        } else {
            console.warn("Nenhum áudio ativo para parar.");
        }
    }


    function scrubToTime(time) {
        if (!audioBuffer) return;

        // Garante que o tempo está dentro do intervalo válido
        const clampedTime = Math.min(Math.max(time, 0), audioBuffer.duration - 0.05);
        pausedAt = clampedTime;

        console.log(`Scrubbing para ${pausedAt.toFixed(2)}s`);

        //  Encerrar qualquer playback ativo antes de criar um novo
        if (isPlaying && sourceNode) {
            try {
                console.log("⏹ Encerrando playback anterior antes do scrub...");
                sourceNode.onended = null; // remove callback pra evitar reset prematuro
                sourceNode.stop();
            } catch (err) {
                console.warn("Aviso ao parar source antigo:", err);
            }
            try { sourceNode.disconnect(); } catch {}
            sourceNode = null;
            isPlaying = false;
        }

        // 🔹 Criar novo sourceNode
        sourceNode = createSourceNode();
        if (!sourceNode) return;

        try {
            sourceNode.start(0, pausedAt);
            startTime = context.currentTime - pausedAt;
            isPlaying = true;

            console.log(` Reproduzindo a partir de ${pausedAt.toFixed(2)}s`);
            visualize(context, canvasId, audioBuffer, startTime, () => isPlaying);
        } catch (err) {
            console.error('Erro ao iniciar após scrub:', err);
            return;
        }

        // 🔹 Reaplicar o EQ ativo
        const currentPath = getCurrentPath();
        if (currentPath === 'challenge') applyEQ(context, sourceNode, window.challengeData);
        if (currentPath === 'my-eq' && window.myEQLastFrequency !== null) {
            connectMyEQFilters(context, sourceNode, window.myEQLastFrequency, window.myEQLastGain);
        }
        if (currentPath === 'bypass') bypass(context, sourceNode);
        updatePathState();
    }



    return {
        playAudio,
        stopAudio,
        getSourceNode: () => sourceNode,
    };
}
