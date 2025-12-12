

async function fetchAndDisplaySessionData() {
    try {
        const user = auth.currentUser;
        if (!user) return; // Ensure user is logged in

        const sessionDataList = document.getElementById("eq-fitness-score-data");
        sessionDataList.innerHTML = ""; // Clear previous data

        let sessionDataArray = [];

        // ✅ Reference only the logged-in user's sessions
        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const sessionSnapshot = await getDocs(sessionsRef);

        sessionSnapshot.forEach((sessionDoc) => {
            const sessionData = sessionDoc.data();
            
            if (sessionData.sessionStart && sessionData.totalQuestions && sessionData.finalScore !== undefined) {
                sessionDataArray.push({
                    date: sessionData.sessionStart.toDate().toLocaleDateString(),
                    totalQuestions: sessionData.totalQuestions,
                    timeSpent: `${sessionData.timeSpent} sec`,
                    finalScore: `${sessionData.finalScore}%`,
                    timestamp: sessionData.sessionStart.toMillis() || 0, // Sort by newest session
                });
            }
        });

        // ✅ Sort sessions by most recent
        sessionDataArray.sort((a, b) => b.timestamp - a.timestamp);

        // ✅ Render sessions efficiently using `documentFragment`
        const fragment = document.createDocumentFragment();
        sessionDataArray.forEach(session => {
            const sessionItem = document.createElement("div");
            sessionItem.classList.add("session-entry");
            sessionItem.innerHTML = `
                <p><b>Date:</b> ${session.date}</p>
                <p><b>Total Questions:</b> ${session.totalQuestions}</p>
                <p><b>Time Spent:</b> ${session.timeSpent}</p>
                <p><b>Final Score:</b> ${session.finalScore}</p>
                <hr>
            `;
            fragment.appendChild(sessionItem);
        });

        sessionDataList.appendChild(fragment); // 🚀 Append all at once for efficiency

        console.log("✅ Logged-in user's session data successfully fetched and displayed.");
    } catch (error) {
        console.error("🔥 Error fetching session data:", error);
    }
}


async function fetchEQFitnessData() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const userId = user.uid;
        const sessionsRef = collection(db, "users", userId, "sessions");
        const sessionsSnapshot = await getDocs(sessionsRef);

        console.log(`✅ Sessions Retrieved: ${sessionsSnapshot.size}`);

        const eqDataContainer = document.getElementById("eq-fitness-data");
        if (!eqDataContainer) {
            console.error("❌ Missing element: #eq-fitness-data");
            return;
        }

        eqDataContainer.innerHTML = ""; // Clear previous content

        let dailyStats = {}; // Stores data grouped by date

        // ✅ Create an array of promises for all "missedQuestions" fetches
        const missedQuestionsPromises = sessionsSnapshot.docs.map(async (sessionDoc) => {
            const sessionData = sessionDoc.data();
            const sessionDate = sessionData.sessionStart?.toDate().toLocaleDateString() || "Unknown Date";

            if (!dailyStats[sessionDate]) {
                dailyStats[sessionDate] = { missedFrequencies: new Set(), totalMisses: 0 };
            }

            const missedQuestionsRef = collection(sessionDoc.ref, "missedQuestions");
            const missedQuestionsSnapshot = await getDocs(missedQuestionsRef);
            
            let hasMissedFrequencies = false; // Track if this session had missed frequencies

            missedQuestionsSnapshot.forEach((questionDoc) => {
                const questionData = questionDoc.data();
                if (questionData.correctFrequency) {
                    dailyStats[sessionDate].missedFrequencies.add(questionData.correctFrequency);
                    dailyStats[sessionDate].totalMisses++;
                    hasMissedFrequencies = true;
                }
            });

            // ✅ Only mark "None" if no mistakes were recorded **for this session**
            if (!hasMissedFrequencies && missedQuestionsSnapshot.empty) {
                dailyStats[sessionDate].missedFrequencies.add("None");
            }
        });

        // 🚀 Run all Firestore queries **in parallel**
        await Promise.all(missedQuestionsPromises);

        // ✅ Ensure "None" is only added if **no numbers were recorded** for the day
        Object.entries(dailyStats).forEach(([date, stats]) => {
            if (stats.missedFrequencies.size === 1 && stats.missedFrequencies.has("None")) {
                stats.missedFrequencies = new Set(["None"]); // Keep "None" only if empty
            } else {
                stats.missedFrequencies.delete("None"); // Remove "None" if real numbers exist
            }
        });

        // ✅ Ensure **Data Renders After Processing**
        eqDataContainer.innerHTML = ""; // Clear before appending new data
        let dataRendered = false;

        Object.entries(dailyStats).forEach(([date, stats]) => {
            if (stats.totalMisses > 0) {
                dataRendered = true;
            }
            const sessionElement = document.createElement("div");
            sessionElement.classList.add("session-entry");
            sessionElement.innerHTML = `
                <p><b>Date:</b> ${date}</p>
                <p><b>Missed Frequencies:</b> ${[...stats.missedFrequencies].join(", ")}</p>
                <p><b>Total Mistakes:</b> ${stats.totalMisses}</p>
                <hr>
            `;
            eqDataContainer.appendChild(sessionElement);
        });

        if (!dataRendered) {
            eqDataContainer.innerHTML = `<p>No EQ Fitness data found for the selected period.</p>`;
        }

        // console.log("📊 EQ Fitness Data Grouped by Day & Rendered!");

    } catch (error) {
        console.error("🔥 Error fetching EQ Fitness Data:", error);
    }
}


