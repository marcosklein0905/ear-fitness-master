
const easyMode = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 2000, 3000, 4000, 6000, 8000, 16000];
const expertMode = [40, 50, 63, 80, 100, 125, 160, 200, 250, 300, 315, 400, 500, 630, 800, 900, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000];

let audioCtx, gainNode;
let oscillators = {};

let currentWaveform = 'sine';


document.addEventListener('DOMContentLoaded', () => {
    const modeSelect = document.getElementById('modeSelect');
    const fileInput = document.getElementById('fileInput');
    const buttonGrid = document.getElementById('buttonGrid');
    const gainControl = document.getElementById('gainControl');
    const presetSelect = document.getElementById('presetSelect');

    modeSelect.addEventListener('change', handleModeChange);
    fileInput.addEventListener('change', handleFileUpload);
    gainControl.addEventListener('input', () => {
        if (gainNode) gainNode.gain.value = gainControl.value;
    });
    presetSelect.addEventListener('change', handlePresetChange);

    const waveformSelect = document.getElementById('waveformSelect');
    waveformSelect.addEventListener('change', () => {
    currentWaveform = waveformSelect.value;
    });


    fetchPresets();

    function fetchPresets() {
        fetch('json/swu-presets.json')
            .then(response => response.json())
            .then(data => {
                populatePresetDropdown(data);
            })
            .catch(error => console.error('Error loading presets:', error));
    }

    function populatePresetDropdown(presets) {
        presetSelect.innerHTML = '<option value="">Presets</option>';
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = JSON.stringify(preset.usedFrequencies);
            option.textContent = preset.presetName;
            presetSelect.appendChild(option);
        });
    }

    function handleModeChange() {
        const mode = modeSelect.value;

        // Reset preset selection when mode is changed
        presetSelect.value = '';

        if (mode === 'easy') {
            generateButtons(easyMode);
            fileInput.style.display = 'none';
        } else if (mode === 'expert') {
            generateButtons(expertMode);
            fileInput.style.display = 'none';
        } else {
            buttonGrid.innerHTML = '';
            fileInput.style.display = 'block';
        }
    }

    function handlePresetChange() {
        const selectedFrequencies = presetSelect.value ? JSON.parse(presetSelect.value) : [];

        // Reset mode selection when preset is chosen
        modeSelect.value = '';

        generateButtons(selectedFrequencies);
    }

    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const frequencies = e.target.result.split(',').map(Number);
                generateButtons(frequencies);
            };
            reader.readAsText(file);
        }
    }

    function generateButtons(frequencies) {
        buttonGrid.innerHTML = '';
        frequencies.forEach(freq => {
            const button = document.createElement('button');
            button.textContent = freq + ' Hz';
            button.dataset.freq = freq;
            button.addEventListener('click', handleButtonClick);
            buttonGrid.appendChild(button);
        });
    }

    function handleButtonClick(event) {
        const button = event.target;
        const frequency = button.dataset.freq;
        if (oscillators[frequency]) {
            stopOscillator(frequency, button);
        } else {
            startOscillator(frequency, button);
        }
    }


    function startOscillator(frequency, button) {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime); // Start silent
            gainNode.connect(audioCtx.destination);
        }
    
        const oscillator = audioCtx.createOscillator();

        oscillator.type = currentWaveform;

        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        oscillator.connect(gainNode);
    
        oscillator.start();
    
        // Apply a small fade-in (5ms attack)
        gainNode.gain.setTargetAtTime(gainControl.value, audioCtx.currentTime, 0.005);
    
        oscillators[frequency] = oscillator;
    
        button.classList.add('active');
        disableOtherButtons(button);
    }
    
    function stopOscillator(frequency, button) {
        const oscillator = oscillators[frequency];
        if (oscillator) {
            // ✅ Apply a small fade-out (5ms release)
            gainNode.gain.setTargetAtTime(0, audioCtx.currentTime, 0.005);
    
            // ✅ Stop the oscillator after the fade-out completes
            oscillator.stop(audioCtx.currentTime + 0.1);
            delete oscillators[frequency];
        }
    
        button.classList.remove('active');
        enableAllButtons();
    }
    

    function disableOtherButtons(activeButton) {
        const buttons = document.querySelectorAll('#buttonGrid button');
        buttons.forEach(button => {
            if (button !== activeButton) {
                button.disabled = true;
            }
        });
    }

    function enableAllButtons() {
        const buttons = document.querySelectorAll('#buttonGrid button');
        buttons.forEach(button => {
            button.disabled = false;
        });
    }

    handleModeChange();
});

// tooltip

const tooltip = document.getElementById('tooltip-text')

tooltip.innerHTML = `Familiarize-se com o som de frequências puras senoidais em diferentes resoluções. É possível trocar a forma de onda para triangular, dente-de-serra ou quadrada`