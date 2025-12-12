import { db, 
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, 
  doc, 
  updateDoc, 
  setDoc,
  addDoc,
  signOut, 
  serverTimestamp, 
  getDoc,
  getDocs,
  query,
  where,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  collection } from "../firebaseInfo/firebase.js";


// Select elements
const loginButton = document.getElementById("login-button");
const registerButton = document.getElementById("register-button");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginForm = document.getElementById("login-form");
const dashboardContainer = document.getElementById("dashboard-container");

const logoutUser = document.getElementById("logout-user")

const profilePic = document.getElementById("profile-pic");
const profileUpload = document.getElementById("profile-upload");


// Reference to the user list container in the DOM
const userListContainer = document.getElementById("user-list");

const usersRef = collection(db, "users");

const totalTimeElement = document.getElementById("total-time");

let currentSessionRef = null;
let sessionStartTime = null;


let userId = null
const eqDataContainer = document.getElementById('eq-fitness-data')

// PLAYLIST DIV 

let allSongs = [];
let renderIndex = 0;
const SONGS_PER_PAGE = 10;

  document.getElementById("load-playlist").addEventListener("click", () => {
      document.getElementById("playlist-songs").innerHTML = "";
      fetchEQFitnessPlaylist();
  });

  document.getElementById("show-more").addEventListener("click", () => {
      renderNextSongs();
  });

  document.getElementById("close-playlist").addEventListener("click", () => {
      closePlaylist();
  });

// CHART VISUALIZATION

let eqScoreProgressChart;

// INVENTORY SECTION

let visibleDrillCount = 0;
const DRILLS_PER_PAGE = 5;
let allDrills = [], eqSessions = [], sineSessions = [];


//  Register New User
registerButton.addEventListener("click", async () => {
const userName = nameInput.value.trim();
const userEmail = emailInput.value.trim();
const userPassword = passwordInput.value.trim();

if (!userName || !userEmail || !userPassword) {
 alert("Please fill in all fields.");
 return;
}

try {
 const userCredential = await createUserWithEmailAndPassword(auth, userEmail, userPassword);
 const userId = userCredential.user.uid;

 // Store user details in Firestore
 await setDoc(doc(db, "users", userId), {
     name: userName,
     email: userEmail,
     createdAt: serverTimestamp(),
 });

 alert("Registration successful! You can now log in.");

//    fetchAndDisplayUsers();
 
} catch (error) {
 console.error("Registration Error:", error.message);
 alert(error.message);
}
});

// Login Existing User
loginButton.addEventListener("click", async () => {
const userEmail = emailInput.value.trim();
const userPassword = passwordInput.value.trim();

if (!userEmail || !userPassword) {
 alert("Please enter your email and password.");
 return;
}

try {
 const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
 console.log("User logged in:", userCredential.user.email);
 alert("Login successful!");

//    fetchAndDisplayUsers();



 // Redirect to Dashboard
 document.querySelector(".login-form").style.display = "none";
 document.querySelector(".container").style.display = "block";

 
} catch (error) {
 console.error("Error logging in:", error.message);
 alert(error.message);
}
});

// When clicking "Upload Picture", trigger the file selection window
profilePic.addEventListener("click", () => {
profileUpload.click(); // Opens the file selection window
});

// When a file is selected, handle the upload
profileUpload.addEventListener("change", async () => {
const file = profileUpload.files[0];
if (!file) {
 alert("No file selected.");
 return;
}

const user = auth.currentUser;
if (!user) {
 alert("You must be logged in to upload a profile picture.");
 return;
}

const storageRef = ref(storage, `users/${user.uid}/profilePicture`);

try {
 await uploadBytes(storageRef, file);
 const downloadURL = await getDownloadURL(storageRef);

 // Save image URL to Firestore
 const userRef = doc(db, "users", user.uid);
 await updateDoc(userRef, { profilePic: downloadURL });

 // Update UI
 profilePic.src = downloadURL;
 alert("Profile picture updated!");
} catch (error) {
 console.error("Upload error:", error);
 alert("Error uploading profile picture.");
}
});


// =============== AUTHENICATION STUFF ====================== //


