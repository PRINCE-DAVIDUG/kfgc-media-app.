/* ===========================
   KFGC Media App — script.js
   Handles: mobile nav, theme, slider, background slideshow, share
   =========================== */

/* ---------- Helpers ---------- */
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  /* =====================
     MOBILE MENU
  ===================== */
  const menuToggle = document.getElementById("menu-toggle");
  const primaryNav = document.getElementById("primary-nav");

  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = primaryNav.classList.toggle("show");
      menuToggle.setAttribute("aria-expanded", isOpen);
    });

    primaryNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        primaryNav.classList.remove("show");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }


/* =========================================
   KFGC UNIFIED THEME SYSTEM
   Light | Dark | System
========================================= */

const KFGC_THEME_KEY = 'kfgc_theme';

const themeButtons = [
  document.getElementById('theme-toggle'),
  document.getElementById('themeToggleBtn'),
  document.getElementById('theme-card-btn')
].filter(Boolean);

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');

function applyKfgcTheme(theme) {
  const selectedTheme = ['light', 'dark', 'system'].includes(theme)
    ? theme
    : 'system';

  localStorage.setItem(KFGC_THEME_KEY, selectedTheme);

  const darkMode = selectedTheme === 'dark' ||
    (selectedTheme === 'system' && systemTheme.matches);

  document.body.classList.toggle('dark', darkMode);
  document.body.classList.toggle('navy', darkMode);
  document.body.classList.toggle('light', !darkMode);

  document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
  document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';

  updateKfgcThemeIcons();

  window.dispatchEvent(new CustomEvent('kfgc-theme-changed', {
    detail: { theme: selectedTheme, darkMode }
  }));
}

function updateKfgcThemeIcons() {
  const darkMode = document.body.classList.contains('dark');

  themeButtons.forEach(button => {
    button.innerHTML = darkMode
      ? '<i class="fas fa-moon"></i>'
      : '<i class="fas fa-sun"></i>';

    button.setAttribute('aria-pressed', String(darkMode));
  });
}

// Initialize saved theme
applyKfgcTheme(localStorage.getItem(KFGC_THEME_KEY) || 'system');

// Header and card theme buttons
themeButtons.forEach(button => {
  button.addEventListener('click', () => {
    const currentlyDark = document.body.classList.contains('dark');
    applyKfgcTheme(currentlyDark ? 'light' : 'dark');
  });
});

// Follow device changes when System Default is selected
systemTheme.addEventListener('change', () => {
  if (localStorage.getItem(KFGC_THEME_KEY) === 'system') {
    applyKfgcTheme('system');
  }
});

// Allow other pages to change the theme
window.applyKfgcTheme = applyKfgcTheme;



/* ---------- Slider (auto + manual) ---------- */
const slidesContainer = qs('.slides');
const slides = qsa('.slide');
const dotsContainer = qs('.dots');
const prevBtn = qs('.prev');
const nextBtn = qs('.next');
let currentIndex = 0;
let slideInterval = null;
const SLIDE_DELAY = 5000;

function buildDots() {
  if (!dotsContainer) return;
  dotsContainer.innerHTML = '';
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', `Slide ${i + 1}`);
    d.addEventListener('click', () => showSlide(i));
    dotsContainer.appendChild(d);
  });
}

function showSlide(index) {
  if (!slidesContainer) return;
  currentIndex = (index + slides.length) % slides.length;
  slidesContainer.style.transform = `translateX(${-currentIndex * 100}%)`;

  // update dots
  qsa('.dot').forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
}

function nextSlide() { showSlide(currentIndex + 1); }
function prevSlide() { showSlide(currentIndex - 1); }

if (nextBtn) nextBtn.addEventListener('click', () => { resetInterval(); nextSlide(); });
if (prevBtn) prevBtn.addEventListener('click', () => { resetInterval(); prevSlide(); });

function startInterval() {
  slideInterval = setInterval(nextSlide, SLIDE_DELAY);
}
function stopInterval() {
  if (slideInterval) clearInterval(slideInterval);
  slideInterval = null;
}
function resetInterval() { stopInterval(); startInterval(); }

