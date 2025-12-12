let questions = [];
let currentTrial = 0;
let numTrials = 0;
let currentSubject = "any";
let score = 0;
let answers = [];
let audioA = null;
let audioB = null;
let audioX = null;
let currentAudio = null;
let rampDuration = 0.05; // 50 ms ramp to avoid clicks
let audioContext = null;
let gainNodeA = null;
let gainNodeB = null;
let gainNodeX = null;
let audioCache = {};

let hasStarted = false;

let customFile1URL = null;
let customFile2URL = null;


// confetti canvas stuff

const winnerModal = document.getElementById("winnerModal");
const winnerText = document.getElementById("winnerText");

const confettiCanvas = document.getElementById("confettiCanvas");
const ctx = confettiCanvas.getContext("2d");


document.addEventListener("DOMContentLoaded", function() {
    fetch('json/abx-questions.json')
        .then(response => response.json())
        .then(data => {
            questions = data;
            initializeApp();
        })
        .catch(error => console.error('Error fetching questions:', error));
});

function initializeApp() {
    const subjectSelect = document.getElementById("subject-select");
    const initTestButton = document.getElementById("init-test");
    const submitAnswerButton = document.getElementById("submit-answer");
    const repeatTestButton = document.getElementById("repeat-test");
    const quitTestButton = document.getElementById("quit-test");

    document.getElementById("custom-a").addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (file) {
            customFile1URL = URL.createObjectURL(file);
        }
    });
    
    document.getElementById("custom-b").addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (file) {
            customFile2URL = URL.createObjectURL(file);
        }
    });
    

    subjectSelect.innerHTML = '';

    let subjects = [...new Set(questions.map(q => q.subject))];
    subjects.push("any");
    subjects.forEach(subject => {
        let option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
    });

    initTestButton.addEventListener("click", function() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        numTrials = parseInt(document.getElementById("num-trials").value, 10);
        currentSubject = document.getElementById("subject-select").value;
        currentTrial = 0;
        score = 0;
        answers = [];
        document.getElementById("initial-screen").style.display = "none";
        document.getElementById("test-screen").style.display = "block";
        nextTrial();
    });

    submitAnswerButton.addEventListener("click", function() {
        const selected = document.querySelector(".choose-btn.active");
        if (!selected) return;

        let correctAnswer = audioX.src === audioA.src ? "A" : "B";
        if ((selected.id === "x-is-a" && correctAnswer === "A") || (selected.id === "x-is-b" && correctAnswer === "B")) {
            score++;
        }

        answers.push(selected.id === "x-is-a" ? "A" : "B");
        currentTrial++;

        resetButtons();

        if (currentTrial < numTrials) {
            nextTrial();
        } else {
            showResults();
        }
    });

    repeatTestButton.addEventListener("click", function() {
        document.getElementById("result-screen").style.display = "none";
        document.getElementById("test-screen").style.display = "block";
        currentTrial = 0;
        score = 0;
        answers = [];
        nextTrial();
    });

    quitTestButton.addEventListener("click", function() {
        document.getElementById("result-screen").style.display = "none";
        document.getElementById("initial-screen").style.display = "block";
    });

    document.getElementById("play-a").addEventListener("click", function() {
        switchAudio(audioA, gainNodeA, this);
    });

    document.getElementById("play-x").addEventListener("click", function() {
        switchAudio(audioX, gainNodeX, this);
    });

    document.getElementById("play-b").addEventListener("click", function() {
        switchAudio(audioB, gainNodeB, this);
    });

    document.getElementById("rewind").addEventListener("click", function() {
        if (currentAudio) {
            rewindAudio();
        }
    });

    document.getElementById("restart").addEventListener("click", function() {
        if (currentAudio) {
            restartAudio();
        }
    });

    document.getElementById("forward").addEventListener("click", function() {
        if (currentAudio) {
            forwardAudio();
        }
    });

    document.querySelectorAll(".choose-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            document.querySelectorAll(".choose-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

function switchAudio(audio, gainNode, button) {
    if (currentAudio && currentAudio !== audio) {
        fadeOut(currentAudio.gainNode);
    }

    if (!hasStarted) {
        audioA.currentTime = 0;
        audioB.currentTime = 0;
        audioX.currentTime = 0;
        hasStarted = true;
        console.log("🔁 Starting A/B/X from beginning");
    }

    currentAudio = audio;
    fadeIn(gainNode);
    updateActiveButton(button);
}

function fadeIn(gainNode) {
    if (gainNode) {
        gainNodeA.gain.setValueAtTime(0, audioContext.currentTime);
        gainNodeB.gain.setValueAtTime(0, audioContext.currentTime);
        gainNodeX.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(1, audioContext.currentTime + rampDuration);
    }
}

function fadeOut(gainNode) {
    if (gainNode) {
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + rampDuration);
    }
}

function nextTrial() {
    hasStarted = false;

    const trialInfo = document.getElementById("trial-info");
    const questionText = document.getElementById("question-text");
    trialInfo.textContent = `Trial ${currentTrial + 1} of ${numTrials}`;

    let question;

    if (customFile1URL && customFile2URL) {
        question = {
            file1: customFile1URL,
            file2: customFile2URL,
            subject: "custom",
            question: "Custom ABX Test"
        };
        console.log("🎧 Running custom ABX test");
    } else {
        if (currentSubject === "any") {
            question = questions[Math.floor(Math.random() * questions.length)];
        } else {
            let subjectQuestions = questions.filter(q => q.subject === currentSubject);
            question = subjectQuestions[Math.floor(Math.random() * subjectQuestions.length)];
        }

        if (!question) {
            console.error('No question found for the given subject');
            return;
        }
    }

    questionText.textContent = question.question;
    setupAudioElements(question.file1, question.file2);
}


