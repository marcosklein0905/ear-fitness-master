
document.addEventListener("DOMContentLoaded", () => {
    console.log("Loading user info from sessionStorage...");

    const name = sessionStorage.getItem("userDisplayName");
    const photoURL = sessionStorage.getItem("userPhotoURL");

    if (name && photoURL) {
        console.log(`User info found: Name = ${name}, Photo = ${photoURL}`);
        document.getElementById("user-welcome").innerText = `Welcome, ${name}`;
        document.getElementById("profile-pic").src = photoURL;
    } else {
        console.warn("User info not found in sessionStorage.");
    }
});