onAuthStateChanged(auth, async (user) => {
if (user) {
 sessionStartTime = Date.now();
 console.log("User session started:", sessionStartTime);

 const userRef = doc(db, "users", user.uid);
 let userSnap = await getDoc(userRef);
 let userData;

 // Prevent storing "Unknown" users
 if (!user.email) {
     console.error("User email missing, login rejected!");
     alert("Login error: Please register with a valid email.");
     await signOut(auth); // Force logout
     return;
 }

 if (userSnap.exists()) {
     userData = userSnap.data();
 } else {
     console.log("New user detected. Creating profile...");

     // ✅ Only allow account creation if name is available
     if (!user.displayName) {
         console.error("Missing user name. Cannot create user record.");
         alert("Registration failed: Please provide a valid name.");
         await signOut(auth);
         return;
     }

     userData = {
         name: user.displayName,
         email: user.email,
         createdAt: serverTimestamp(),
     };

     await setDoc(userRef, userData);
 }

 // Display user name in UI
 const userWelcome = document.getElementById("user-welcome");
 if (userWelcome) {
     userWelcome.textContent = `Welcome, ${userData?.name || "User"}!`;
 }

 //  Load profile picture if available
 if (userData.profilePic) {
     profilePic.src = userData.profilePic;
 }

 // Store user info in sessionStorage (Plugged Here)
 sessionStorage.setItem("userDisplayName", userData?.name || "User");
 sessionStorage.setItem("userPhotoURL", userData?.profilePic || "img/default-avatar-profile-icon.avif");

 // ✅ Show dashboard, hide login form
 dashboardContainer.style.display = "block";
 loginForm.style.display = "none";


} else {
 //  Show login form if user isn't authenticated
 loginForm.style.display = "block";
 dashboardContainer.style.display = "none";
}
});


//  Handle User Logout


logoutUser.addEventListener("click", async () => {
if (!auth.currentUser || !currentSessionRef) {
 console.warn("No active session to save.");
 await signOut(auth);
 alert("Logged out successfully!");
 location.reload();
 return;
}

const sessionEndTime = Date.now();
const sessionDuration = Math.floor((sessionEndTime - sessionStartTime) / 1000);

try {
 // Save session data before logging out
 await updateDoc(currentSessionRef, {
     sessionEnd: serverTimestamp(),
     timeSpent: sessionDuration,
 });

 console.log("Session saved before logout:", sessionDuration, "seconds");

 await signOut(auth);
 alert("Logged out successfully!");
 loginForm.style.display = 'block'
 dashboardContainer.style.display = 'none'
 location.reload();
} catch (error) {
 console.error("Logout Error:", error.message);
 alert("Error saving session. Try again.");
}
});


// ===================== DASHBOARD UI FUNCTIONS ============================ //

// ================= Registered Users UI Display ============================ //

async function fetchAndDisplayUsers() {
try {
 const querySnapshot = await getDocs(usersRef);
 userListContainer.innerHTML = ""; // Clear previous users

 querySnapshot.forEach((doc) => {
     const userData = doc.data();
     const userName = userData.name?.trim() || ""; // Prevents null or blank names
     const profilePic = userData.profilePic || "img/default-avatar-profile-icon.avif"; // Default avatar

     // ✅ Skip users with missing or "Unknown" names
     if (!userName || userName.toLowerCase() === "unknown") {
         console.warn(`Skipping invalid user entry: ${doc.id}`);
         return;
     }

     // ✅ Create user card
     const userCard = document.createElement("div");
     userCard.classList.add("user-card");

     userCard.innerHTML = `
         <img src="${profilePic}" alt="Profile Picture" class="user-profile-pic"
              onerror="this.onerror=null; this.src='img/default-avatar-profile-icon.avif';"> 
         <p class="user-name">${userName}</p>
     `;

     // ✅ Append to user list
     userListContainer.appendChild(userCard);
 });

 // console.log("User list updated.");
} catch (error) {
 console.error("Error fetching users:", error);
}
}



// ================= Registered Users Apps activity ============================ //

