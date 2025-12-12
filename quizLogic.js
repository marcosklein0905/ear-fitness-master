import { getGenerator,  
         setupLevels,
         trackError,
         progressiveGenerator, 
         incrementLevel, 
         resetProgressiveMode,
         getProgressiveState, 
         resetErrorStats,
        } from './questionGenerators.js';

import { getFrequencyErrors } from './questionGenerators.js';
import { getContext } from './audioContext.js';

import { currentPath } from './audioMain.js';
import { mode } from './audioMain.js';
import { updatePathState } from './audioMain.js';
import { setCurrentPath } from './audioMain.js';
import { getPinkNoiseNode } from './pinkNoise.js';
import { connectMyEQFilters } from './equalizer.js';
import { bypass } from './equalizer.js';
import { player } from './audioMain.js';

// ============ GAMIFICATION REWARDS =========================== //

import { startConfetti } from './js/confettiBurst.js';

// ============ FIREBASE STUFF IMPORTS START =================== //

import { db, auth } from "../firebaseInfo/firebase.js";
import { doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// ============ FIREBASE STUFF IMPORTS END =================== //

export const gainCombination = document.getElementById('gain-comb');
export let myEQLastFrequency = null; // Last frequency used in My EQ mode
export let myEQLastGain = null; // Last gain used in My EQ mode

export let presets = []
export const presetSelect = document.getElementById('preset');

// for progressive mode

const quizState = {
  correctStreak: 0,
  currentLevel: 1, 
};

let userGain = null; // Tracks the user's selected gain

let challengeGain = null; // To store the immutable gain value for each question

let questionMode = 'random'; // Default mode

const questGenTypeSelect = document.getElementById('quest-gen-type');

const playQuestionButton = document.getElementById('play');

const nextQuestionButton = document.getElementById('next-question');
const resolutionSelect = document.getElementById('resolution');
const checkAnswerButton = document.getElementById('check-answer');
const quitQuizButton = document.getElementById('quit-quiz');

const frequencySlider = document.getElementById('frequency-slider');
const frequencyLabel = document.getElementById('frequency-label');

const feedback = document.getElementById('feedback');
const scoreDisplay = document.getElementById('score');

const gainOptionsContainer = document.getElementById('gain-options-container');
const qualityFactor = document.getElementById('quality-factor');
const modal = document.getElementById('end-modal');
const finalScore = document.getElementById('final-score');

// const playAgainButton = document.getElementById('play-again');

const quitModalButton = document.getElementById('quit-modal');

const uploadContainer = document.getElementById('upload-container');
const customFrequenciesInput = document.getElementById('custom-frequencies');

const tooltip = document.getElementById('tooltip-text')

const usedFrequencies = document.getElementById('used-frequencies')

const octaveFrequencies = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const thirdOctaveFrequencies = [
  63, 80, 100, 125, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
  2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000,
];


// estatísticas de erro para o modo adaptativo

const toggleErrorStatsButton = document.getElementById('toggle-error-stats');
const errorStatsContainer = document.getElementById('error-stats');
const errorStatsContent = document.getElementById('error-stats-content');
const resetStatsButton = document.getElementById('reset-stats')
// para o progressive mode

const progressiveInfo = document.getElementById('progressive-info')
const currentLevelDisplay = document.getElementById('current-level');
const resetProgressButton = document.getElementById('reset-progress');
const starContainer = document.getElementById('star-container');

export let currentFrequencies = [];

let currentQuestion = null;
let questionCount = 0;
let correctAnswers = 0;
let customFrequencies = []; // To store custom frequencies


// ================ FIREBASE VARIABLES START ==================

let currentEQSessionRef = null; // Reference to track session in Firestore
let eqSessionStartTime = null; // To track session time

let totalQuestionsPlayed = 0;

// ================ FIREBASE VARIABLES END ==================


// Map for gain options
const gainOptions = {
  boost12: ["+12"],
  cut12: ["-12"],
  boostCut12: ["+12", "-12"],
  boost9: ["+9"],
  cut9: ["-9"],
  boostCut9: ["+9", "-9"],
  boost6: ["+6"],
  cut6: ["-6"],
  boostCut6: ["+6", "-6"],
  boost3: ["+3"],
  cut3: ["-3"],
  boostCut3: ["+3", "-3"],
  all: ["+12", "-12", "+9", "-9", "+6", "-6", "+3", "-3"],
};

let currentGain = null; // Store the current gain for the question



async function startEQSession() {
  if (!auth.currentUser) return; // Ensure user is logged in

  if (currentEQSessionRef) {
    console.log("Not recording, session is already playing");
    return; // Prevent duplicate session creation
  }

  eqSessionStartTime = Date.now(); // Track when the session starts

  const userId = auth.currentUser.uid;
  const sessionId = `session_${Date.now()}`; // Unique session ID

  // ✅ Ensure session reference is globally accessible
  currentEQSessionRef = doc(db, "users", userId, "sessions", sessionId);

  try {
      await setDoc(currentEQSessionRef, {
          sessionStart: serverTimestamp(),
          sessionEnd: null,
          timeSpent: null,
          settings: {
              frequencyResolution: document.getElementById("resolution")?.value || "default",
              gainCombination: document.getElementById("gain-comb")?.value || "default",
              QFactor: window.globalQ || parseFloat(document.getElementById("quality-factor")?.value) || 1,
              presetUsed: document.getElementById("preset")?.value || "None",
              generationMode: document.getElementById("quest-gen-type")?.value || "random",
              playbackMode: document.getElementById("modeToggle")?.checked ? "music" : "pink-noise",
              audioFile: document.getElementById("audioFile")?.files[0]?.name || "None",
          },
          totalCorrect: 0,
          totalMistakes: 0,
          finalScore: null,
      });

      console.log("🎯 EQ Session Started in Firestore!");

  } catch (error) {
      console.error("🔥 Firestore Write Error in startEQSession:", error);
  }
}



// ✅ Attach `startEQSession()` to Play Button **after Firebase is Loaded**
document.addEventListener("DOMContentLoaded", () => {
    const playButton = document.getElementById("play");
    if (playButton) {
        playButton.addEventListener("click", startEQSession);
    } else {
        console.error("❌ Play button not found in DOM!");
    }
});


// ===================== FIREBASE SESSION LOG FUNCTION END ============================= //


function resetQuiz() {
  currentQuestion = null;
  questionCount = 1;
  correctAnswers = 0;
  feedback.textContent = 'Questão #1';
  scoreDisplay.textContent = '';
  playQuestionButton.disabled = false;
  quitQuizButton.disabled = false;
  checkAnswerButton.disabled = false;

  generateGainRadioButtons(gainCombination.value);

  //avoiding null question in session creation

  generateQuestion();

}



async function loadPresets() {
  try {
    const response = await fetch('presets.json');
    presets = await response.json();

    // Populate the preset dropdown
    presets.forEach((preset, index) => {
      const option = document.createElement('option');
      option.value = index; // Use index to reference the preset
      option.textContent = preset.presetName;
      presetSelect.appendChild(option);
    });

    console.log('Presets Loaded:', presets);
    return presets;
  } catch (error) {
    console.error('Error loading presets:', error);
    return [];
  }
}

export { loadPresets };


// Handle preset selection
presetSelect.addEventListener('change', (event) => {
  const selectedIndex = event.target.value;

  if (selectedIndex === "") {
    // No preset selected, reset to default
    resetToDefault(); // Reset frequencies and UI to default
    return;
  }

  // Fetch the selected preset
  const selectedPreset = presets[selectedIndex];

  if (selectedPreset) {
    // Set frequencies and gain combination from the preset
    currentFrequencies = selectedPreset.usedFrequencies || [];
    customFrequencies = selectedPreset.usedFrequencies || []; // For consistency with Custom mode
    gainCombination.value = selectedPreset.gainCombinations || "";

    // Apply filterType and Q from preset
    window.currentFilterType = selectedPreset.filterType || "peaking"; // Default to peaking filter
    window.currentQ = selectedPreset.Q || 1; // Default Q value is 1

    // Log additional parameters for debugging
    console.log('Selected Preset:', selectedPreset);
    console.log('Filter Type:', window.currentFilterType);
    console.log('Quality Factor (Q):', window.currentQ);
    console.log('Preset Frequencies Set:', currentFrequencies);

    // Update gain options
    generateGainRadioButtons(selectedPreset.gainCombinations);

    tooltip.innerHTML = `<b>Frequências usadas</b>: ${currentFrequencies.join(", ")}`

    // Update the Q dropdown to reflect the preset's Q value
    const qDropdown = document.getElementById('quality-factor');
    if (qDropdown) {
      qDropdown.value = window.currentQ; // Sync dropdown with current Q
    }

    // Update slider bounds to match the preset's frequencies
    if (currentFrequencies.length > 0) {
      frequencySlider.min = 0;
      frequencySlider.max = currentFrequencies.length - 1; // Adjust the slider range
      frequencySlider.step = 1;
    } else {
      console.warn('No frequencies available in the preset.');
    }

    // Regenerate a question with the new settings
    generateQuestion();
  }
});


function updateQuestionFeedback() {
  feedback.textContent = `Questão #${questionCount}`;
}

function nextQuestion() {
  questionCount++;
  updateQuestionFeedback();
  playQuestionButton.disabled = false;
  checkAnswerButton.disabled = true;

  // Reset to bypass path
  const currentContext = getContext();
  const sourceNode = mode === 'pink-noise' ? getPinkNoiseNode() : player?.getSourceNode();

  if (sourceNode) {
    bypass(currentContext, sourceNode); // Reset the audio chain to bypass
    console.log('Audio path reset to bypass.');
  }

  setCurrentPath('bypass'); // Update the visual state of the path
  console.log('Path reset to bypass after generating next question.');
}


function generateQuestion() {
  updateFrequencies(); // Ensure frequencies are up-to-date

  // Fetch the selected preset
  const selectedPresetIndex = presetSelect?.value;
  const selectedPreset = presets[selectedPresetIndex] || null;

  // Generate question based on mode
  if (questionMode === 'progressive') {
    currentQuestion = progressiveGenerator(currentFrequencies, selectedPreset);
    if (!isFinite(currentQuestion)) {
      console.error('Invalid Question Frequency in Progressive Mode:', currentQuestion);
      return; // Exit if invalid
    }
  } else {
    const generator = getGenerator(questionMode);
    currentQuestion = generator(currentFrequencies);
  }

  // Generate gain options
  const selectedGainOptions = gainOptions[gainCombination.value] || [];
  currentGain = selectedGainOptions[Math.floor(Math.random() * selectedGainOptions.length)];
  challengeGain = currentGain; // Assign challengeGain

  if (!isFinite(currentGain)) {
    console.error('Invalid Gain Value:', currentGain);
    return; // Exit if invalid
  }

  // Set challengeData globally
  window.challengeData = {
    frequency: currentQuestion,
    gain: currentGain,
    filterType: selectedPreset?.filterType || 'peaking',
    Q: selectedPreset?.Q || 1,
  };

  console.log('Generated Challenge:', window.challengeData); // Debugging

  // Update frequency slider
  frequencySlider.disabled = false;
  frequencySlider.value = 0;
  frequencyLabel.textContent = `Frequency: ${currentFrequencies[0]}Hz`;
}


// Increment level after a streak
let correctStreak = 0;

function generateGainRadioButtons(selectedOption) {
  gainOptionsContainer.innerHTML = '';

  const options = gainOptions[selectedOption] || [];
  if (options.length === 1) {
    currentGain = formatGain(options[0]);
    console.log(`Single Gain Selected: ${currentGain}`);
    return;
  }

  options.forEach((value, index) => {
    const formattedValue = formatGain(value);
    const radioWrapper = document.createElement('div');
    const radioButton = document.createElement('input');
    const radioLabel = document.createElement('label');

    radioButton.type = 'radio';
    radioButton.name = 'gain-options';
    radioButton.value = formattedValue;
    radioButton.id = `gain-${formattedValue}`;

    if (index === 0) {
      radioButton.checked = true;
      currentGain = formattedValue;
      console.log(`Default Gain Set to: ${currentGain}`);
    }

    radioButton.addEventListener('change', (event) => {
      currentGain = event.target.value;
      feedback.textContent = '';
      console.log(`Gain Updated: ${currentGain}`);
    });

    radioLabel.textContent = `${formattedValue} dB`;
    radioLabel.htmlFor = `gain-${formattedValue}`;

    radioWrapper.appendChild(radioButton);
    radioWrapper.appendChild(radioLabel);
    gainOptionsContainer.appendChild(radioWrapper);
  });
}


function formatGain(value) {
  const numericValue = parseFloat(value);
  return numericValue > 0 ? `+${numericValue}` : `${numericValue}`;
}


function updateFrequencies() {
  // If a preset is selected, do not overwrite currentFrequencies
  if (presetSelect.value !== "") {
    
    console.log("Using preset frequencies:", currentFrequencies); // Debugging
    return;
  }

  // Default behavior for "octave", "third-octave", or "custom"
  if (resolutionSelect.value === 'octave') {
    currentFrequencies = octaveFrequencies;
  } else if (resolutionSelect.value === 'third-octave') {
    currentFrequencies = thirdOctaveFrequencies;
  } else if (resolutionSelect.value === 'custom' && customFrequencies.length > 0) {
    currentFrequencies = customFrequencies;
  }

  tooltip.innerHTML = `<b>Frequências usadas</b>: ${currentFrequencies.join(", ")}`


  // Update slider bounds
  frequencySlider.min = 0;
  frequencySlider.max = currentFrequencies.length - 1;
  frequencySlider.step = 1;
}


async function checkAnswer() {
  const userAnswerIndex = parseInt(frequencySlider.value, 10);
  const userAnswer = currentFrequencies[userAnswerIndex];
  const gainRadios = document.querySelectorAll('input[name="gain-options"]');

  let userGain = null;

  if (gainRadios.length > 0) {
    userGain = document.querySelector('input[name="gain-options"]:checked')?.value;
  } else {
      userGain = currentGain;
  }

  const normalizedChallengeGain = formatGain(challengeGain);
  const normalizedUserGain = formatGain(userGain);

  console.log(`User Answer: ${userAnswer}, User Gain: ${normalizedUserGain}`);
  console.log(`Correct Answer: ${currentQuestion}, Correct Gain: ${normalizedChallengeGain}`);

  totalQuestionsPlayed++; 
  
  let isCorrect = (
    Number(userAnswer) === Number(currentQuestion) &&
    String(normalizedUserGain) === String(normalizedChallengeGain)
  );
  

  if (isCorrect) {
      correctAnswers++;
      correctStreak++;
      feedback.textContent = 'Resposta correta!';
      
      if (correctStreak >= 5 && questionMode === 'progressive') {
          incrementLevel();
          correctStreak = 0;
          updateProgressiveUI();
      }
  } else {
      correctStreak = 0;
      feedback.textContent = `Incorreta. A frequência era ${currentQuestion}Hz e o ganho era de ${normalizedChallengeGain}.`;

      if (questionMode === 'adaptive') {
          trackError(currentQuestion);
      }

      // 🔥 **Save Incorrect Answer to Firestore**
      if (currentEQSessionRef) {
          try {
              const questionRef = doc(currentEQSessionRef, "missedQuestions", `${Date.now()}`);
              await setDoc(questionRef, {
                  correctFrequency: currentQuestion,
                  correctGain: normalizedChallengeGain,
                  userFrequency: userAnswer,
                  userGain: normalizedUserGain,
                  timestamp: serverTimestamp()
              });

              console.log("Incorrect answer logged in Firestore.");
          } catch (error) {
              console.error("Error saving incorrect answer:", error);
          }
      }
  }

  updateScore();
  playQuestionButton.disabled = false;
  checkAnswerButton.disabled = true;
}


function updateScore() {
  const percentage = Math.round((correctAnswers / questionCount) * 100);
  scoreDisplay.textContent = `Score: ${correctAnswers}/${questionCount} (${percentage}%)`;

}



async function quitQuiz() {
  const finalScoreValue = Math.round((correctAnswers / (totalQuestionsPlayed || 1)) * 100);
  
  finalScore.textContent = `Final Score: ${correctAnswers}/${totalQuestionsPlayed} (${finalScoreValue}%)`;

  if(finalScoreValue >= 90) {
    startConfetti()
  }

  modal.classList.remove('hidden');

  const user = auth.currentUser;

  if (!user || !currentEQSessionRef) {
    console.warn("Auth or session reference not ready during quitQuiz()");
    return;
  }

  const sessionEndTime = Date.now();
  const sessionDuration = Math.floor((sessionEndTime - eqSessionStartTime) / 1000);

  try {
    console.log("📡 Saving EQ session:", {
      sessionDuration,
      totalQuestionsPlayed,
      correctAnswers,
      mistakes: totalQuestionsPlayed - correctAnswers,
      finalScore: finalScoreValue
    });

    console.log("Debug Write:");
    console.log("auth.user.uid:", auth.currentUser?.uid);
    console.log("correctAnswers:", correctAnswers);
    console.log("totalQuestionsPlayed:", totalQuestionsPlayed);
    console.log("Session ref:", currentEQSessionRef?.path);

    await updateDoc(currentEQSessionRef, {
      sessionEnd: serverTimestamp(),
      timeSpent: sessionDuration,
      totalQuestions: totalQuestionsPlayed,
      totalCorrect: correctAnswers,
      totalMistakes: totalQuestionsPlayed - correctAnswers,
      finalScore: finalScoreValue,
    });

    console.log("Session stats saved successfully in quitQuiz()");
  } catch (error) {
    console.error("Error saving EQ session stats in quitQuiz():", error);
  }
  


  currentEQSessionRef = null;
  eqSessionStartTime = null;
  correctAnswers = 0;
  totalQuestionsPlayed = 0;
  questionCount = 0;


  resetToDefault();
}


function closeModal() {
  modal.classList.add('hidden');
  resetQuiz();
}

// Update progressive mode UI

function updateProgressiveUI() {
  const { currentLevel, stars } = getProgressiveState();

  // Update level display
  currentLevelDisplay.textContent = `Level ${currentLevel}`;

  // Render stars
  renderStars(stars);

  console.log(`Progressive UI Updated: Level = ${currentLevel}, Stars = ${stars}`);
}


// Function to render stars
function renderStars(starCount) {
  starContainer.innerHTML = ''; // Clear existing stars

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('img');
    star.src = './icons/star.svg'; // Path to the star icon
    star.alt = 'Star';
    star.className = 'star-icon'; // Add a class for styling
    starContainer.appendChild(star);
  }

  console.log('Stars:', starCount); // Debugging
}

