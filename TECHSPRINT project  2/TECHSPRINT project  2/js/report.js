import { addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";


let reportMap;
let reportMarker;
let userLocationData = null;

const reportForm = document.getElementById('reportForm');
const submitBtn = document.getElementById('submitBtn');
const submitText = document.getElementById('submitText');
const submitSpinner = document.getElementById('submitSpinner');
const successMessage = document.getElementById('successMessage');
const newReportBtn = document.getElementById('newReportBtn');
const locationStatus = document.getElementById('locationStatus');
const alertBox = document.getElementById('alertBox');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navMenu = document.getElementById('navMenu');

if (mobileMenuBtn && navMenu) {
  mobileMenuBtn.addEventListener('click', () => {
    navMenu.classList.toggle('active');
  });
}

function initReportMap() {
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded');
    setTimeout(initReportMap, 5000);
    return;
  }

  try {
    const mapElement = document.getElementById('reportMap');
    if (!mapElement) {
      console.error('Report map container not found');
      return;
    }

    reportMap = L.map('reportMap').setView([21.1938, 81.3509], 13); // Bhilai coordinates

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(reportMap);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          userLocationData = {
            latitude: lat,
            longitude: lng,
            accuracy: Math.round(position.coords.accuracy)
          };

          reportMarker = L.marker([lat, lng], { draggable: true })
            .addTo(reportMap)
            .bindPopup('Drag to adjust location');

          reportMarker.on('dragend', () => {
            const pos = reportMarker.getLatLng();
            userLocationData.latitude = pos.lat;
            userLocationData.longitude = pos.lng;
            updateLocationDisplay();
          });

          reportMap.setView([lat, lng], 15);
          updateLocationDisplay();
          console.log('✅ Report map initialized:', lat, lng);
        },
        (error) => {
          if (locationStatus) locationStatus.innerHTML = `<span style="color: var(--danger-red);">❌ Location access denied</span>`;
          console.error('Geolocation error:', error);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    }
  } catch (error) {
    console.error('Error initializing report map:', error);
  }
}

function updateLocationDisplay() {
  if (userLocationData && locationStatus) {
    locationStatus.innerHTML = `
      <span class="coord-display">
        <span class="label">Lat:</span>
        <span class="value">${userLocationData.latitude.toFixed(4)}</span>
        <span class="label" style="margin-left: 1rem;">Lng:</span>
        <span class="value">${userLocationData.longitude.toFixed(4)}</span>
      </span>
    `;
  }
}

function showAlert(icon, message, className = 'alert-success') {
  if (alertBox) {
    alertBox.classList.remove('hidden', 'alert-success', 'alert-error', 'alert-warning');
    alertBox.classList.add(className);
    alertBox.innerHTML = `<span>${icon}</span> ${message}`;
    setTimeout(() => alertBox.classList.add('hidden'), 5000);
  }
}

//  FORM SUBMISSION 
if (reportForm) {
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!userLocationData) {
      showAlert('⚠️', 'Please wait for location to load');
      return;
    }

    if (typeof window.firebaseDb === 'undefined' || !window.firebaseDb.reportsRef) {
      showAlert('✗', 'Firebase not ready. Reload page.');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitText.classList.add('hidden');
      submitSpinner.classList.remove('hidden');

      const incidentType = document.getElementById('incidentType').value;
      const severity = document.querySelector('input[name="severity"]:checked')?.value;
      const description = document.getElementById('description').value;
      const timeOfDay = document.getElementById('timeOfDay')?.value || null;
      const contactPhoneInput = document.getElementById('contactPhone');
      const contactPhone = contactPhoneInput ? contactPhoneInput.value.trim() : '';

      if (!severity) {
        throw new Error('Please select severity');
      }

      const reportData = {
        incident_type: incidentType,
        severity,
        description: description || null,
        time_of_day: timeOfDay,
        latitude: userLocationData.latitude,
        longitude: userLocationData.longitude,
        accuracy: userLocationData.accuracy,
        timestamp: new Date().toISOString(),
        date: serverTimestamp(), // ✅ Proper server timestamp [web:20]
        status: 'pending_review',
        media_urls: [] // ✅ Fixed: empty array instead of undefined
      };

      if (contactPhone !== '') {
        reportData.contact_phone = contactPhone;
      }

      console.log('Saving report:', reportData);
      const docRef = await addDoc(window.firebaseDb.reportsRef, reportData);

      console.log('✅ Report SAVED:', docRef.id);
      reportForm.reset();
      reportForm.classList.add('hidden');
      if (successMessage) successMessage.classList.remove('hidden');
      showAlert('✓', `Report saved! ID: ${docRef.id}`);

    } catch (error) {
      console.error('❌ Report FAILED:', error);
      showAlert('✗', 'Failed to save: ' + error.message, 'alert-error');
    } finally {
      submitBtn.disabled = false;
      submitText.classList.remove('hidden');
      submitSpinner.classList.add('hidden');
    }
  });
}



document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initReportMap, 100);
  console.log('✅ SafeHer Report Page Loaded - FORM FIXED');
});