async function fetchAndDisplayActivity() {
try {
 const usersRef = collection(db, "users");
 const usersSnapshot = await getDocs(usersRef);

 const activityList = document.getElementById("activity-list");
 activityList.innerHTML = ""; // Clear previous updates

 let activities = [];

 // ✅ Create an array of session fetch promises
 const sessionPromises = usersSnapshot.docs.map(async (userDoc) => {
     const userData = userDoc.data();
     const userName = userData.name || "Unknown";
     const profilePic = userData.profilePic || "img/default-avatar-profile-icon.avif";

     const sessionsRef = collection(userDoc.ref, "sessions");
     const sessionSnapshot = await getDocs(sessionsRef);

     sessionSnapshot.forEach((sessionDoc) => {
         const sessionData = sessionDoc.data();
         if (sessionData.sessionStart && sessionData.sessionEnd && sessionData.timeSpent) {
             const formattedTime = formatTime(sessionData.timeSpent);
             const appName = sessionData.appName || "Unknown App";

             if (appName === "Unknown App") return;

             activities.push({
                 name: userName,
                 profilePic,
                 appName,
                 formattedTime,
                 timestamp: sessionData.sessionEnd?.toMillis() || 0, // Sort by most recent
             });
         }
     });
 });

 // 🚀 Fetch all user sessions in parallel
 await Promise.all(sessionPromises);

 // Sort & Slice Efficiently
 const recentActivities = activities
     .sort((a, b) => b.timestamp - a.timestamp) // Sort by most recent
     .slice(0, 5); // Keep only the latest 10 activities

 // Reduce DOM Manipulation (Better Rendering Performance)

 const fragment = document.createDocumentFragment();
 recentActivities.forEach(activity => {
     const activityCard = document.createElement("div");
     activityCard.classList.add("activity-card");

     activityCard.innerHTML = `
         <img src="${activity.profilePic}" alt="Profile Picture" class="user-profile-pic"
              onerror="this.onerror=null; this.src='img/default-avatar-profile-icon.avif';">
         <p><b>${activity.name}</b> practiced <b>${activity.appName}</b> for <b>${activity.formattedTime}</b>.</p>
     `;

     fragment.appendChild(activityCard);
 });

 activityList.appendChild(fragment); // 🚀 Add all at once (efficient!)

 console.log("✅ Activity feed updated.");

} catch (error) {
 console.error("🔥 Error fetching activity feed:", error);
}
}

// =============== DISPLAY EQ FITNESS PERFORMANCE DATA ====================== /


// EQ FITNESS CHART SCORE PROGRESS START

// ✅ EQ Fitness Score Progress Chart
async function fetchEQScoreProgress() {
const user = auth.currentUser;
if (!user) return;

const sessionsRef = collection(db, "users", user.uid, "sessions");
const sessionSnapshot = await getDocs(sessionsRef);

let scoreData = [];

sessionSnapshot.forEach((sessionDoc) => {
 const sessionData = sessionDoc.data();
 if (sessionData.sessionStart && sessionData.totalQuestions && sessionData.finalScore !== undefined) {
     scoreData.push({
         date: sessionData.sessionStart.toDate().toLocaleDateString(),
         score: sessionData.finalScore
     });
 }
});

scoreData.sort((a, b) => new Date(a.date) - new Date(b.date));

const labels = scoreData.map(session => session.date);
const scores = scoreData.map(session => session.score);

const ctx = document.getElementById("eqScoreProgressChart").getContext("2d");

if (eqScoreProgressChart) eqScoreProgressChart.destroy();

eqScoreProgressChart = new Chart(ctx, {
 type: "line",
 data: {
     labels,
     datasets: [{
         label: "EQ Fitness Score (%)",
         data: scores,
         borderColor: "rgba(153, 102, 255, 1)",
         backgroundColor: "rgba(153, 102, 255, 0.2)",
         borderWidth: 2,
         fill: true
     }]
 },
 options: {
     responsive: true,
     maintainAspectRatio: false,
     scales: {
         y: {
             beginAtZero: true,
             max: 100
         }
     },
     animation: {
         tension: 0.4
     }
 }
});
}

