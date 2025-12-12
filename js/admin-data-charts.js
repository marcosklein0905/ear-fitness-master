// adminMetricsFake.js
// This version is modified to work with a manually selected user (not current auth user)

import { db, collection, getDocs } from "../firebaseInfo/firebase.js";

export let missedFrequenciesChart;
export let scoreProgressChart;

// Export chart images with user context
export function exportMissedFrequenciesChart(userId) {
  if (!missedFrequenciesChart) {
    alert("Chart not loaded yet!");
    return;
  }
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const fileName = `SineWaveTrainer_MissedFrequencies_${userId}_${timestamp}.png`;
  const link = document.createElement('a');
  link.href = missedFrequenciesChart.toBase64Image();
  link.download = fileName;
  link.click();
}

export function exportScoreProgressChart(userId) {
  if (!scoreProgressChart) {
    alert("Chart not loaded yet!");
    return;
  }
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0];
  const fileName = `SineWaveTrainer_ScoreProgress_${userId}_${timestamp}.png`;
  const link = document.createElement('a');
  link.href = scoreProgressChart.toBase64Image();
  link.download = fileName;
  link.click();
}

// Main fetch function for missed frequencies with date filtering
export async function fetchMissedFrequenciesFake(userId, date, timeFilter) {
  const selectedTimestamp = new Date(date + "T00:00:00");
  let startTimestamp, endTimestamp;

  if (timeFilter === "day") {
    startTimestamp = new Date(selectedTimestamp);
    startTimestamp.setHours(0, 0, 0, 0);
    endTimestamp = new Date(selectedTimestamp);
    endTimestamp.setHours(23, 59, 59, 999);
  } else if (timeFilter === "week") {
    const dayOfWeek = selectedTimestamp.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    startTimestamp = new Date(selectedTimestamp);
    startTimestamp.setDate(startTimestamp.getDate() + diffToMonday);
    startTimestamp.setHours(0, 0, 0, 0);
    endTimestamp = new Date(startTimestamp);
    endTimestamp.setDate(endTimestamp.getDate() + 6);
    endTimestamp.setHours(23, 59, 59, 999);
  } else if (timeFilter === "month") {
    startTimestamp = new Date(selectedTimestamp.getFullYear(), selectedTimestamp.getMonth(), 1);
    startTimestamp.setHours(0, 0, 0, 0);
    endTimestamp = new Date(selectedTimestamp.getFullYear(), selectedTimestamp.getMonth() + 1, 0);
    endTimestamp.setHours(23, 59, 59, 999);
  }

  const startMillis = startTimestamp.getTime();
  const endMillis = endTimestamp.getTime();

  const sessionsRef = collection(db, "users", userId, "sessions");
  const sessionSnapshot = await getDocs(sessionsRef);
  let missedFrequencyCounts = {};

  const sessionPromises = sessionSnapshot.docs.map(async (sessionDoc) => {
    const sessionData = sessionDoc.data();
    if (!sessionData.sessionStart) return;

    const sessionStartMillis = sessionData.sessionStart.toMillis();
    if (sessionStartMillis >= startMillis && sessionStartMillis <= endMillis) {
      const missedQuestionsRef = collection(sessionDoc.ref, "missedQuestions");
      const missedQuestionsSnapshot = await getDocs(missedQuestionsRef);

      missedQuestionsSnapshot.forEach((missedDoc) => {
        const missedData = missedDoc.data();
        const freq = missedData.challengeFrequency;
        if (freq) {
          missedFrequencyCounts[freq] = (missedFrequencyCounts[freq] || 0) + 1;
        }
      });
    }
  });

  await Promise.all(sessionPromises);

  const labels = Object.keys(missedFrequencyCounts).map(freq => `${freq} Hz`);
  const data = Object.values(missedFrequencyCounts);
  updateMissedFrequenciesChart(labels, data);
}

function updateMissedFrequenciesChart(labels, data) {
  const ctx = document.getElementById("missedFrequenciesChart").getContext("2d");
  if (missedFrequenciesChart) missedFrequenciesChart.destroy();
  missedFrequenciesChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Missed Frequencies",
        data: data,
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } },
      layout: { padding: 10 }
    }
  });
}

export async function fetchScoreProgressFake(userId) {
  const sessionsRef = collection(db, "users", userId, "sessions");
  const sessionSnapshot = await getDocs(sessionsRef);

  let scoreData = [];
  sessionSnapshot.forEach((sessionDoc) => {
    const sessionData = sessionDoc.data();
    if (sessionData.appName === "Sine Wave Trainer" && sessionData.finalScore !== undefined) {
      scoreData.push({
        date: sessionData.sessionStart.toDate().toLocaleDateString(),
        score: sessionData.finalScore
      });
    }
  });

  scoreData.sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = scoreData.map(session => session.date);
  const scores = scoreData.map(session => session.score);

  updateScoreProgressChart(labels, scores);
}

function updateScoreProgressChart(labels, scores) {
  const ctx = document.getElementById("scoreProgressChart").getContext("2d");
  if (scoreProgressChart) scoreProgressChart.destroy();
  scoreProgressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Score Progress (%)",
        data: scores,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        borderWidth: 2,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100 } },
      animation: { tension: 0.4 }
    }
  });
}
