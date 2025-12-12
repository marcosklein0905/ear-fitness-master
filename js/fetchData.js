import { db, auth } from "/firebaseInfo/firebase.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged((user) => {
        if (user) {
            fetchAndDisplayUsers();
            fetchAndDisplayActivity();
        } else {
            console.warn("No authenticated user, skipping data fetch.");
        }
    });
});

// ✅ Function to Fetch and Display Registered Users
async function fetchAndDisplayUsers() {
    try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const userListContainer = document.getElementById("user-list"); // Ensure this ID is used in your HTML

        if (!userListContainer) return;

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

        console.log("✅ User list updated.");
    } catch (error) {
        console.error("🔥 Error fetching users:", error);
    }
}

// ✅ Function to Fetch and Display Activity Feed
async function fetchAndDisplayActivity() {
    try {
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        const activityList = document.getElementById("activity-list");

        if (!activityList) return;

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

        // ✅ Sort & Slice Efficiently
        const recentActivities = activities
            .sort((a, b) => b.timestamp - a.timestamp) // Sort by most recent
            .slice(0, 5); // Keep only the latest 5 activities

        // ✅ Reduce DOM Manipulation (Better Rendering Performance)
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

// ✅ Function to Format Time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
}