if (slides.length > 0) {
  buildDots();
  startInterval();
  qs('.slider')?.addEventListener('mouseenter', stopInterval);
  qs('.slider')?.addEventListener('mouseleave', startInterval);
}

/* ---------- Background slideshow ---------- */
const bgImages = ['image1.jpg', 'image2.jpg', 'image3.jpg'];
let bgIndex = 0;
const hero = qs('.hero');

function changeBackground() {
  if (!hero || bgImages.length === 0) return;
  hero.style.backgroundImage =
    `linear-gradient(rgba(2,6,20,0.25), rgba(2,6,20,0.25)), url('${bgImages[bgIndex]}')`;
  bgIndex = (bgIndex + 1) % bgImages.length;
}

if (hero && bgImages.length) {
  changeBackground();
  setInterval(changeBackground, 5000);
}

/* ---------- Share helper ---------- */
function shareApp() {
  const shareData = {
    title: 'Join Kirinda Full Gospel Church App',
    text: 'Join us for faith, fellowship, and growth. Download the KFGC app now!',
    url: 'https://www.kfgcapp.com'
  };
  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    alert('Sharing not supported. Copy this link: https://www.kfgcapp.com');
  }
}

window.shareApp = shareApp;

/* ---------- Keyboard slide control ---------- */
document.addEventListener('keydown', (evt) => {
  if (evt.key === 'ArrowLeft') { resetInterval(); prevSlide(); }
  if (evt.key === 'ArrowRight') { resetInterval(); nextSlide(); }
});

/* ---------- Prayer form ---------- */
document.getElementById('prayer-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const request = document.getElementById('member-request').value.trim();

  if (request) {
    alert('Thank you! Your prayer request has been submitted.');
    event.target.reset();
  } else {
    alert('Please write your prayer request before submitting.');
  }
});

/* ---------------------------
   Persistent settings & UI
   --------------------------- */

/* --- Helper: query & set active nav --- */
document.querySelectorAll('.nav-link').forEach(a=>{
  if (a.href && location.href.includes(a.getAttribute('href'))) {
    a.classList.add('active');
  }
});


/* --- Font size control --- */
const sizeButtons = document.querySelectorAll('.size-btn');

function setFontSize(sizeKey) {
  document.body.classList.remove('font-sm','font-md','font-lg');
  if (sizeKey === 'sm') document.body.classList.add('font-sm');
  if (sizeKey === 'md') document.body.classList.add('font-md');
  if (sizeKey === 'lg') document.body.classList.add('font-lg');
  sizeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.size === sizeKey);
    btn.setAttribute('aria-pressed', btn.dataset.size === sizeKey ? 'true' : 'false');
  });
  localStorage.setItem('kfgc_fontsize', sizeKey);
}

/* initialize font size from storage (default medium) */
const storedSize = localStorage.getItem('kfgc_fontsize') || 'md';
setFontSize(storedSize);
sizeButtons.forEach(btn => {
  btn.addEventListener('click', () => setFontSize(btn.dataset.size));
});

/* ---------------------------
   Live Service Demo Detector
   (client-only demo; replace checkLive() to call real APIs)
   --------------------------- */
const liveSub = document.getElementById('live-sub');
const liveBadge = document.getElementById('live-badge');
const liveCheckBtn = document.getElementById('live-check');

let autoCheckInterval = null;
let isLive = false;

function renderLiveStatus() {
  if (isLive) {
    liveSub.textContent = 'Live Now — KFGC is streaming';
    liveBadge.style.display = 'inline-block';
    liveBadge.textContent = 'LIVE';
    liveBadge.style.background = 'linear-gradient(90deg,var(--gold), #f0c66a)';
    liveBadge.style.color = document.body.classList.contains('navy') ? 'var(--navy)' : 'var(--navy)';
  } else {
    liveSub.textContent = 'No live service detected';
    liveBadge.style.display = 'none';
  }
}

/* This demo function simulates checking live status.
   Replace with real API call (YouTube/Facebook/TikTok) as needed. */
