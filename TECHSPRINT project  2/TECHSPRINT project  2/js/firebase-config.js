// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";



const firebaseConfig = {
  apiKey: "AIzaSyC2_Kx1424dLnFarxQ94unXw7aLLNhU1ew",
  authDomain: "safety-web-7267e.firebaseapp.com",
  projectId: "safety-web-7267e",
  storageBucket: "safety-web-7267e.appspot.com",
  messagingSenderId: "269296453408",
  appId: "1:269296453408:web:81b41525ee96f360a93945"
};


// Initialize Firebase (v9 modular syntax)
const app = initializeApp(firebaseConfig);

// Firestore instance
const db = getFirestore(app);

// Collection references
const sosAlertsRef = collection(db, "sos_alerts");
const reportsRef = collection(db, "unsafe_reports");
const liveLocationsRef = collection(db, "live_locations"); // ✅ for live tracking

// Auth instance
const auth = getAuth(app);

// Expose to other scripts
window.firebaseDb = {
  db,
  sosAlertsRef,
  reportsRef,
  liveLocationsRef, // ✅ used in map.js and admin.js
  auth
};

// Utility function to handle Firestore errors
function handleFirebaseError(error) {
  console.error("Firebase Error:", error);
  if (error.code === "permission-denied") {
    console.warn("Check Firestore security rules");
  }
}

window.handleFirebaseError = handleFirebaseError;