function setupAudioElements(file1, file2) {
    const audioAObj = createAudioElementWithGainNode(file1);
    audioA = audioAObj.audio;
    gainNodeA = audioAObj.gainNode;

    const audioBObj = createAudioElementWithGainNode(file2);
    audioB = audioBObj.audio;
    gainNodeB = audioBObj.gainNode;

    const fileX = Math.random() < 0.5 ? file1 : file2;
    const audioXObj = createAudioElementWithGainNode(fileX);
    audioX = audioXObj.audio;
    gainNodeX = audioXObj.gainNode;

    audioA.currentTime = 0;
    audioB.currentTime = 0;
    audioX.currentTime = 0;

    gainNodeA.gain.setValueAtTime(0, audioContext.currentTime);
    gainNodeB.gain.setValueAtTime(0, audioContext.currentTime);
    gainNodeX.gain.setValueAtTime(0, audioContext.currentTime);

    audioA.play();
    audioB.play();
    audioX.play();

    verifyConnections(audioA, "A");
    verifyConnections(audioB, "B");
    verifyConnections(audioX, "X");
}


function createAudioElementWithGainNode(file) {
    const audio = new Audio(file);
    audio.loop = true;

    const gainNode = audioContext.createGain();
    const source = audioContext.createMediaElementSource(audio);

    source.connect(gainNode).connect(audioContext.destination);

    // Store source for later fade/fadeout use
    audio.source = source;

    return {
        audio,
        gainNode
    };
}


function resetButtons() {
    document.querySelectorAll(".choose-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".play-btn").forEach(b => b.classList.remove("active"));
    if (currentAudio) {
        fadeOut(currentAudio.gainNode);
        setTimeout(() => {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }, rampDuration * 1000);
    }
}

function updateActiveButton(button) {
    document.querySelectorAll(".play-btn").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
}

function rewindAudio() {
    if (audioA) audioA.currentTime -= 1;
    if (audioB) audioB.currentTime -= 1;
    if (audioX) audioX.currentTime -= 1;
}

function restartAudio() {
    if (audioA) audioA.currentTime = 0;
    if (audioB) audioB.currentTime = 0;
    if (audioX) audioX.currentTime = 0;
}

function forwardAudio() {
    if (audioA) audioA.currentTime += 1;
    if (audioB) audioB.currentTime += 1;
    if (audioX) audioX.currentTime += 1;
}

function showResults() {
    document.getElementById("test-screen").style.display = "none";
    document.getElementById("result-screen").style.display = "block";
    const scoreDiv = document.getElementById("score");
    const feedbackDiv = document.getElementById("feedback");

    scoreDiv.textContent = `Correct answers: ${score} of ${numTrials}`;

    const pValue = calculateBinomialPValue(score, numTrials, 0.5);
    const percent = Math.round((score / numTrials) * 100);

    let feedback = `Accuracy: ${percent}%\n`;

    if (pValue < 0.05) {
        feedback += "🎉 Parabéns! Resultado é estatisticamente significante (p < 0.05)\nVocê parece ouvir a diferença!";

        // confetti canvas call

        confettiBurst();
        new Audio('/audio/cheer.mp3').play();
    } else {
        feedback += "🤔 Resultado não é estatisticamente significante\nVocê pode estar adivinhando. Tente de novo com mais questões.";
    }

    feedback += `\np-value ≈ ${pValue.toFixed(4)}`;
    feedbackDiv.textContent = feedback;
}


function verifyConnections(audio, label) {
    if (!audio.source) {
        console.warn(`⚠️ ${label} audio source not connected`);
    }
    if (!audio.src) {
        console.warn(`⚠️ ${label} has no src`);
    }
}

// estatísticas de resultado

function calculateBinomialPValue(k, n, p) {
    let cumulative = 0;
    for (let i = k; i <= n; i++) {
        cumulative += binomialProbability(i, n, p);
    }
    return cumulative;
}

function binomialProbability(k, n, p) {
    const comb = factorial(n) / (factorial(k) * factorial(n - k));
    return comb * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function factorial(x) {
    if (x === 0) return 1;
    let prod = 1;
    for (let i = 1; i <= x; i++) prod *= i;
    return prod;
}


// CONFETTI CANVAS CODE

function confettiBurst() {
    const confettiCount = 300;
    const confetti = [];
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

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
      requestAnimationFrame(draw);
    }
    draw();
    setTimeout(() => ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height), 3000);
  }

// tooltip

const tooltip = document.getElementById('tooltip-text')

tooltip.innerHTML = `Teste sua audição com o teste ABX. A e B são sempre os mesmos arquivos. O X é escolhido aleatoriamente a cada questão. Você tem que adivinhar se o X da questão é A ou B. Esses testes são ótimos para diagnosticar se percebemos diferenças muito sutis entre 2 arquivos sonoros. Você pode usar alguns presets ou carregar seus próprios arquivos.`