// conteúdo das estatísticas de erro

// Update error stats content

function updateErrorStats() {
  const frequencyErrors = getFrequencyErrors();
  errorStatsContent.innerHTML = ''; // Clear existing stats

  Object.entries(frequencyErrors).forEach(([freq, count]) => {
    const stat = document.createElement('p');
    stat.textContent = `Frequency ${freq} Hz: ${count} error(s)`;
    errorStatsContent.appendChild(stat);
  });
}

resetStatsButton.addEventListener('click', ()=>{
  resetErrorStats();
  updateErrorStats();
})


function resetToDefault() {
  // 1. Clear selection state
  presetSelect.value = "";
  customFrequencies = [];
  gainCombination.value = "boost12";
  window.globalQ = 1;
  questionMode = 'random';
  setCurrentPath('bypass');

  // 2. Reset Q dropdown & fire change
  const qDropdown = document.getElementById('quality-factor');
  qDropdown.value = "1";
  const event = new Event('change', { bubbles: true });
  qDropdown.dispatchEvent(event);

  // 3. Set frequencies via resolution dropdown — safest fallback
  updateFrequencies(); // 💡 This will pull correct resolution: octave, third, or custom

  // 4. Wait until now to set UI + generate first question
  generateGainRadioButtons(gainCombination.value);
  generateQuestion(); // AFTER frequencies and gains are stable

  // 5. Update frequency slider and UI labels
  frequencySlider.min = 0;
  frequencySlider.max = currentFrequencies.length - 1;
  frequencySlider.value = 0;
  frequencyLabel.textContent = `Frequency: ${currentFrequencies[0]}Hz`;

  // 6. Clear UI feedback
  usedFrequencies.innerHTML = `<p><b>Frequências usadas:</b> ${currentFrequencies.join(', ')}</p>`;
  feedback.textContent = '';

  // 7. Reset visuals
  updatePathState();
  resetQuiz()

  console.log('🧼 App reset to default configuration.');
}


