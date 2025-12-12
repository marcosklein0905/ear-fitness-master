import { db, auth, collection, doc, addDoc, setDoc, updateDoc, serverTimestamp } from "../firebaseInfo/firebase.js";

import { showFireworks } from './fireworks.js';

let sessionId;
let sessionStartTime = null

let frequencyUsage = {};

document.addEventListener('DOMContentLoaded', () => {

    
    const modeSelect = document.getElementById('mode')
    const numQuestionsInput = document.getElementById('num-questions')
    const waveformSelect = document.getElementById('waveform')
    const gainSlider = document.getElementById('gain')
    const customModeDiv = document.getElementById('custom-mode')
    const customFrequenciesInput = document.getElementById('custom-frequencies')
    const startQuizButton = document.getElementById('start-quiz')
    const quizDiv = document.getElementById('quiz')
    const questionNumberH2 = document.getElementById('question-number')
    const playFrequencyButton = document.getElementById('play-frequency')
    const answersDiv = document.getElementById('answers')
    const nextQuestionButton = document.getElementById('next-question')
    const resultDiv = document.getElementById('result')
    const scoreSpan = document.getElementById('score')
    const quitButton = document.getElementById('quit')

    let quizMode = ''
    let numQuestions = 10
    let waveform = 'sine'
    let gainValue = 0.6
    let customFrequencies = []
    let currentQuestion = 0
    let score = 0
    let frequencies = []
    let correctAnswer = 0

    const easyMode = [ 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 ]
    const expertMode = [ 63, 80, 100, 125, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
        2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000 ]

    modeSelect.addEventListener('change', (e) => {
        quizMode = e.target.value
        customModeDiv.style.display = quizMode === 'custom' ? 'block' : 'none'
    });

    numQuestionsInput.addEventListener('input', (e) => {
        numQuestions = parseInt(e.target.value, 10)
    })

    waveformSelect.addEventListener('change', (e) => {
        waveform = e.target.value
    })

    gainSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value)
        gainValue = isFinite(value) ? value : 0.6
    })
    
    customFrequenciesInput.addEventListener('change', (e) => {
        const file = e.target.files[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                const text = event.target.result
                customFrequencies = text.split(',').map(freq => parseFloat(freq.trim()))
            }
            reader.readAsText(file)
        }
    })

    startQuizButton.addEventListener('click', () => {
        if(!quizMode) {
            alert('Por favor, escolha um modo de jogo')
            return
        }
        startSineWaveSession(quizMode, numQuestions, waveform, customFrequencies);
        startQuiz()
    })


    playFrequencyButton.addEventListener('click', playFrequency)
    nextQuestionButton.addEventListener('click', nextQuestion)
 
    quitButton.addEventListener('click', () => {
        quizDiv.style.display = 'none'
        resultDiv.style.display = 'none'
        document.getElementById('quiz-config').style.display = 'block'
    })

    function startQuiz() {

        sessionStartTime = Date.now(); // ✅ Track the session start time to Firebase

        currentQuestion = 0
        score = 0
        quizDiv.style.display = 'block'
        resultDiv.style.display = 'none'
        document.getElementById('quiz-config').style.display = 'none'
        frequencies = quizMode === 'easy' ? easyMode : (quizMode === 'expert' ? expertMode : customFrequencies)
        nextQuestion()
    }

    function nextQuestion() {
        if (currentQuestion >= numQuestions) {
            showResult()
            return
        }
        questionNumberH2.textContent = `Questão ${currentQuestion + 1} de ${numQuestions}`
        playFrequencyButton.textContent = 'Play'
        playFrequencyButton.disabled = false
        answersDiv.style.display = 'none'
        nextQuestionButton.style.display = 'none'
        currentQuestion++
    }

    function playFrequency() {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
    
        // Initialize usage count if it's the first time
        if (!frequencyUsage || Object.keys(frequencyUsage).length === 0) {
            frequencyUsage = Object.fromEntries(frequencies.map(freq => [freq, 0]));
        }
    
        // Filter eligible frequencies (used less than 2 times)
        const eligibleFrequencies = frequencies.filter(freq => frequencyUsage[freq] < 2);
    
        if (eligibleFrequencies.length === 0) {
            // Reset usage if all are exhausted
            frequencyUsage = Object.fromEntries(frequencies.map(freq => [freq, 0]));
        }
    
        // Pick from eligible frequencies again (after potential reset)
        const finalPool = frequencies.filter(freq => frequencyUsage[freq] < 2);
        correctAnswer = finalPool[Math.floor(Math.random() * finalPool.length)];
        frequencyUsage[correctAnswer]++;
    
        oscillator.type = waveform;
        oscillator.frequency.value = correctAnswer;
    
        const currentGainValue = isFinite(gainValue) ? gainValue : 0.6;
        gainNode.gain.value = currentGainValue;
    
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
    
        const attack = 0.1;
        const release = 0.1;
        const duration = 3.0;
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(currentGainValue, context.currentTime + attack);
        gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration - release);
    
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);
    
        playFrequencyButton.disabled = true;
        setTimeout(() => {
            generateAnswers();
            answersDiv.style.display = 'block';
        }, duration * 1000);
    }
    
    function generateAnswers() {
        const answers = new Set();
        answers.add(correctAnswer);

        // Sort other frequencies by closeness
        const sortedFrequencies = frequencies
            .filter(freq => freq !== correctAnswer)
            .sort((a, b) => Math.abs(a - correctAnswer) - Math.abs(b - correctAnswer));

        for (let freq of sortedFrequencies) {
            if (answers.size >= 4) break;
            answers.add(freq);
        }

        // Convert to array and shuffle
        const answersArray = Array.from(answers).sort(() => Math.random() - 0.5);

        answersDiv.innerHTML = '';
        answersArray.forEach(answer => {
            const button = document.createElement('button');
            // 🔧 Formatação com no máximo 2 casas decimais
            button.textContent = Number(answer.toFixed(2));
            button.addEventListener('click', () => checkAnswer(answer, button));
            answersDiv.appendChild(button);
        });

        console.log("Answers:", answersArray); // optional debug
    }
    
    

    function checkAnswer(selectedAnswer, button) {
        if (selectedAnswer === correctAnswer) {
            button.style.backgroundColor = 'green';
            score++;
        } else {
            button.style.backgroundColor = 'red';

            // Save missed question in Firestore
            saveMissedQuestion(correctAnswer, selectedAnswer);

            Array.from(answersDiv.children).forEach(btn => {
                //  Comparação numérica robusta
                if (Number(btn.textContent) === correctAnswer) {
                    btn.style.backgroundColor = 'green';
                }
            });
        }
        Array.from(answersDiv.children).forEach(btn => btn.disabled = true);
        nextQuestionButton.style.display = 'block';
    }



    function showResult() {
        quizDiv.style.display = 'none';
        resultDiv.style.display = 'block';
    
        const percentage = Math.round((score / numQuestions) * 100);
        scoreSpan.textContent = `${score} respostas corretas (${percentage}%)`;
    
        const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
        endSineWaveSession(score, numQuestions - score, timeSpent);
    
        if (percentage >= 90) {
            showFireworks({ duration: 5000, bursts: 7 });
        }
    }
    

    async function startSineWaveSession(mode, numQuestions, waveform, customFrequencies) {
        try {
            const user = auth.currentUser;
            if (!user) return console.warn("No user logged in!");

            sessionId = `${Date.now()}`; // Unique ID for this session

            const sessionRef = doc(db, "users", user.uid, "sessions", sessionId);

            await setDoc(sessionRef, {
                appName: "Sine Wave Trainer",
                sessionStart: serverTimestamp(),
                sessionEnd: null,
                timeSpent: null,
                mode,
                numQuestions,
                waveform,
                customFrequencies: mode === "custom" ? customFrequencies : [],
                totalCorrect: 0,
                totalMistakes: 0,
                finalScore: 0
            });

            console.log(`Sine Wave Session Started! Session ID: ${sessionId}`);
        } catch (error) {
            console.error("Error starting sine wave session:", error);
        }
    }

    async function saveMissedQuestion(challengeFrequency, userAnswer) {
        try {
            const user = auth.currentUser;
            if (!user || !sessionId) return;

            const missedQuestionsRef = collection(db, "users", user.uid, "sessions", sessionId, "missedQuestions");

            await addDoc(missedQuestionsRef, {
                challengeFrequency,
                userAnswer
            });

            console.log(`Missed Question Logged: ${userAnswer} (Correct: ${challengeFrequency})`);
        } catch (error) {
            console.error("Error saving missed question:", error);
        }
    }



    async function endSineWaveSession(totalCorrect, totalMistakes, timeSpent) {
        try {
            const user = auth.currentUser;
            if (!user || !sessionId) return;

            const sessionRef = doc(db, "users", user.uid, "sessions", sessionId);

            const finalScore = Math.round((totalCorrect / (totalCorrect + totalMistakes)) * 100);

            await updateDoc(sessionRef, {
                sessionEnd: serverTimestamp(),
                timeSpent,
                totalCorrect,
                totalMistakes,
                finalScore
            });

            console.log(`🏁 Sine Wave Session Ended! Final Score: ${finalScore}%`);
        } catch (error) {
            console.error("Error ending sine wave session:", error);
        }
    }




})