document.getElementById("export-eq-score-chart").addEventListener("click", () => {
if (!eqScoreProgressChart) {
 alert("Chart not loaded yet!");
 return;
}

const user = auth.currentUser;
const username = user ? (user.email?.split('@')[0] || user.uid) : "UnknownUser";
const timestamp = new Date().toISOString().split('T')[0];

const link = document.createElement('a');
link.href = eqScoreProgressChart.toBase64Image();
link.download = `EQFitness_ScoreProgress_${username}_${timestamp}.png`;
link.click();
});

document.getElementById("eqScoreProgressChart").addEventListener("click", () => {
if (!eqScoreProgressChart) return;
document.getElementById("eq-score-chart-modal").style.display = "flex";

const modalCtx = document.getElementById("eqScoreModalChart").getContext("2d");
if (window.eqModalScoreChart) window.eqModalScoreChart.destroy();

window.eqModalScoreChart = new Chart(modalCtx, {
 type: eqScoreProgressChart.config.type,
 data: JSON.parse(JSON.stringify(eqScoreProgressChart.config.data)),
 options: eqScoreProgressChart.config.options
});
});

document.getElementById("close-eq-score-modal").addEventListener("click", () => {
document.getElementById("eq-score-chart-modal").style.display = "none";
if (window.eqModalScoreChart) window.eqModalScoreChart.destroy();
});

// ====================== EQ FITNESS CHART SCORE PROGRESS END ============================= //


// ====================== EQ FITNESS MISSED FREQUENCIES TABLE START ============================= //

// ✅ EQ Fitness Missed Frequencies Table
async function fetchEQMissedFrequenciesTable() {
const user = auth.currentUser;
if (!user) return;

const sessionsRef = collection(db, "users", user.uid, "sessions");
const sessionSnapshot = await getDocs(sessionsRef);

const pinkNoise = {};
const music = {};

const missedQuestionsPromises = sessionSnapshot.docs.map(async (sessionDoc) => {
 const sessionData = sessionDoc.data();
 if (!sessionData.sessionStart) return;

 const playbackMode = sessionData.settings?.playbackMode || "unknown";

 const missedQuestionsRef = collection(sessionDoc.ref, "missedQuestions");
 const missedQuestionsSnapshot = await getDocs(missedQuestionsRef);

 missedQuestionsSnapshot.forEach((missedDoc) => {
     const freq = missedDoc.data().correctFrequency;
     if (!freq) return;

     if (playbackMode === "pink-noise") {
         pinkNoise[freq] = (pinkNoise[freq] || 0) + 1;
     } else if (playbackMode === "music") {
         music[freq] = (music[freq] || 0) + 1;
     }
 });
});

await Promise.all(missedQuestionsPromises);

const tbody = document.getElementById("missed-frequencies-body");
tbody.innerHTML = "";

const allFreqs = new Set([...Object.keys(pinkNoise), ...Object.keys(music)]);

allFreqs.forEach(freq => {
 const row = document.createElement("tr");
 row.innerHTML = `
     <td>${pinkNoise[freq] ? freq : ""}</td>
     <td>${pinkNoise[freq] || ""}</td>
     <td>${music[freq] ? freq : ""}</td>
     <td>${music[freq] || ""}</td>
 `;
 tbody.appendChild(row);
});
}



// ====================== EQ FITNESS MISSED FREQUENCIES TABLE END ============================= //



// Helper function to format time into minutes
function formatTime(seconds) {
if (seconds < 60) return `${seconds} segundos`;
return `${Math.floor(seconds / 60)} minutos`;
}




// ============================ EQ FITNESS USER'S PLAYLIST INFO ================================



async function fetchEQFitnessPlaylist() {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const songsSet = new Set();

    const userPromises = usersSnapshot.docs.map(async (userDoc) => {
        const sessionsRef = collection(db, "users", userDoc.id, "sessions");
        const sessionsSnapshot = await getDocs(sessionsRef);

        sessionsSnapshot.forEach((sessionDoc) => {
            const sessionData = sessionDoc.data();
            const audioFile = sessionData.settings?.audioFile;
            if (audioFile && audioFile.toLowerCase() !== "none") {
                songsSet.add(audioFile.trim());
            }
        });
    });

    await Promise.all(userPromises);

    allSongs = Array.from(songsSet);
    renderIndex = 0;
    renderNextSongs();
}