// EVENT LISTENERS

playQuestionButton.addEventListener('click', () => {
  console.log('Play button clicked. This will trigger the audio engine in the future.');
});

nextQuestionButton.addEventListener('click', () => {
  nextQuestion()
  generateQuestion();
  playQuestionButton.disabled = false; // Enable Play button for future audio
  checkAnswerButton.disabled = false;
  quitQuizButton.disabled = false;
});


// Toggle error stats visibility
toggleErrorStatsButton.addEventListener('click', () => {
  if (errorStatsContainer.style.display === 'none') {
    updateErrorStats(); // Update stats before showing
    errorStatsContainer.style.display = 'block';
    toggleErrorStatsButton.textContent = 'Hide Error Stats';
  } else {
    errorStatsContainer.style.display = 'none';
    toggleErrorStatsButton.textContent = 'Show Error Stats';
  }
});


// Listen for question generation mode selection
questGenTypeSelect.addEventListener('change', (event) => {
  questionMode = event.target.value;

  // Show or hide the progressive info section
  progressiveInfo.style.visibility = (questionMode === 'progressive') ? 'visible' : 'hidden';
  toggleErrorStatsButton.style.display = (questionMode === 'adaptive') ?'block' : 'none';

  console.log('Question Generation Mode:', questionMode);

  // Generate a new question based on the selected mode
  generateQuestion();
});


