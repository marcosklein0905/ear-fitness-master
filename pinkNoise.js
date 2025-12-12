let pinkNoiseNode = null;

export async function initializePinkNoise(context) {
    if (!pinkNoiseNode) {
        console.log("Initializing Pink Noise node...");
        try {
            await context.audioWorklet.addModule('Worklets.js');
            pinkNoiseNode = new AudioWorkletNode(context, 'pink-noise-generator');
            console.log("Pink Noise node initialized.");
        } catch (err) {
            console.error("Error initializing Pink Noise node:", err);
        }
    } else {
        console.log("Pink Noise node already initialized.");
    }
}


export function playPinkNoise(context) {
    if (context.state === 'suspended') {
        context.resume();
    }

    if (pinkNoiseNode) {
        try { pinkNoiseNode.disconnect(); } catch (e) {}

        const preGainNode = context.createGain();
        preGainNode.gain.value = 0.25;

        pinkNoiseNode.connect(preGainNode);
        preGainNode.connect(context.destination);

        console.log("Playing Pink Noise through preGainNode (-12dB).");
    } else {
        console.error("Pink Noise node not initialized!");
    }
}


export function stopPinkNoise(context) {
    context.suspend();
    if (pinkNoiseNode) {
        pinkNoiseNode.disconnect();
        console.log("Pink Noise node stopped and disconnected.");
    }
    console.log("Stopping Pink Noise.");
}

export function getPinkNoiseNode() {
    return pinkNoiseNode;
}
