import { setupPlayer } from './player.js';
import { getPinkNoiseNode, initializePinkNoise, playPinkNoise, stopPinkNoise } from './pinkNoise.js';
import { applyEQ, bypass, connectMyEQFilters } from './equalizer.js';
import { getContext } from './audioContext.js';

import { getSliderFrequency, getCurrentGain, gainCombination } from './quizLogic.js';

import { myEQLastGain, myEQLastFrequency, syncSliderAndLabel } from './quizLogic.js';
import { presets, presetSelect } from './quizLogic.js';


export let currentPath = 'bypass'; // Default path
export let mode = 'pink-noise'; // Default mode
export let player = null; // Lazy-initialized player


// Function to update the active path button
export function updatePathState() {
    const applyEQButton = document.getElementById('apply-eq');
    const myEQButton = document.getElementById('my-eq');
    const bypassButton = document.getElementById('bypass');

    [applyEQButton, myEQButton, bypassButton].forEach(button => {
        button.classList.remove('active-path'); // Clear active state
    });

    if (currentPath === 'challenge') applyEQButton.classList.add('active-path');
    if (currentPath === 'my-eq') myEQButton.classList.add('active-path');
    if (currentPath === 'bypass') bypassButton.classList.add('active-path');
}

// helper functions to deal with the current path

export function getCurrentPath() {
    return currentPath;
  }
  
  export function setCurrentPath(newPath) {
    currentPath = newPath;
    updatePathState(); // Ensure UI reflects the new path
  }


document.addEventListener('DOMContentLoaded', () => {
    
    // let currentChallenge = null;
    const feedback = document.getElementById('feedback')


    // Mode toggle event listener
    document.getElementById('modeToggle').addEventListener('change', (event) => {
        const audioPlayerUI = document.querySelector('.audio-player-ui');
        const currentContext = getContext();
        mode = event.target.checked ? 'audio-file' : 'pink-noise';

        if (mode === 'audio-file') {
            audioPlayerUI.style.visibility = 'visible';

            if (!player) {
                player = setupPlayer(currentContext); // Initialize player for audio files
                console.log("Audio player initialized.");
            } else {
                player.reconnectSourceNode(); // Ensure sourceNode is valid
            }

            stopPinkNoise(currentContext); // Stop and disconnect Pink Noise
        } else {
            audioPlayerUI.style.visibility = 'hidden';

            if (player) {
                player.stopAudio(); // Stop audio file playback
            }

            console.log("Switching to Pink Noise.");
            initializePinkNoise(currentContext) // Re-initialize Pink Noise
                .then(() => {
                    console.log("Pink Noise re-initialized.");
                })
                .catch((err) => {
                    console.error("Error reinitializing Pink Noise:", err);
                });
        }

        console.log(`Mode switched to: ${mode}`);
    });



    document.getElementById('apply-eq').addEventListener('click', () => {
        const currentContext = getContext();
        const sourceNode = mode === 'pink-noise' ? getPinkNoiseNode() : player?.getSourceNode();
      
        if (!sourceNode) {
          console.error("Source node not found!");
          return;
        }

      
        // Fetch challenge data and preset configurations
        const { frequency, gain } = window.challengeData || {};
        const selectedPresetIndex = presetSelect?.value;
        const selectedPreset = presets[selectedPresetIndex] || {};
      
        // Use preset or global Q and filter type
        const filterType = selectedPreset?.filterType || 'peaking';
        const Q = selectedPreset?.Q || window.globalQ || 1;
      
        if (frequency && gain !== undefined) {
          applyEQ(currentContext, sourceNode, { frequency, gain, filterType, Q });
          currentPath = 'challenge'; // Update path
          updatePathState(); // Reflect the active button
          console.log(`Apply EQ Path Activated: ${frequency} Hz, ${gain} dB, Filter Type = ${filterType}, Q = ${Q}`);
        } else {
          console.error("Challenge data is incomplete!");
        }
      });
      

     


    document.getElementById('my-eq').addEventListener('click', () => {
        const currentContext = getContext();
        const sourceNode = mode === 'pink-noise' ? getPinkNoiseNode() : player?.getSourceNode();
      
        if (sourceNode) {
          const frequency = myEQLastFrequency || getSliderFrequency(); // Restore last or default frequency
          const gain = myEQLastGain !== null ? myEQLastGain : getCurrentGain(); // Restore last or default gain

                    // Get Q and filterType from the preset
          const selectedPresetIndex = presetSelect?.value;
          const selectedPreset = presets[selectedPresetIndex] || {};

          const filterType = selectedPreset?.filterType || 'peaking'; // Default filter type
          const Q = window.globalQ || parseFloat(document.getElementById('quality-factor').value) || 1; // Fetch Q
         
          // Trigger a helper to sync slider and label (in quizLogic.js)
          syncSliderAndLabel(frequency);
      
          // Restore selected gain radio button for composite modes
          if (gainCombination.value.includes('boostCut') || gainCombination.value === 'all') {
            const radioToCheck = document.querySelector(`input[name="gain-options"][value="${gain}"]`);
            if (radioToCheck) {
              radioToCheck.checked = true;
              console.log(`Restored Gain: ${gain} dB`);
            }
          }
      
          connectMyEQFilters(currentContext, sourceNode, frequency, gain, filterType, Q);
      
          currentPath = 'my-eq'; // Update the current path
          updatePathState();
      
          console.log(`My EQ mode activated: Frequency = ${frequency} Hz, Gain = ${gain} dB, Filter Type = ${filterType}, Q = ${Q}`);
        }
      });
      
      

    document.getElementById('bypass').addEventListener('click', () => {
        const currentContext = getContext();
        const sourceNode = mode === 'pink-noise' ? getPinkNoiseNode() : player?.getSourceNode();

        if (sourceNode) {
            bypass(currentContext, sourceNode);
            currentPath = 'bypass'; // Update path
            updatePathState(); // Reflect the active button
        }
    });


    document.getElementById('play').addEventListener('click', async () => {
        const currentContext = getContext();

        if (mode === 'pink-noise') {
            console.log("Playing Pink Noise.");
            await initializePinkNoise(currentContext);
            playPinkNoise(currentContext);
        } else {
            if (!player) {
                player = setupPlayer(currentContext); // Lazily initialize player
                console.log("Audio player initialized.");
            }
            player.playAudio();
        }
    });


    document.getElementById('stop').addEventListener('click', () => {
        if (mode === 'pink-noise') {
            stopPinkNoise(getContext());
        } else if (player) {
            player.stopAudio();

        }
    });
});