function checkLiveDemo() {
  // simulate network latency
  liveCheckBtn.setAttribute('aria-pressed','true');
  liveCheckBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Checking';
  setTimeout(() => {
    // randomly decide if live (20% chance)
    isLive = Math.random() < 0.22;
    renderLiveStatus();
    liveCheckBtn.setAttribute('aria-pressed','false');
    liveCheckBtn.innerHTML = '<i class="fa fa-check"></i> Check now';
  }, 900);
}

liveCheckBtn.addEventListener('click', checkLiveDemo);

/* Auto-check toggle (double-click the Live card to toggle auto-check for demo) */
document.getElementById('card-live').addEventListener('dblclick', () => {
  if (autoCheckInterval) {
    clearInterval(autoCheckInterval);
    autoCheckInterval = null;
    alert('Auto-check disabled (demo)');
  } else {
    autoCheckInterval = setInterval(checkLiveDemo, 15000); // every 15s demo
    alert('Auto-check enabled (demo) — checks every 15s. Double-tap the live card to stop.');
  }
});

/* ---------------------------
   Share & Rate functionality
   --------------------------- */
function openShare() {
  const shareData = {
    title: 'KFGC Media App',
    text: 'Join me on the KFGC Media App — watch live services and events.',
    url: location.origin + location.pathname
  };
  if (navigator.share) {
    navigator.share(shareData).catch(()=>{/* user cancelled */});
  } else {
    // fallback: copy to clipboard
    copyToClipboard(shareData.url);
    showModal('Share App', `<p>Link copied to clipboard:</p><p style="word-break:break-all">${shareData.url}</p>`);
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text);
  } else {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t);
    t.select(); document.execCommand('copy'); t.remove();
  }
}

function rateApp() {
  // In production, link to Play Store / App Store URL.
  showModal('Rate KFGC Media App', `<p>Thank you for supporting us! Please choose a store to leave a rating.</p>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn primary" onclick="closeModal(); alert('Open Play Store (demo)')">Google Play</button>
      <button class="btn ghost" onclick="closeModal(); alert('Open App Store (demo)')">App Store</button>
    </div>`);
}

/* ---------------------------
   Profile / Password / Privacy Modals
   --------------------------- */
function openProfile(){
  showModal('Profile', `<div class="row">
    <label><strong>Name</strong><input id="profile-name" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee;margin-top:6px" value="Kirinda Full Gospel Church"></label>
    <label><strong>Email</strong><input id="profile-email" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee;margin-top:6px" value="info@kfgcmedia.org"></label>
  </div>`);
  document.getElementById('modal-primary').onclick = function(){ closeModal(); alert('Profile saved (demo)'); };
}

function openChangePassword(){
  showModal('Change Password', `<div class="row">
    <label><strong>Current password</strong><input id="pw-old" type="password" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee;margin-top:6px"></label>
    <label><strong>New password</strong><input id="pw-new" type="password" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee;margin-top:6px"></label>
    <label><strong>Confirm new</strong><input id="pw-new2" type="password" style="width:100%;padding:8px;border-radius:8px;border:1px solid #eee;margin-top:6px"></label>
  </div>`);
  document.getElementById('modal-primary').onclick = function(){
    const a=document.getElementById('pw-new'), b=document.getElementById('pw-new2');
    if (!a.value) { alert('Please enter a new password.'); return; }
    if (a.value !== b.value) { alert('New passwords do not match.'); return; }
    closeModal(); alert('Password updated (demo)');
  };
}

function openPrivacy(){
  showModal('Privacy & Data', `<div class="row">
    <p class="card-sub">Manage app data: clear cache, request data, and review permissions.</p>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn ghost" onclick="closeModal(); alert('Cleared cache (demo)')">Clear Cache</button>
      <button class="btn ghost" onclick="closeModal(); alert('Request data export (demo)')">Request Data</button>
    </div>
  </div>`);
  document.getElementById('modal-primary').onclick = closeModal;
}

/* Support & About */
function openSupport(){
  showModal('Contact Support', `<div class="row">
    <p class="card-sub">Send a message to the media team:</p>
    <textarea id="support-msg" style="width:100%;min-height:120px;padding:10px;border-radius:8px;border:1px solid #eee"></textarea>
  </div>`);
  document.getElementById('modal-primary').onclick = function(){
    const msg=document.getElementById('support-msg').value || '';
    if (!msg.trim()) { alert('Please write a message.'); return; }
    closeModal(); alert('Message sent (demo). Thank you!');
  };
}

