import { getDocs, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let adminMap;
let sosMarkers = {};
let reportMarkers = {};
let liveUserMarkers = {};

let refreshBtn, sosCount, reportCount, highSeverityCount, todayCount;
let sosList, reportsList, tabBtns, tabContents, mobileMenuBtn, navMenu, liveTrackToggle;

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

function initAdminMap() {
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded');
    setTimeout(initAdminMap, 5000);
    return;
  }

  try {
    const mapElement = document.getElementById('adminMap');
    if (!mapElement) {
      console.error('Admin map container not found');
      return;
    }

    adminMap = L.map('adminMap').setView([21.1938, 81.3509], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(adminMap);

    console.log('✅ Admin map initialized');
  } catch (error) {
    console.error('Error initializing admin map:', error);
  }
}

async function handleResolveSos(docId) {
  if (!window.firebaseDb || !window.firebaseDb.sosAlertsRef) return;
  const confirmDelete = window.confirm('Mark this SOS as resolved and remove it?');
  if (!confirmDelete) return;
  try {
    const sosDocRef = doc(window.firebaseDb.sosAlertsRef, docId);
    await deleteDoc(sosDocRef);
    console.log('SOS resolved:', docId);
  } catch (err) {
    console.error('Error deleting SOS alert:', err);
    alert('Failed to resolve SOS. Check console for details.');
  }
}

async function handleResolveReport(docId) {
  if (!window.firebaseDb || !window.firebaseDb.reportsRef) return;
  const confirmDelete = window.confirm('Mark this report as resolved and remove it?');
  if (!confirmDelete) return;
  try {
    const reportDocRef = doc(window.firebaseDb.reportsRef, docId);
    await deleteDoc(reportDocRef);
    console.log('Report resolved:', docId);
  } catch (err) {
    console.error('Error deleting report:', err);
    alert('Failed to resolve report. Check console for details.');
  }
}

async function handleStopLiveTracking(userId) {
  const confirmStop = window.confirm(`Stop live tracking for user "${userId}"?\n\nThis will delete their location from Firestore.`);
  if (!confirmStop) return;
  
  try {
    const liveDocRef = doc(window.firebaseDb.liveLocationsRef, userId);
    await deleteDoc(liveDocRef);
    console.log(`✅ Stopped tracking for ${userId}`);
  } catch (err) {
    console.error('Error stopping live tracking:', err);
    alert('Failed to stop tracking. Check console.');
  }
}

function createSosItemElement(alert, docId) {
  const ts = alert.timestamp;
  const date = ts && ts.toDate ? ts.toDate() : new Date();
  const timeString = date.toLocaleString();

  const item = document.createElement('div');
  item.className = 'data-item sos';
  item.innerHTML = `
    <div class="data-icon">🆘</div>
    <div class="data-details">
      <div class="data-title">Emergency SOS Alert</div>
      <div class="data-meta">
        <span>📍 ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}</span>
        <span>⏰ ${timeString}</span>
        <span class="badge badge-danger">${alert.status}</span>
      </div>
      <div class="data-location">Accuracy: ±${alert.accuracy}m</div>
    </div>
    <button class="btn btn-small btn-secondary resolve-sos-btn" data-id="${docId}">Resolve</button>
  `;
  const resolveBtn = item.querySelector('.resolve-sos-btn');
  resolveBtn.addEventListener('click', () => handleResolveSos(docId));
  return item;
}

function createReportItemElement(report, docId) {
  const ts = report.timestamp;
  const date = ts && ts.toDate ? ts.toDate() : new Date();
  const timeString = date.toLocaleString();
  const incidentLabel = formatIncidentType(report.incident_type);

  const phoneHtml = report.contact_phone
    ? `<div class="data-contact">Contact: ${report.contact_phone}</div>`
    : '';

  const item = document.createElement('div');
  item.className = `data-item ${report.severity}`;
  item.innerHTML = `
    <div class="data-icon">⚠️</div>
    <div class="data-details">
      <div class="data-title">${incidentLabel}</div>
      <div class="data-meta">
        <span>📍 ${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}</span>
        <span>⏰ ${timeString}</span>
        <span class="badge badge-${report.severity === 'high' ? 'danger' : report.severity === 'medium' ? 'warning' : 'success'}">
          ${report.severity.toUpperCase()}
        </span>
      </div>
      <div class="data-location">
        ${report.description ? `Description: ${report.description.substring(0, 50)}...` : 'No description'}
      </div>
      ${phoneHtml}
    </div>
    <button class="btn btn-small btn-secondary resolve-report-btn" data-id="${docId}">Resolve</button>
  `;
  const resolveBtn = item.querySelector('.resolve-report-btn');
  resolveBtn.addEventListener('click', () => handleResolveReport(docId));
  return item;
}

function loadSosAlerts() {
  if (typeof window.firebaseDb === 'undefined' || !window.firebaseDb.sosAlertsRef || !sosList) return;
  const sosQuery = query(window.firebaseDb.sosAlertsRef, orderBy('date', 'desc'));
  onSnapshot(sosQuery, (snapshot) => {
    sosList.innerHTML = '';
    let count = 0;
    snapshot.forEach((docSnap) => {
      const alert = docSnap.data();
      count++;
      const sosItem = createSosItemElement(alert, docSnap.id);
      sosList.appendChild(sosItem);
      if (adminMap) addSosMarkerToMap(alert, docSnap.id);
    });
    if (sosCount) sosCount.textContent = count;
    if (count === 0) {
      sosList.innerHTML = '<div class="empty-state"><div class="empty-icon">ℹ️</div><p>No SOS alerts yet</p></div>';
    }
  }, (error) => {
    console.error('Firebase error loading SOS alerts:', error);
    if (sosList) sosList.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error loading data</p></div>';
  });
}

function loadReports() {
  if (typeof window.firebaseDb === 'undefined' || !window.firebaseDb.reportsRef || !reportsList) return;
  const reportsQuery = query(window.firebaseDb.reportsRef, orderBy('date', 'desc'));
  onSnapshot(reportsQuery, (snapshot) => {
    reportsList.innerHTML = '';
    let count = 0;
    let highSeverity = 0;
    snapshot.forEach((docSnap) => {
      const report = docSnap.data();
      count++;
      if (report.severity === 'high') highSeverity++;
      const reportItem = createReportItemElement(report, docSnap.id);
      reportsList.appendChild(reportItem);
      if (adminMap) addReportMarkerToMap(report, docSnap.id);
    });
    if (reportCount) reportCount.textContent = count;
    if (highSeverityCount) highSeverityCount.textContent = highSeverity;
    if (count === 0) {
      reportsList.innerHTML = '<div class="empty-state"><div class="empty-icon">ℹ️</div><p>No reports yet</p></div>';
    }
  }, (error) => {
    console.error('Firebase error loading reports:', error);
    if (reportsList) reportsList.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error loading data</p></div>';
  });
}

function loadLiveLocations() {
  console.log('🔍 Starting live locations listener...');
  
  if (!window.firebaseDb || !window.firebaseDb.liveLocationsRef || !adminMap) {
    console.error('❌ Live tracking not ready - retrying...');
    setTimeout(loadLiveLocations, 1000);
    return;
  }

  const unsubscribe = onSnapshot(window.firebaseDb.liveLocationsRef, (snapshot) => {
    console.log(`📍 Found ${snapshot.size} live users`);
    
    Object.values(liveUserMarkers).forEach(marker => adminMap.removeLayer(marker));
    liveUserMarkers = {};
    
    let liveCount = 0;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;
      
      if (data.latitude && data.longitude) {
        const marker = L.circleMarker([data.latitude, data.longitude], {
          radius: 9,
          fillColor: '#3B82F6',
          color: 'white',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(adminMap);
        
        marker.bindPopup(`
          <div style="min-width: 220px; padding: 10px;">
            <strong>🧍 Live User</strong><br>
            <strong>ID:</strong> ${userId}<br>
            <strong>Lat:</strong> ${data.latitude.toFixed(4)}<br>
            <strong>Lng:</strong> ${data.longitude.toFixed(4)}<br>
            <strong>Accuracy:</strong> ±${data.accuracy || 'N/A'}m<br>
            <strong>Status:</strong> <span style="color: #10B981;">Active</span><br><br>
            <button id="stop-${userId}" class="stop-tracking-btn" style="
              background: linear-gradient(135deg, #EF4444, #DC2626);
              color: white; border: none; padding: 10px 20px; 
              border-radius: 8px; cursor: pointer; font-size: 14px; 
              font-weight: bold; width: 100%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              transition: all 0.2s;
            " onmouseover="this.style.transform='scale(1.05')" onmouseout="this.style.transform='scale(1)'">
              🛑 Stop Tracking
            </button>
          </div>
        `);
        
        marker.on('popupopen', function() {
          const stopBtn = document.getElementById(`stop-${userId}`);
          if (stopBtn) {
            stopBtn.onclick = () => handleStopLiveTracking(userId);
          }
        });
        
        liveUserMarkers[userId] = marker;
        liveCount++;
      }
    });
    console.log(`✅ ${liveCount} live users on map`);
  }, (error) => {
    console.error('❌ Live locations ERROR:', error);
  });
  
  window.adminLiveUnsubscribe = unsubscribe;
  return unsubscribe;
}

function addSosMarkerToMap(alert, docId) {
  if (!adminMap) return;
  if (sosMarkers[docId]) adminMap.removeLayer(sosMarkers[docId]);
  const marker = L.circleMarker([alert.latitude, alert.longitude], {
    radius: 10,
    fillColor: '#EF4444',
    color: 'white',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(adminMap);
  marker.bindPopup(`
    <strong>🆘 SOS Alert</strong><br>
    Lat: ${alert.latitude.toFixed(4)}<br>
    Lng: ${alert.longitude.toFixed(4)}<br>
    Time: ${new Date(alert.timestamp.toDate ? alert.timestamp.toDate() : alert.timestamp).toLocaleTimeString()}<br>
    Status: ${alert.status}
  `);
  sosMarkers[docId] = marker;
}

function addReportMarkerToMap(report, docId) {
  if (!adminMap) return;
  if (reportMarkers[docId]) adminMap.removeLayer(reportMarkers[docId]);
  
  let markerColor = '#6B7280';
  switch (report.severity) {
    case 'high': markerColor = '#EC4899'; break;
    case 'medium': markerColor = '#F59E0B'; break;
    case 'low': markerColor = '#10B981'; break;
  }
  
  const marker = L.circleMarker([report.latitude, report.longitude], {
    radius: 8,
    fillColor: markerColor,
    color: 'white',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7
  }).addTo(adminMap);
  
  marker.bindPopup(`
    <strong>⚠️ ${formatIncidentType(report.incident_type)}</strong><br>
    Severity: ${report.severity.toUpperCase()}<br>
    ${report.media_urls?.[0] ? `<img src="${report.media_urls[0]}" style="max-width:200px;max-height:150px;border-radius:8px;"><br>` : ''}
    Lat: ${report.latitude.toFixed(4)}<br>
    Lng: ${report.longitude.toFixed(4)}<br>
    Time: ${new Date(report.timestamp.toDate ? report.timestamp.toDate() : report.timestamp).toLocaleTimeString()}
  `);
  
  reportMarkers[docId] = marker;
}

document.addEventListener('DOMContentLoaded', () => {
  refreshBtn = document.getElementById('refreshBtn');
  sosCount = document.getElementById('sosCount');
  reportCount = document.getElementById('reportCount');
  highSeverityCount = document.getElementById('highSeverityCount');
  todayCount = document.getElementById('todayCount');
  sosList = document.getElementById('sosList');
  reportsList = document.getElementById('reportsList');
  tabBtns = document.querySelectorAll('.tab-btn');
  tabContents = document.querySelectorAll('.tab-content');
  mobileMenuBtn = document.getElementById('mobileMenuBtn');
  navMenu = document.getElementById('navMenu');
  liveTrackToggle = document.getElementById('liveTrackToggle');

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', () => navMenu.classList.toggle('active'));
  }

  if (liveTrackToggle && window.liveTracking) {
    liveTrackToggle.addEventListener('click', () => {
      window.liveTracking.toggle();
      if (window.liveTracking.isActive) {
        liveTrackToggle.innerHTML = '🟢 Live ON';
        liveTrackToggle.classList.add('active');
        loadLiveLocations();
      } else {
        liveTrackToggle.innerHTML = '🔴 Live OFF';
        liveTrackToggle.classList.remove('active');
        Object.values(liveUserMarkers).forEach(marker => adminMap?.removeLayer(marker));
        liveUserMarkers = {};
      }
    });
    liveTrackToggle.innerHTML = window.liveTracking?.isActive ? '🟢 Live ON' : '🔴 Live OFF';
    if (window.liveTracking?.isActive) liveTrackToggle.classList.add('active');
  }

  if (tabBtns.length) {
    tabBtns.forEach(btn => btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tabContents.forEach(content => content.classList.remove('active'));
      const targetTab = document.getElementById(`${tabName}Tab`);
      if (targetTab) targetTab.classList.add('active');
    }));
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      if (window.adminLiveUnsubscribe) window.adminLiveUnsubscribe();
      if (adminMap) {
        Object.values(sosMarkers).forEach(m => adminMap.removeLayer(m));
        Object.values(reportMarkers).forEach(m => adminMap.removeLayer(m));
        Object.values(liveUserMarkers).forEach(m => adminMap.removeLayer(m));
      }
      sosMarkers = {}; reportMarkers = {}; liveUserMarkers = {};
      if (sosList) sosList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Refreshing...</p></div>';
      if (reportsList) reportsList.innerHTML = '<div class="loading-placeholder"><div class="spinner"></div><p>Refreshing...</p></div>';
      refreshBtn.disabled = true;
      refreshBtn.textContent = '🔄 Refreshing...';
      setTimeout(() => {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<span>🔄</span> Refresh';
        loadSosAlerts();
        loadReports();
        loadLiveLocations();
      }, 1500);
    });
  }

  setTimeout(initAdminMap, 100);
  setTimeout(loadSosAlerts, 200);
  setTimeout(loadReports, 250);
  setTimeout(loadLiveLocations, 350);
  
  console.log('✅ SafeHer Admin Dashboard Loaded - LIVE TRACKING + STOP ACTIVE');
});