function renderNextSongs() {
    const playlistContainer = document.getElementById("playlist-songs");
    const loadPlaylistBtn = document.getElementById("load-playlist");
    const showMoreBtn = document.getElementById("show-more");
    const closePlaylistBtn = document.getElementById("close-playlist");

    const nextSongs = allSongs.slice(renderIndex, renderIndex + SONGS_PER_PAGE);
    nextSongs.forEach(song => {
        const songItem = document.createElement("li");
        songItem.textContent = song;
        playlistContainer.appendChild(songItem);
    });

    renderIndex += SONGS_PER_PAGE;

    if (renderIndex >= allSongs.length) {
        showMoreBtn.style.display = "none";
        closePlaylistBtn.style.display = "block";
    } else {
        showMoreBtn.style.display = "block";
        closePlaylistBtn.style.display = "none";
    }

    loadPlaylistBtn.style.display = "none";
}

function closePlaylist() {
    const playlistContainer = document.getElementById("playlist-songs");
    const loadPlaylistBtn = document.getElementById("load-playlist");
    const showMoreBtn = document.getElementById("show-more");
    const closePlaylistBtn = document.getElementById("close-playlist");

    playlistContainer.innerHTML = "";
    allSongs = [];
    renderIndex = 0;
    loadPlaylistBtn.style.display = "block";
    showMoreBtn.style.display = "none";
    closePlaylistBtn.style.display = "none";
}

// ===================================== GAMIFICATION !!! ============================= //

// INVENTORY FUNCTIONS

async function loadDrillPlan() {
  const res = await fetch("/json/semana-drills.json");
  return await res.json();
}

function isSameArray(a, b) {
  if (a.length !== b.length) return false;
  return a.every((val, i) => parseInt(val) === parseInt(b[i]));
}

function createProgressBar(label, current, max, lastScore, avgScore) {
  const percent = Math.min(Math.round((current / max) * 100), 100);
  return `
    <div class="drill">
      <p>${label}: ${current}/${max} ${percent === 100 ? '✅ Completa!' : ''}</p>
      <div class="progress-bar"><div class="progress-fill ${percent === 100 ? 'progress-complete' : 'progress-incomplete'}" style="width: ${percent}%"></div></div>
      <p class="stats">Último score: ${lastScore ?? '-'} | Média da semana: ${avgScore ?? '-'}</p>
    </div>
  `;
}

function renderVisibleDrills() {
  const drillContainer = document.getElementById("drill-progress");
  drillContainer.innerHTML = "";

  allDrills.slice(0, visibleDrillCount).forEach(drill => {
    const sineMatches = sineSessions.filter(s =>
      s.mode === drill.sineWaveTrainerMode &&
      (drill.sineWaveTrainerMode !== "custom" || isSameArray(s.customFrequencies || [], drill.sineWaveTrainerCustomFreq))
    );

    const eqMatches = eqSessions.filter(s => {
      const st = s.settings || {};
      return st.presetUsed === String(drill.EQFitnessPresetUsed) &&
             st.playbackMode === drill.EQFitnessPlaybackMode &&
             st.gainCombination === drill.EQFitnessGainCombination;
    });

    const sineAvg = Math.round(sineMatches.reduce((a, b) => a + (b.finalScore || 0), 0) / (sineMatches.length || 1));
    const eqAvg = Math.round(eqMatches.reduce((a, b) => a + (b.finalScore || 0), 0) / (eqMatches.length || 1));

    const sineLast = sineMatches.at(-1)?.finalScore ?? null;
    const eqLast = eqMatches.at(-1)?.finalScore ?? null;

    drillContainer.innerHTML += createProgressBar(`${drill.drillName} (Sine)`, sineMatches.length, drill.totalSineSessionsNeeded, sineLast, sineAvg);
    drillContainer.innerHTML += createProgressBar(`${drill.drillName} (EQ)`, eqMatches.length, drill.totalEQSessionsNeeded, eqLast, eqAvg);
  });

  const toggleBtn = document.getElementById("toggle-drill-btn");
  toggleBtn.textContent = visibleDrillCount >= allDrills.length ? "Close Weeks" : "Show More Weeks";
}

