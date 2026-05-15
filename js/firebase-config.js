import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyD-sTxEKN5qnZEYmZ62K2SY-eh8-AvikDg",
  authDomain: "agrinova-robot.firebaseapp.com",
  databaseURL: "https://agrinova-robot-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agrinova-robot",
  storageBucket: "agrinova-robot.firebasestorage.app",
  messagingSenderId: "805203181792",
  appId: "1:805203181792:web:cdc83b1c1bf0f9a5a61085",
  measurementId: "G-6EE3WTD245"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account"
});
const database = getDatabase(app);
const firestore = getFirestore(app);

// Analytics check
let analytics = null;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

export { app, auth, provider, database, firestore, analytics, firebaseConfig };
