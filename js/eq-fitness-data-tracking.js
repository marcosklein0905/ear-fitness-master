import { db, auth } from "../firebaseInfo/firebase.js";
import { doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

let sessionStartTime;
let appName = "EQ Fitness"; // Set app name explicitly
let eqSessionRef = null; // Store session reference

auth.onAuthStateChanged(async (user) => {
    if (!user) return;

    sessionStartTime = Date.now(); // Start tracking time
    console.log(`User landed on ${appName}`);

    // ✅ Reference to the session in Firestore (Use the same ID for consistency)
    eqSessionRef = doc(db, "users", user.uid, "sessions", `${sessionStartTime}`);

    try {
        // ✅ Store page visit and ensure session exists
        await setDoc(eqSessionRef, {
            appName: appName,
            sessionStart: serverTimestamp(),
            sessionEnd: null,
            timeSpent: null
        }, { merge: true }); // Merge to prevent overwriting

        console.log("EQ Fitness session started in Firestore.");
    } catch (error) {
        console.error("🔥 Error creating EQ session:", error);
    }
});

// ✅ Ensure session is saved on exit
window.addEventListener("beforeunload", async () => {
    if (!sessionStartTime || !eqSessionRef) return;

    const sessionEndTime = Date.now();
    const timeSpent = Math.floor((sessionEndTime - sessionStartTime) / 1000);

    try {
        await updateDoc(eqSessionRef, {
            sessionEnd: serverTimestamp(),
            timeSpent: timeSpent
        });

        console.log(`✅ EQ Fitness session saved: ${timeSpent} seconds`);
    } catch (error) {
        console.error("🔥 Error saving EQ session:", error);
    }
});