async function updateUserInventoryUI(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    document.getElementById("inventory-user-name").textContent = userData.name || "User";
    if (userData.profilePic) {
      document.getElementById("inventory-profile-pic").src = userData.profilePic;
    }
  }

  const sessionsRef = collection(db, "users", user.uid, "sessions");
  const snapshot = await getDocs(sessionsRef);
  eqSessions = [];
  sineSessions = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.sessionStart || typeof data.finalScore !== "number") return;
    const appName = data.appName || (data.settings ? "EQ Fitness" : null);
    if (appName === "EQ Fitness") eqSessions.push(data);
    if (appName === "Sine Wave Trainer") sineSessions.push(data);
  });

  document.getElementById("sine-coin-count").textContent = sineSessions.length;
  document.getElementById("eq-coin-count").textContent = eqSessions.length;
  document.getElementById("high-score-count").textContent = [...sineSessions, ...eqSessions].filter(s => s.finalScore >= 90).length;

  document.getElementById("streak-eq-count").textContent = countStreaks(eqSessions);
  document.getElementById("streak-sine-count").textContent = countStreaks(sineSessions);
  document.getElementById("effort-count").textContent = countEffortDays([...eqSessions, ...sineSessions]);

  allDrills = await loadDrillPlan();
  visibleDrillCount = DRILLS_PER_PAGE;
  renderVisibleDrills();

  await renderBadges(allDrills, sineSessions, eqSessions);

  await renderCursedCharacters(allDrills, sineSessions, eqSessions);




  // Collect stats for each drill
  const drillStats = {};
  allDrills.forEach(drill => {
    const label = drill.label;
    drillStats[label] = {
      currentEQ: drill.currentEQ,
      currentSine: drill.currentSine,
      maxEQ: drill.maxEQ,
      maxSine: drill.maxSine,
      lastScore: drill.lastScore,
      isComplete: drill.currentEQ >= drill.maxEQ && drill.currentSine >= drill.maxSine
    };
  });

  return drillStats;



}

const drillProgress = document.getElementById("drill-progress");
document.getElementById("toggle-drill-btn").addEventListener("click", () => {
  if (visibleDrillCount === 0) {
    visibleDrillCount = DRILLS_PER_PAGE;
  } else if (visibleDrillCount >= allDrills.length) {
    visibleDrillCount = 0;
  } else {
    visibleDrillCount = Math.min(visibleDrillCount + DRILLS_PER_PAGE, allDrills.length);
  }
  renderVisibleDrills();



});



function countStreaks(sessions) {
  const days = sessions.map(s => s.sessionStart.toDate().toDateString());
  const uniqueDays = [...new Set(days)].sort((a, b) => new Date(a) - new Date(b));
  let streakCount = 0, currentStreak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diff = (new Date(uniqueDays[i]) - new Date(uniqueDays[i - 1])) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      currentStreak++;
      if (currentStreak === 5) {
        streakCount++;
        currentStreak = 0;
      }
    } else {
      currentStreak = 1;
    }
  }
  return streakCount;
}

function countEffortDays(sessions) {
  const dayCount = {};
  sessions.forEach(s => {
    const date = s.sessionStart.toDate().toDateString();
    dayCount[date] = (dayCount[date] || 0) + 1;
  });
  return Object.values(dayCount).filter(count => count >= 3).length;
}  


// BADGES & CHARACTERS SYSTEM

async function loadBadges() {
  const res = await fetch("/json/badges.json");
  return await res.json();
}