function openAbout(){
  showModal('About KFGC Media App', `<div class="row">
    <p><strong>Version:</strong> 1.0.0</p>
    <p><strong>Developer:</strong> KFGC Media Team</p>
    <p class="card-sub">This app helps you watch live services, view events and get announcements.</p>
    <div style="display:flex;gap:8px;margin-top:8px">
      <button class="btn ghost" onclick="closeModal(); alert('Open licenses (demo)')">Licenses</button>
      <button class="btn primary" onclick="closeModal(); alert('Open website (demo)')">Visit Website</button>
    </div>
  </div>`);
  document.getElementById('modal-primary').onclick = closeModal;
}

/* ---------- Modal helpers ---------- */
const modalBackdrop = document.getElementById('modal-backdrop');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');

function showModal(title, htmlContent) {
  modalTitle.textContent = title;
  modalContent.innerHTML = htmlContent;
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');
}
function closeModal(){
  modalBackdrop.style.display = 'none';
  modalBackdrop.setAttribute('aria-hidden','true');
}
function modalPrimaryAction(){ closeModal(); }

/* Close modal on backdrop click */
modalBackdrop.addEventListener('click', (e)=>{
  if (e.target === modalBackdrop) closeModal();
});

/* Accessibility: ESC closes modal */
document.addEventListener('keydown', (e)=>{
  if (e.key === 'Escape') closeModal();
});

/* ---------------------------
   Small UX niceties
   --------------------------- */
/* animate footer icons on hover (tiny) */
document.querySelectorAll('.nav-link').forEach(a=>{
  a.addEventListener('mouseenter', ()=> a.classList.add('hover'));
  a.addEventListener('mouseleave', ()=> a.classList.remove('hover'));
});

/* Render initial live status */
renderLiveStatus();

const channelId = "UCbg2Da3jAPU13EZd6WyKjRw";
const iframe = document.getElementById("youtubePlayer");

// Check every 60 seconds
setInterval(() => {
  // Try live stream first
  iframe.src = `https://www.youtube.com/embed/live_stream?channel=${channelId}`;
  
  // If not live, fallback after 5 seconds
  setTimeout(() => {
    iframe.src = `https://www.youtube.com/embed?listType=playlist&list=UU${channelId.substring(2)}`;
  }, 5000);
}, 60000);

function playSermon(videoId) {
  const iframe = document.getElementById("youtubePlayer");
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}
/* ▶ Play sermon */
function playSermon(videoId) {
  const iframe = document.getElementById("youtubePlayer");
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* 🔍 Search + Category Filter */
function filterSermons() {
  const search = document.getElementById("sermonSearch").value.toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const sermons = document.querySelectorAll(".sermon-item");

  sermons.forEach(item => {
    const tags = item.dataset.tags.toLowerCase();
    const matchesSearch = tags.includes(search);
    const matchesCategory = category === "all" || tags.includes(category);

    item.style.display = matchesSearch && matchesCategory ? "flex" : "none";
  });
}

/* 🔔 New Sermon Notification */
(function notifyNewSermon() {
  const latestSermonId = "VIDEO_ID_1"; // change when new sermon uploaded
  const stored = localStorage.getItem("latestSermon");

  if (stored !== latestSermonId) {
    alert("📢 New sermon uploaded! Watch now.");
    localStorage.setItem("latestSermon", latestSermonId);
  }
})();
(function () {
  const playlistId = "UUbg2Da3jAPU13EZd6WyKjRw";
  const stored = localStorage.getItem("playlistSeen");

  if (!stored) {
    alert("📢 New sermon available! Watch now.");
    localStorage.setItem("playlistSeen", playlistId);
  }
})();
(function notifyNewSermon() {
  const latestSermonId = "Y7wPDBjpPn8";
  const stored = localStorage.getItem("latestSermon");

  if (stored !== latestSermonId) {
    alert("📢 New sermon uploaded! Watch now.");
    localStorage.setItem("latestSermon", latestSermonId);
  }
})();
/* End of script */
