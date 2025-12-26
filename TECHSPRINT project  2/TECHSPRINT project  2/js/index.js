// SafeHer - SOS Emergency Page
// Import Firebase v9 functions
// SafeHer - SOS Emergency Page
// Import Firebase v9 functions
import { addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

function handleFirebaseError(error) {
  console.error("Firebase Error:", error);

  if (error.code === "permission-denied") {
    alert("Permission denied. Check Firestore rules.");
  } else {
    alert("Something went wrong. Please try again.");
  }
}