// Time Filtered Data

async function fetchFilteredSessionData() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const sessionDataList = document.getElementById("filtered-session-data");
        sessionDataList.innerHTML = ""; // Clear previous data fast

        const selectedDate = document.getElementById("date-picker").value;
        const timeFilter = document.getElementById("time-filter").value;

        let startTimestamp, endTimestamp;
        const today = new Date();

        if (!selectedDate) {
            startTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            endTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        } else {
            const selectedTimestamp = new Date(selectedDate + "T00:00:00"); // ✅ Fix timezone issues
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
        }

        // ✅ Convert timestamps to Firestore-compatible format
        const startMillis = startTimestamp.getTime();
        const endMillis = endTimestamp.getTime();

        console.log(`🔍 Fetching sessions from: ${startTimestamp} to ${endTimestamp}`);

        const sessionsRef = collection(db, "users", user.uid, "sessions");
        const sessionSnapshot = await getDocs(sessionsRef);

        let sessionDataArray = [];

        const sessionPromises = sessionSnapshot.docs.map(async (sessionDoc) => {
            const sessionData = sessionDoc.data();
            if (!sessionData.sessionStart) return;
            const sessionStartMillis = sessionData.sessionStart.toMillis();

            if (sessionStartMillis >= startMillis && sessionStartMillis <= endMillis) {
                sessionDataArray.push({
                    date: sessionData.sessionStart.toDate().toLocaleDateString(),
                    totalQuestions: sessionData.totalQuestions ?? "N/A",
                    timeSpent: sessionData.timeSpent ? `${sessionData.timeSpent} sec` : "N/A",
                    finalScore: sessionData.finalScore !== undefined ? `${sessionData.finalScore}%` : "N/A",
                    timestamp: sessionStartMillis,
                });
            }
        });

        await Promise.all(sessionPromises); // Fetch all sessions in parallel

        sessionDataArray.sort((a, b) => b.timestamp - a.timestamp);

        //  If no sessions found, show message
        if (sessionDataArray.length === 0) {
            sessionDataList.innerHTML = `<p>No session data found.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        sessionDataArray.forEach(session => {
            if (session.totalQuestions !== "N/A") { //  Prevent garbage data
                const sessionItem = document.createElement("div");
                sessionItem.classList.add("session-entry");
                sessionItem.innerHTML = `
                    <p><b>Date:</b> ${session.date}</p>
                    <p><b>Total Questions:</b> ${session.totalQuestions}</p>
                    <p><b>Time Spent:</b> ${session.timeSpent}</p>
                    <p><b>Final Score:</b> ${session.finalScore}</p>
                    <hr>
                `;
                fragment.appendChild(sessionItem);
            }
        });

        sessionDataList.appendChild(fragment); // 🚀 Append everything at once

        console.log(`✅ Session data for ${timeFilter} successfully fetched and displayed.`);

    } catch (error) {
        console.error("🔥 Error fetching filtered session data:", error);
    }
}