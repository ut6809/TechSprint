import {
  onSnapshot,
  setDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let map;
let userMarker;
let trackingWatchId = null;
let isTracking = false;
let reportMarkers = {}; // ✅ Keep reports only

const startTrackingBtn = document.getElementById('startTrackingBtn');
const stopTrackingBtn = document.getElementById('stopTrackingBtn');
const centerLocationBtn = document.getElementById('centerLocationBtn');
const trackingStatus = document.getElementById('trackingStatus');
const trackingStatusText = document.getElementById('trackingStatusText');
const latValue = document.getElementById('latValue');
const lngValue = document.getElementById('lngValue');
const accuracyValue = document.getElementById('accuracyValue');
const timeValue = document.getElementById('timeValue');
const alertBox = document.getElementById('alertBox');
let mobileMenuBtn, navMenu;

function setupMobileMenu() {
  mobileMenuBtn = document.getElementById('mobileMenuBtn');
  navMenu = document.getElementById('navMenu');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }
}

function initMap() {
  if (typeof L === 'undefined') {
    setTimeout(initMap, 1000);
    return;
  }

  map = L.map('map').setView([21.1938, 81.3509], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  console.log('🗺️ Privacy Map - Personal + Reports Only');

  loadReports();
}

function loadReports() {
  if (!window.firebaseDb?.reportsRef) {
    console.error('❌ reportsRef missing: window.firebaseDb.reportsRef is undefined');
    return;
  }

  onSnapshot(
    window.firebaseDb.reportsRef,
    (snapshot) => {
      console.log('📌 Reports snapshot size:', snapshot.size);

      snapshot.forEach((docSnap) => {
        const report = docSnap.data();
        const docId = docSnap.id;

        if (!map) return;
        if (typeof report?.latitude !== "number" || typeof report?.longitude !== "number") return;

        if (reportMarkers[docId]) {
          map.removeLayer(reportMarkers[docId]);
        }

        let markerColor = '#6B7280';
        switch (report.severity) {
          case 'high': markerColor = '#EC4899'; break;
          case 'medium': markerColor = '#F59E0B'; break;
          case 'low': markerColor = '#10B981'; break;
        }

        const marker = L.circleMarker([report.latitude, report.longitude], {
          radius: 10,
          fillColor: markerColor,
          color: 'white',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(`
          <div style="min-width: 200px;">
            <strong style="font-size: 16px;">⚠️ ${formatIncidentType(report.incident_type)}</strong><br><br>
            Severity: <span style="color: ${markerColor};">${String(report.severity || '').toUpperCase()}</span><br>
            Lat: ${report.latitude.toFixed(4)}<br>
            Lng: ${report.longitude.toFixed(4)}<br><br>
            Time: ${report.timestamp ? new Date(report.timestamp).toLocaleString() : '—'}<br>
            ${report.description ? `<br><strong>Description:</strong><br>${report.description}` : ''}
          </div>
        `);

        reportMarkers[docId] = marker;
      });
    },
    (error) => {
      console.error('❌ Reports onSnapshot error:', error);
    }
  );
}

function formatIncidentType(type) {
  const labels = {
    poor_lighting: 'Poor Lighting',
    harassment: 'Harassment Hotspot',
    isolated: 'Isolated Area',
    unsafe_transport: 'Unsafe Transport',
    suspicious: 'Suspicious Activity',
    infrastructure: 'Poor Infrastructure',
    other: 'Other'
  };
  return labels[type] || type;
}

// ✅ PERSONAL TRACKING ONLY
if (startTrackingBtn) {
  startTrackingBtn.addEventListener('click', () => {
    if (!navigator.geolocation || isTracking) return;

    isTracking = true;
    startTrackingBtn.classList.add('hidden');
    stopTrackingBtn.classList.remove('hidden');
    trackingStatus?.classList.remove('inactive');
    trackingStatus?.classList.add('active');
    if (trackingStatusText) trackingStatusText.textContent = 'Tracking Active';

    trackingWatchId = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);
        const time = new Date().toLocaleTimeString();

        if (latValue) latValue.textContent = lat.toFixed(6);
        if (lngValue) lngValue.textContent = lng.toFixed(6);
        if (accuracyValue) accuracyValue.textContent = `±${accuracy}m`;
        if (timeValue) timeValue.textContent = time;

        if (userMarker && map) map.removeLayer(userMarker);

        if (map) {
          userMarker = L.circleMarker([lat, lng], {
            radius: 10,
            fillColor: '#7C3AED',
            color: 'white',
            weight: 3,
            fillOpacity: 0.8
          }).addTo(map);

          map.setView([lat, lng], map.getZoom());
        }

        // Optional: still save for admin usage
        if (window.firebaseDb?.liveLocationsRef) {
          const userId = 'demo_user_1';
          const liveDocRef = doc(window.firebaseDb.liveLocationsRef, userId);
          await setDoc(liveDocRef, {
            user_id: userId,
            latitude: lat,
            longitude: lng,
            accuracy: accuracy,
            updated_at: serverTimestamp(),
            active: true
          }, { merge: true });
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        stopTracking();
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  });
}

if (stopTrackingBtn) {
  stopTrackingBtn.addEventListener('click', stopTracking);
}

async function stopTracking() {
  if (trackingWatchId !== null) {
    navigator.geolocation.clearWatch(trackingWatchId);
    trackingWatchId = null;
  }

  isTracking = false;
  startTrackingBtn?.classList.remove('hidden');
  stopTrackingBtn?.classList.add('hidden');
  trackingStatus?.classList.remove('active');
  trackingStatus?.classList.add('inactive');
  if (trackingStatusText) trackingStatusText.textContent = 'Tracking Off';

  if (window.firebaseDb?.liveLocationsRef) {
    const userId = 'demo_user_1';
    const liveDocRef = doc(window.firebaseDb.liveLocationsRef, userId);
    await setDoc(liveDocRef, { active: false }, { merge: true });
  }
}

if (centerLocationBtn) {
  centerLocationBtn.addEventListener('click', () => {
    if (!navigator.geolocation || !map) return;
    navigator.geolocation.getCurrentPosition((position) => {
      map.setView([position.coords.latitude, position.coords.longitude], 15);
    });
  });
}

function showAlert(icon, message) {
  if (!alertBox) return;
  alertBox.classList.remove('hidden');
  const alertIcon = document.getElementById('alertIcon');
  const alertMessage = document.getElementById('alertMessage');
  if (alertIcon) alertIcon.textContent = icon;
  if (alertMessage) alertMessage.textContent = message;
  setTimeout(() => alertBox.classList.add('hidden'), 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
  setTimeout(initMap, 100);
  console.log('SafeHer Privacy Map - Personal + Reports ✅');
});

window.addEventListener('beforeunload', () => {
  if (isTracking) stopTracking();
});
