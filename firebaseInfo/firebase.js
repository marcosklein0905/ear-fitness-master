import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, serverTimestamp, getDoc, getDocs, collection, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";


const firebaseConfig = {

	// INFORMACÃO DO SEU PROJETO FIREBASE

};


// Initialize Firebase
const app = initializeApp(firebaseConfig);


const db = getFirestore(app);

const auth = getAuth(app);



export const storage = getStorage(app);

// Export all necessary Firebase functions
export { 
    db, 
    auth, 
    doc, 
    updateDoc, 
    setDoc, 
    serverTimestamp, 
    getDoc,
    getDocs,
    query,
    where,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    collection,
    addDoc,
    ref, 
    uploadBytes, 
    getDownloadURL 
};
