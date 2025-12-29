/* =========================================================
   CONFIG & TARGET DATA
========================================================= */

const CONFIG = {
  imageTargetSrc: "./Targets/targets.mind",
  targetCount: 8,
  lostGraceMs: 250,
};

const TARGETS = [
  { index: 0, title: "Web and App Development Workshop", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Web Development", "App Development", "Workshop Details"] },
  { index: 1, title: "TEDx Sanjivani University", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Inspiring Ideas", "TED Talks", "University Event"] },
  { index: 2, title: "Smart India Hackathon 2025", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Innovation Challenge", "Problem Solving", "Hackathon"] },
  { index: 3, title: "Ohayo Japan - Japan Festival", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Japanese Culture", "Festival Celebration", "University Event"] },
  { index: 4, title: "Sanjivani Sankalp 2K25", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["University Initiative", "Student Programs", "2025 Event"] },
  { index: 5, title: "Garba @Sanjivani", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Cultural Dance", "Traditional Celebration", "Campus Event"] },
  { index: 6, title: "Eureka! 2025", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Discovery & Innovation", "Learning Experience", "Annual Event"] },
  { index: 7, title: "Mission Exploit 1st Edition", subtitle: "Scan the poster to watch", youtubeId: "DR8Lr5PKHLM", bullets: ["Cyber Security", "Hacking Challenge", "First Edition"] },
];

/* =========================================================
   BASIC HELPERS
========================================================= */

function getEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function logDebug(msg) {
  const el = document.getElementById("debug");
  if (!el) return;
  el.style.display = "block";
  el.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
}

function setLoading(text) {
  const el = document.getElementById("loading");
  if (!el) return;
  el.style.display = "flex";
  document.getElementById("loading-text").textContent = text;
}

function hideLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "none";
}

/* =========================================================
   SHEET & YOUTUBE
========================================================= */

function updateSheetForTarget(target) {
  getEl("sheet-title").textContent = target.title;
  getEl("sheet-subtitle").textContent = target.subtitle;
  const ul = getEl("sheet-bullets");
  ul.innerHTML = "";
  target.bullets.slice(0, 3).forEach(b => {
    const li = document.createElement("li");
    li.textContent = b;
    ul.appendChild(li);
  });
  getEl("sheet").classList.add("open");
}

function closeSheet() {
  getEl("sheet").classList.remove("open");
}

function buildYouTubeSrc(id, muted = false) {
  return `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&mute=${muted ? 1 : 0}`;
}

function getYouTubeWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/* =========================================================
   CAMERA FIX
========================================================= */

function ensureCameraVideoVisible() {
  const video = document.querySelector("video");
  if (!video) return;
  video.setAttribute("playsinline", true);
  video.muted = true;
  video.style.position = "fixed";
  video.style.inset = "0";
  video.style.width = "100%";
  video.style.height = "100%";
  video.style.objectFit = "cover";
}

/* =========================================================
   AR CORE
========================================================= */

let currentTargetIndex = null;
let lostTimeout = null;

async function startAR() {
  if (!window.isSecureContext) {
    setLoading("HTTPS required for camera");
    return;
  }

  const youtubeBox = getEl("youtube-container");
  const youtubeFrame = getEl("youtube-video");
  youtubeBox.style.display = "none";

  const mindarThree = new MINDAR.IMAGE.MindARThree({
    container: document.body,
    imageTargetSrc: CONFIG.imageTargetSrc,
    uiLoading: false,
    uiScanning: false,
    maxTrack: 1,
  });

  const { renderer, scene, camera } = mindarThree;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  function playVideo(index) {
    const t = TARGETS[index];
    if (!t) return;
    youtubeFrame.src = buildYouTubeSrc(t.youtubeId, false);
    youtubeBox.style.display = "block";
    currentTargetIndex = index;
  }

  function stopVideo() {
    youtubeFrame.src = "";
    youtubeBox.style.display = "none";
    currentTargetIndex = null;
  }

  for (let i = 0; i < CONFIG.targetCount; i++) {
    const anchor = mindarThree.addAnchor(i);

    anchor.onTargetFound = () => {
      logDebug(`Target ${i} found`);
      hideLoading();
      updateSheetForTarget(TARGETS[i]);
      playVideo(i);
    };

    anchor.onTargetLost = () => {
      logDebug(`Target ${i} lost`);
      if (lostTimeout) clearTimeout(lostTimeout);
      lostTimeout = setTimeout(stopVideo, CONFIG.lostGraceMs);
      closeSheet();
    };
  }

  await mindarThree.start();
  hideLoading();
  ensureCameraVideoVisible();

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

/* =========================================================
   BOOTSTRAP
========================================================= */

const startBtn = document.getElementById("start-ar");
if (startBtn) {
  startBtn.onclick = () => {
    startBtn.disabled = true;
    startBtn.textContent = "Starting…";
    setLoading("Starting camera…");
    startAR().catch(e => {
      console.error(e);
      logDebug(e.message);
      startBtn.disabled = false;
      startBtn.textContent = "Start AR";
    });
  };
}