qualityFactor.addEventListener('change', (event) => {
  const selectedQ = parseFloat(event.target.value);
  console.log(`Q Value Changed: ${selectedQ}`);

  if (!presetSelect.value) { // No preset selected
    window.globalQ = selectedQ; // Update global Q
    console.log(`Applied Q: ${selectedQ} (No Preset Selected)`);
  }
});


frequencySlider.addEventListener('input', () => {
  const sliderValue = parseInt(frequencySlider.value, 10);
  const frequency = currentFrequencies[sliderValue];
  let gain = myEQLastGain !== null ? myEQLastGain : currentGain;

  const isCompositeMode = gainCombination.value.includes('boostCut') || gainCombination.value === 'all';

  if (isCompositeMode) {
    const selectedRadio = document.querySelector('input[name="gain-options"]:checked');
    if (selectedRadio) {
      gain = parseFloat(selectedRadio.value);
    } else {
      feedback.textContent = 'Escolha + ou - antes de mover o slider.';
      return;
    }
  }

  // Store the last state for My EQ
  myEQLastFrequency = frequency;
  myEQLastGain = gain;

  frequencyLabel.textContent = `Frequência: ${frequency}Hz`;

  if (currentPath === 'my-eq') {
    const currentContext = getContext();
    const sourceNode = mode === 'pink-noise' ? getPinkNoiseNode() : player?.getSourceNode();

    // Get filterType and Q from preset if applicable
    const selectedPresetIndex = presetSelect?.value;
    const selectedPreset = presets[selectedPresetIndex] || {};
    const filterType = selectedPreset?.filterType || 'peaking'; // Use preset or default
    const Q = selectedPreset?.Q || window.globalQ || 1;

    if (sourceNode) {
      connectMyEQFilters(currentContext, sourceNode, frequency, gain, filterType, Q);
      console.log(`Filter Updated: Frequency = ${frequency}, Gain = ${gain}, Filter Type = ${filterType}, Q = ${Q}`);
    }
  }
});


