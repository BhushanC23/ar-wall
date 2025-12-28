

// Single clean version (7 targets) for testing on ./Targets/sample.mind
// Update TARGETS + imageTargetSrc later when your final .mind is ready.

const CONFIG = {
  imageTargetSrc: "./Targets/sample.mind",
  targetCount: 7,
  lostGraceMs: 250,
};

// Replace these with real project details later
const TARGETS = Array.from({ length: CONFIG.targetCount }, (_, i) => ({
  index: i,
  title: `Project ${i + 1}`,
  subtitle: "Scan the poster to watch",
  youtubeId: "5DETK0oQoFY",
}));

function logDebug(message) {
  const el = document.getElementById("debug");
  if (!el) return;
  el.style.display = "block";
  const time = new Date().toLocaleTimeString();
  el.textContent = `[${time}] ${message}`;
}

function setLoadingText(text) {
  const el = document.getElementById("loading-text");
  if (el) el.textContent = text;
}

function getEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing required element #${id}`);
  return el;
}

function setLoading(text) {
  const loadingEl = document.getElementById("loading");
  if (!loadingEl) return;
  loadingEl.style.display = "flex";
  setLoadingText(text);
}

function hideLoading() {
  const loadingEl = document.getElementById("loading");
  if (!loadingEl) return;
  loadingEl.style.display = "none";
}

function buildYouTubeSrc(videoId, { muted } = { muted: true }) {
  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    mute: muted ? "1" : "0",
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

async function startAR() {
  logDebug("StartAR clicked");

  if (!window.isSecureContext) {
    setLoading("Camera needs HTTPS. Open the Netlify HTTPS URL.");
    logDebug("Not a secure context (HTTPS required)");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setLoading("Camera API not available in this browser.");
    logDebug("navigator.mediaDevices.getUserMedia missing");
    return;
  }

  // Basic WebGL check (common event-day failure)
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    setLoading("WebGL not available. Use Chrome and enable hardware acceleration.");
    throw new Error("WebGL not available");
  }

  // Quick permission probe to surface a useful error
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    stream.getTracks().forEach((t) => t.stop());
    logDebug("Camera permission OK");
  } catch (e) {
    console.error(e);
    setLoading("Camera blocked. Allow camera permission in browser settings.");
    logDebug(`Camera permission failed: ${e?.name || e}`);
    return;
  }

  const youtubeContainer = getEl("youtube-container");
  const youtubeVideo = getEl("youtube-video");

  const mindarThree = new MINDAR.IMAGE.MindARThree({
    container: document.body,
    imageTargetSrc: CONFIG.imageTargetSrc,
    uiLoading: true,
    uiScanning: true,
    maxTrack: 1,
  });

  const { renderer, scene, camera } = mindarThree;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

  let currentTargetIndex = null;
  let lostTimeout = null;

  function stopVideo() {
    youtubeVideo.src = "";
    youtubeContainer.style.display = "none";
    currentTargetIndex = null;
  }

  function playVideoForTarget(index) {
    const t = TARGETS[index];
    if (!t || !t.youtubeId) return;

    if (currentTargetIndex === index && youtubeContainer.style.display === "block") return;

    hideLoading();
    if (lostTimeout) {
      clearTimeout(lostTimeout);
      lostTimeout = null;
    }

    // Autoplay reliability: start muted; user can unmute in player.
    youtubeVideo.src = buildYouTubeSrc(t.youtubeId, { muted: true });
    youtubeContainer.style.display = "block";
    currentTargetIndex = index;
  }

  // Create anchors for 0..6
  for (let i = 0; i < CONFIG.targetCount; i++) {
    const anchor = mindarThree.addAnchor(i);

    anchor.onTargetFound = () => {
      console.log(`✅ Target ${i} found`);
      logDebug(`Target ${i} found`);
      hideLoading();
      playVideoForTarget(i);
    };

    anchor.onTargetLost = () => {
      console.log(`❌ Target ${i} lost`);
      logDebug(`Target ${i} lost`);
      // Grace period to avoid flicker when tracking jitters
      if (lostTimeout) clearTimeout(lostTimeout);
      lostTimeout = setTimeout(() => {
        if (currentTargetIndex === i) stopVideo();
      }, CONFIG.lostGraceMs);
    };
  }

  try {
    await mindarThree.start();
  } catch (e) {
    console.error(e);
    setLoading("Failed to start AR. Check camera permission and HTTPS.");
    logDebug(`MindAR start failed: ${e?.name || e}`);
    return;
  }

  logDebug("MindAR started (scanning)");

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
}

// Start only after user gesture (required on many mobile/desktop setups)
const startBtn = document.getElementById("start-ar");
if (startBtn) {
  startBtn.addEventListener("click", () => {
    startBtn.disabled = true;
    startBtn.textContent = "Starting…";
    setLoading("Starting camera…");
    startAR().catch((e) => {
      console.error(e);
      setLoading("Failed to start. See debug panel.");
      logDebug(`Unhandled error: ${e?.name || e}`);
      startBtn.disabled = false;
      startBtn.textContent = "Start AR";
    });
  });
} else {
  // Fallback if button missing
  setLoading("Start button missing in HTML.");
  logDebug("Missing #start-ar button");
}
