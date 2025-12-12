// Global Variables

let numQuestions, gainOption;
let currentQuestion = 0;
let score = 0;
let quizData = [];
let audioContext = null;
let originalSource = null;
let alteredSource = null;
let gainNodeOriginal = null;
let gainNodeAltered = null;
let isOriginalPlaying = false;
let isAlteredPlaying = false;
const gains = {
    boost: [12, 6, 3, 1, 0],
    cut: [0, -1, -3, -6, -12],
    both: [12, 6, 3, 1, 0, -1, -3, -6, -12]
};

let hasAnswered = false; // new global variable

import { explodeAt } from './particleExplosion.js';

// Event Listeners

document.getElementById("start-quiz-btn").addEventListener("click", startQuiz);
document.getElementById("btn-original").addEventListener("click", () => playAudio(true)); // Play original audio
document.getElementById("btn-altered").addEventListener("click", () => playAudio(false)); // Play altered audio
document.getElementById("btn-stop").addEventListener("click", stopPlayback);
document.getElementById("next-question-btn").addEventListener("click", nextQuestion);
document.getElementById("play-again-btn").addEventListener("click", playAgain);
document.getElementById("quit-btn").addEventListener("click", quit);


function switchScreen(hideId, showId) {
  document.getElementById(hideId).classList.remove("visible");
  document.getElementById(showId).classList.add("visible");
}


function startQuiz() {
    // Initialize AudioContext only after user interaction to comply with browser rules
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Reset global variables and counters
    currentQuestion = 0;
    score = 0;

    // Get quiz configuration values
    numQuestions = parseInt(document.getElementById("num-questions").value, 10);
    gainOption = document.querySelector('input[name="gain-option"]:checked').value;

    // Generate quiz data
    generateQuizData();

    // Display the first question
    displayQuestion();

    //Switch to quiz screen
    switchScreen("config-screen", "quiz-screen");
}

function generateQuizData() {
    const allAudioFiles = [
        { original: "Donald Fagen - The NightFly.mp3" },
        { original: "Haywyre - Context.mp3" },
        { original: "Porcupine Tree - Fear Of a Blank Planet.mp3" },
        { original: "Sam Gellaitry - Dreamscapes.mp3" },
        { original: "Pink_Noise.mp3" },
        { original: "Parsons_wav_24_44100.wav" },
        { original: "E a massa.mp3" }
    ];

    const pool = [];
    while (pool.length < numQuestions) {
        const shuffled = [...allAudioFiles];
        shuffleArray(shuffled);
        pool.push(...shuffled);
    }

    const selectedFiles = pool.slice(0, numQuestions);

    quizData = selectedFiles.map(file => {
        const availableGains = gains[gainOption];
        const gainChange = availableGains[Math.floor(Math.random() * availableGains.length)];
        return {
            original: file.original,  // same file
            correctAnswer: `${gainChange > 0 ? "+" : ""}${gainChange} dB`,
            gainValue: gainChange
        };
    });
}


async function loadAudioFile(fileName) {
    const response = await fetch(`audio/${fileName}`);
    const arrayBuffer = await response.arrayBuffer();
    return await audioContext.decodeAudioData(arrayBuffer);
}


async function prepareAudio() {
    if (currentQuestion >= quizData.length) {
        console.warn("No more questions available.");
        return;
    }

    const currentAudio = quizData[currentQuestion];
    if (!currentAudio) {
        console.error("Invalid audio data.");
        return;
    }

    const originalBuffer = await loadAudioFile(currentAudio.original);

    gainNodeOriginal = audioContext.createGain();
    gainNodeAltered = audioContext.createGain();

    const gainValue = Math.pow(10, quizData[currentQuestion].gainValue / 20);

    gainNodeOriginal.gain.value = 0.25; // always attenuate original slightly
    gainNodeAltered.gain.value = 0.25 * gainValue; // apply attenuation + boost/cut

    originalSource = createAudioSource(originalBuffer, gainNodeOriginal);
    alteredSource = createAudioSource(originalBuffer, gainNodeAltered);
}

function createAudioSource(buffer, gainNode) {
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    return source;
}