// helper functions to pass the slider values from quizLogic.js to audioMain.js


export function getSliderFrequency() {
  const sliderValue = parseInt(frequencySlider.value, 10);
  return currentFrequencies[sliderValue]; // Current frequency from the slider
}

export function getCurrentGain() {
  const selectedRadio = document.querySelector('input[name="gain-options"]:checked');
  return selectedRadio ? parseFloat(selectedRadio.value) : 0; // Default to 0 dB if no gain is selected
}

export function syncSliderAndLabel(frequency) {
  const sliderIndex = currentFrequencies.indexOf(frequency);

  if (sliderIndex !== -1) {
    frequencySlider.value = sliderIndex; // Update the slider position
    frequencyLabel.textContent = `Frequency: ${frequency}Hz`; // Update the label
    console.log(`Slider Synchronized: Frequency = ${frequency} Hz`);
  } else {
    console.warn(`Frequency ${frequency} not found in currentFrequencies.`);
  }
}


// Event listeners

checkAnswerButton.addEventListener('click', checkAnswer);
quitQuizButton.addEventListener('click', quitQuiz);


document.getElementById('reset-default').addEventListener('click', resetToDefault);


resolutionSelect.addEventListener('change', (event) => {
  const selectedResolution = event.target.value;

  // Handle "Custom" option
  if (selectedResolution === 'custom') {
    uploadContainer.style.display = 'block'; // Show upload container
  } else {
    uploadContainer.style.display = 'none'; // Hide upload container
    customFrequencies = []; // Clear custom frequencies
  }

  // Reset preset dropdown when resolution changes
  if (presetSelect.value !== "") {
    presetSelect.value = ""; // Clear preset selection
    console.log('Preset cleared due to resolution change.');
  }

  // Update frequencies based on the new resolution
  updateFrequencies();

  // Reinitialize levels for progressive mode if active
  if (questionMode === 'progressive') {
    try {
      setupLevels(currentFrequencies, 5); // Adjust levels dynamically
      console.log('Levels reinitialized for Progressive Mode.');
    } catch (error) {
      console.error('Failed to reinitialize levels:', error);
    }
  }

  // Generate a new question to reflect the selected resolution
  generateQuestion();
});