function checkBadgeEarned(badge, allDrills, sineSessions, eqSessions) {
  for (const week of badge.weeks) {
    const drill = allDrills.find(d => d.drillName === `Semana ${week}`);
    if (!drill) return false;

    let sineLast = null, eqLast = null;
    const sineMatches = sineSessions.filter(s =>
      s.mode === drill.sineWaveTrainerMode &&
      (drill.sineWaveTrainerMode !== "custom" || isSameArray(s.customFrequencies || [], drill.sineWaveTrainerCustomFreq))
    );
    if (sineMatches.length > 0) {
      sineLast = sineMatches.at(-1).finalScore;
    }

    const eqMatches = eqSessions.filter(s => {
      const st = s.settings || {};
      return st.presetUsed === String(drill.EQFitnessPresetUsed) &&
             st.playbackMode === drill.EQFitnessPlaybackMode &&
             st.gainCombination === drill.EQFitnessGainCombination;
    });
    if (eqMatches.length > 0) {
      eqLast = eqMatches.at(-1).finalScore;
    }

    if (badge.app === "both") {
      if ((sineLast ?? 0) < badge.minLastScore || (eqLast ?? 0) < badge.minLastScore) return false;
    } else if (badge.app === "Sine Wave Trainer") {
      if ((sineLast ?? 0) < badge.minLastScore) return false;
    } else if (badge.app === "EQ Fitness") {
      if ((eqLast ?? 0) < badge.minLastScore) return false;
    }
  }
  return true;
}

async function renderBadges(allDrills, sineSessions, eqSessions) {
  const badgesContainer = document.getElementById("badges-container");
  badgesContainer.innerHTML = "";

  const badges = await loadBadges();

  badges.forEach(badge => {
    const earned = checkBadgeEarned(badge, allDrills, sineSessions, eqSessions);
    if (earned) {
      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge-item");
      badgeDiv.innerHTML = `
        <img src="${badge.iconUrl}" alt="${badge.badgeName}" title="${badge.tooltip || ''}" />

        <p>${badge.badgeName}</p>
      `;
      badgesContainer.appendChild(badgeDiv);
    }
  });
}

// ========================== CURSED CHARACTERS ================================== //

async function loadCursedConfig() {
  const res = await fetch("/json/cursed_characters.json");
  return await res.json();
}

async function renderCursedCharacters(allDrills, sineSessions, eqSessions) {
  const cursedContainer = document.getElementById("cursed-characters");
  const cursedInner = document.getElementById("cursed-badges-inner");
  cursedInner.innerHTML = "";
  cursedContainer.style.display = "none";

  const cursedConfig = await loadCursedConfig();

  const matchedCursed = [];

  cursedConfig.forEach(curse => {
    const weekLabel = `Semana ${curse.semana}`;
    const drill = allDrills.find(d => d.drillName === weekLabel);
    if (!drill) return;

    const sineMatches = sineSessions.filter(s =>
      s.mode === drill.sineWaveTrainerMode &&
      (drill.sineWaveTrainerMode !== "custom" || isSameArray(s.customFrequencies || [], drill.sineWaveTrainerCustomFreq))
    );
    const eqMatches = eqSessions.filter(s => {
      const st = s.settings || {};
      return st.presetUsed === String(drill.EQFitnessPresetUsed) &&
             st.playbackMode === drill.EQFitnessPlaybackMode &&
             st.gainCombination === drill.EQFitnessGainCombination;
    });

    const avgSine = Math.round(sineMatches.reduce((a, b) => a + (b.finalScore || 0), 0) / (sineMatches.length || 1));
    const avgEq = Math.round(eqMatches.reduce((a, b) => a + (b.finalScore || 0), 0) / (eqMatches.length || 1));

    const isCursed = (avgSine > 0 && avgSine < curse.threshold) || (avgEq > 0 && avgEq < curse.threshold);
    if (isCursed) matchedCursed.push(curse);
  });

  if (matchedCursed.length > 0) {
    cursedContainer.style.display = "flex"; // or block if you prefer
    matchedCursed.forEach(curse => {
      const div = document.createElement("div");
      div.classList.add("badge-item");
      div.innerHTML = `
        <img src="${curse.url}" alt="${curse.name}" title="${curse.tooltip || ''}">
        <p>${curse.name || `Semana ${curse.semana}`}</p>
      `;
      cursedInner.appendChild(div);
    });
  }
}

// ======================== END OF CURSED CHARACTERS =================== //



//  Attach to auth state
auth.onAuthStateChanged((user) => {

if (user) {
 userId = user.uid;
 // Call when user logs in

 fetchAndDisplayUsers();
 fetchAndDisplayActivity();
 fetchEQScoreProgress();
 fetchEQMissedFrequenciesTable();
 updateUserInventoryUI(user);

}
});