async function playAudio(isOriginal) {
    // Stop playback if either source is playing
    await stopPlayback();

    // Prepare audio sources if not already prepared
    if (!originalSource || !alteredSource) await prepareAudio();

    // Remove active states from both buttons
    document.getElementById("btn-original").classList.remove("active");
    document.getElementById("btn-altered").classList.remove("active");

    // Play the appropriate source
    if (isOriginal) {
        originalSource.start(0);
        isOriginalPlaying = true;
        document.getElementById("btn-original").classList.add("active"); // Set active state
    } else {
        alteredSource.start(0);
        isAlteredPlaying = true;
        document.getElementById("btn-altered").classList.add("active"); // Set active state
    }

    document.getElementById("btn-stop").disabled = false;
}

async function stopPlayback() {
    try {
        // Only call stop if the source is currently playing
        if (originalSource && isOriginalPlaying) {
            originalSource.stop();
            isOriginalPlaying = false;
        }
        if (alteredSource && isAlteredPlaying) {
            alteredSource.stop();
            isAlteredPlaying = false;
        }
    } catch (error) {
        console.warn("Error stopping audio playback: ", error);
    }

    // Remove active states from both buttons when stopping playback
    document.getElementById("btn-original").classList.remove("active");
    document.getElementById("btn-altered").classList.remove("active");

    // Reset sources after stopping
    originalSource = null;
    alteredSource = null;
    document.getElementById("btn-stop").disabled = true;
}

function checkAnswer(button, isCorrect) {
    document.querySelectorAll(".answer-btn").forEach(btn => {
        btn.classList.remove("correct", "wrong", "correct-answer");
    });

    if (isCorrect) {
        button.classList.add("correct");
        score++;
    } else {
        button.classList.add("wrong");
        document.querySelectorAll(".answer-btn").forEach(btn => {
            if (btn.textContent === quizData[currentQuestion].correctAnswer) {
                btn.classList.add("correct-answer");
            }
        });
    }

    document.querySelectorAll(".answer-btn").forEach(btn => btn.disabled = true);

    hasAnswered = true; // mark answered
}


function nextQuestion() {
    if (!hasAnswered) {
        alert("Please select an answer before proceeding!");
        return;
    }

    stopPlayback();

    if (currentQuestion < numQuestions - 1) {
        currentQuestion++;
        hasAnswered = false; // reset for next question
        displayQuestion();
    } else {
        showResults();
    }
}

function displayQuestion() {
    if (currentQuestion >= quizData.length) {
        showResults();
        return;
    }

    document.getElementById("question-title").innerText = `Questão ${currentQuestion + 1} de ${numQuestions}`;
    generateAnswerButtons();
}

function generateAnswerButtons() {
    const answerButtonsDiv = document.getElementById("answer-buttons");
    answerButtonsDiv.innerHTML = "";

    const currentData = quizData[currentQuestion];
    if (!currentData) {
        console.error("No data for current question.");
        return;
    }

    const availableGains = gains[gainOption];
    const correctAnswer = currentData.correctAnswer;

    let incorrectOptions = availableGains
        .map(dB => `${dB > 0 ? "+" : ""}${dB} dB`)
        .filter(option => option !== correctAnswer);

    incorrectOptions.sort(() => Math.random() - 0.5);

    const options = [correctAnswer, ...incorrectOptions.slice(0, 3)];
    options.sort(() => Math.random() - 0.5);

    options.forEach(option => {
        const btn = document.createElement("button");
        btn.textContent = option;
        btn.classList.add("answer-btn");
        btn.style.width = "150px";
        btn.addEventListener("click", () => checkAnswer(btn, option === correctAnswer));
        answerButtonsDiv.appendChild(btn);
    });
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


function showResults() {
    document.getElementById("result-score").innerText = `Você acertou ${score} de ${numQuestions}`;
    document.getElementById("result-percentage").innerText = `Porcentagem: ${((score / numQuestions) * 100).toFixed(0)}%`;

  
    switchScreen("quiz-screen", "results-screen");
  
    const percentage = (score / numQuestions) * 100;
  
    // Explosão de partículas acima de 90%
    
    if (percentage >= 90) {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      explodeAt(centerX, centerY);
    }
  }

function playAgain() {
    currentQuestion = 0;
    score = 0;
    switchScreen("results-screen", "quiz-screen");
    displayQuestion();
}

function quit() {
    currentQuestion = 0;
    score = 0;
    switchScreen("results-screen", "config-screen");

}

// tooltip

const tooltip = document.getElementById('tooltip-text')

tooltip.innerHTML = `Esse quiz trabalha a percepção e a comunicação de mudanças de volume, expressas em decibéis. Esse aplicativo utiliza arquivos sonoros selecionados que são escolhidos aleatoriamente a cada questão. Configure o quiz se quiser utilizar ganho positivo, negativo ou ambos`