// handle file upload
customFrequenciesInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const fileContent = e.target.result;

      // Parse the file content into frequencies
      customFrequencies = fileContent
        .split(',')
        .map((freq) => parseFloat(freq.trim()))
        .filter((freq) => !isNaN(freq) && freq > 0); // Ensure valid numbers

      if (customFrequencies.length === 0) {
        alert('The file does not contain valid frequencies.');
        return;
      }

      console.log('Custom Frequencies Loaded:', customFrequencies); // Debugging

      // Hide the upload box after successful upload
      uploadContainer.style.display = 'none';

      // Update the frequencies with the custom ones
      currentFrequencies = customFrequencies;
      updateFrequencies();

      // Display the custom frequencies in the UI
      usedFrequencies.innerHTML = `
        <p><b>Custom Frequencies:</b> ${customFrequencies.join(', ')}</p>
      `;

      // Generate a new question based on custom frequencies
      generateQuestion();

      // Enable the Check Answer button
      checkAnswerButton.disabled = false;
    };

    reader.onerror = () => {
      alert('Failed to read the file. Please try again.');
    };

    reader.readAsText(file);
  }
});

gainOptionsContainer.addEventListener('change', (event) => {
  if (event.target.name === 'gain-options') {
    currentGain = parseFloat(event.target.value); // Update current gain
    myEQLastGain = currentGain; // Store the last selected gain
    feedback.textContent = ''; // Clear warnings
  }
});


