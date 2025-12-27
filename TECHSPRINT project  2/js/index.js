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

let userLocation = null;
const sosButton = document.getElementById('sosButton');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const locationCard = document.getElementById('locationCard');
const locationDetails = document.getElementById('locationDetails');
const confirmModal = document.getElementById('confirmModal');
const cancelSosBtn = document.getElementById('cancelSos');
const confirmSosBtn = document.getElementById('confirmSos');
const alertBox = document.getElementById('alertBox');
const alertMessage = document.getElementById('alertMessage');
const alertIcon = document.getElementById('alertIcon');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

// Toggle mobile menu
mobileMenuBtn.addEventListener('click', () => {
  navMenu.classList.toggle('active');
});

// SOS Button Click Handler
sosButton.addEventListener('click', () => {
  // Show confirmation modal
  confirmModal.classList.add('active');
});

// Cancel SOS
cancelSosBtn.addEventListener('click', () => {
  confirmModal.classList.remove('active');
});

// Confirm and Send SOS
confirmSosBtn.addEventListener('click', async () => {
  confirmModal.classList.remove('active');
  sosButton.classList.add('sending');
  sosButton.disabled = true;

  try {
    // Get user location
    const location = await getCurrentLocation();
    userLocation = location;

    // Prepare SOS alert data
    const sosAlert = {
      type: 'sos_alert',
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: new Date().toISOString(),
      date: new Date(),
      status: 'active',
      description: 'Emergency SOS Alert'
    };

    // Save to Firestore using v9 modular syntax
    const docRef = await addDoc(window.firebaseDb.sosAlertsRef, sosAlert);

    // Display success message
    showAlert('✓', 'SOS alert sent successfully!', 'alert-success');
    displayLocation(location);
    
    // Update status
    statusIndicator.classList.remove('inactive');
    statusIndicator.classList.add('active');
    statusText.textContent = 'SOS Sent';

    console.log('SOS alert saved with ID:', docRef.id);

  } catch (error) {
    handleFirebaseError(error);
    showAlert('✗', 'Failed to send SOS. Please try again.', 'alert-error');
  } finally {
    sosButton.classList.remove('sending');
    sosButton.disabled = false;
  }
});

// Get current location using Geolocation API
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          timestamp: new Date().toISOString()
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

// Display location details
function displayLocation(location) {
  const coordsHtml = `
    <div class="location-coords">
      <div class="coord-item">
        <span class="coord-label">Latitude</span>
        <span class="coord-value">${location.latitude.toFixed(6)}</span>
      </div>
      <div class="coord-item">
        <span class="coord-label">Longitude</span>
        <span class="coord-value">${location.longitude.toFixed(6)}</span>
      </div>
      <div class="coord-item">
        <span class="coord-label">Accuracy</span>
        <span class="coord-value">±${location.accuracy}m</span>
      </div>
      <div class="coord-item">
        <span class="coord-label">Time</span>
        <span class="coord-value">${new Date(location.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  `;
  locationDetails.innerHTML = coordsHtml;
}

// Show alert message
function showAlert(icon, message, className = 'alert-success') {
  alertBox.classList.remove('hidden', 'alert-success', 'alert-error');
  alertBox.classList.add(className);
  alertIcon.textContent = icon;
  alertMessage.textContent = message;

  setTimeout(() => {
    alertBox.classList.add('hidden');
  }, 5000);
}

// Handle Firebase initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('SafeHer SOS Page Loaded - Firebase Ready');
  statusIndicator.classList.add('inactive');
  statusText.textContent = 'Ready';
});
