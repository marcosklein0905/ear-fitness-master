import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, serverTimestamp, getDoc, getDocs, collection, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB2nC3Oyn8rdg55oAJjp2SinJBXbhUFfFI",
  authDomain: "ear-fit-mix.firebaseapp.com",
  projectId: "ear-fit-mix",
  storageBucket: "ear-fit-mix.firebasestorage.app",
  messagingSenderId: "938147107648",
  appId: "1:938147107648:web:d611c181e0cdf975ec60a5"
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