gainCombination.addEventListener('change', (event) => {
  const selectedGainCombination = event.target.value;
  console.log('Selected Gain Combination:', selectedGainCombination);

  generateGainRadioButtons(selectedGainCombination); // Update gain options
  generateQuestion(); // Generate a new question based on the new gain combination
});



qualityFactor.addEventListener('change', () => {
  console.log(qualityFactor.value);
});

quitModalButton.addEventListener('click', async () => {
  await quitQuiz(); // Ensure stats saved
  closeModal();     // Then hide modal and reset
});


// Reset progress on button click
resetProgressButton.addEventListener('click', () => {
  resetProgressiveMode();
  updateProgressiveUI();
});

// Initialize
resetQuiz();

// Load presets and initialize error stats on app start

(async () => {
  presets = await loadPresets(); // Load presets
  currentFrequencies = octaveFrequencies; // Initialize with default frequencies
  setupLevels(currentFrequencies, 6); // Setup levels for progressive mode

  updateProgressiveUI(); // Initialize UI with stars and levels
  updatePathState();
  generateQuestion(); // Generate the first question

  // Adjust button visibility and states after the first question is generated
  playQuestionButton.style.display = 'inline-block'; // Ensure Play button is visible
  nextQuestionButton.style.display = 'inline-block'; // Show Next Question button
  checkAnswerButton.disabled = false; // Enable Check Answer button
})();


