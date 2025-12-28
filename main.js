

// Single clean version (7 targets) for testing on ./Targets/sample.mind
// Update TARGETS + imageTargetSrc later when your final .mind is ready.

const CONFIG = {
  imageTargetSrc: "./Targets/sample.mind",
  targetCount: 7,
  lostGraceMs: 250,
};

// Target index must match the image order inside the .mind file (0..6)
const TARGETS = [
  {
    index: 0,
    title: "Project 1",
    subtitle: "Scan the poster to watch",
    youtubeId: "DR8Lr5PKHLM",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
  {
    index: 1,
    title: "Project 2",
    subtitle: "Scan the poster to watch",
    youtubeId: "q_XTtRjI5FE",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
  {
    index: 2,
    title: "Project 3",
    subtitle: "Scan the poster to watch",
    youtubeId: "MgY01n03QLU",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
  {
    index: 3,
    title: "Project 4",
    subtitle: "Scan the poster to watch",
    youtubeId: "zQGQLEE1nQs",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
  {
    index: 4,
    title: "Project 5",
    subtitle: "Scan the poster to watch",
    youtubeId: "v9uY-S2s1AU",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
  {
    index: 5,
    title: "Project 6",
    subtitle: "Scan the poster to watch",
    youtubeId: "1a5nyrMtRsk",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
  {
    index: 6,
    title: "Project 7",
    subtitle: "Scan the poster to watch",
    youtubeId: "kJKtTUD088k",
    bullets: ["Problem statement", "Solution overview", "Impact / outcome"],
  },
];

function getYouTubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function updateSheetForTarget(target) {
  const sheet = document.getElementById("sheet");
  if (!sheet) return;

  const titleEl = document.getElementById("sheet-title");
  const subtitleEl = document.getElementById("sheet-subtitle");
  const bulletsEl = document.getElementById("sheet-bullets");

  if (titleEl) titleEl.textContent = target?.title || "Project";
  if (subtitleEl) subtitleEl.textContent = target?.subtitle || "";

  if (bulletsEl) {
    bulletsEl.innerHTML = "";
    const bullets = Array.isArray(target?.bullets) ? target.bullets : [];
    const safeBullets = bullets.length ? bullets : ["Problem statement", "Solution overview", "Impact / outcome"];
    safeBullets.slice(0, 3).forEach((b) => {
      const li = document.createElement("li");
      li.textContent = b;
      bulletsEl.appendChild(li);
    });
  }

  sheet.classList.add("open");
}

function closeSheet() {
  const sheet = document.getElementById("sheet");
  if (!sheet) return;
  sheet.classList.remove("open");
}

function logDebug(message) {
  const el = document.getElementById("debug");
  if (!el) return;
  el.style.display = "block";
  const time = new Date().toLocaleTimeString();
  el.textContent = `[${time}] ${message}`;
}

function ensureCameraVideoVisible() {
  // MindAR injects a <video> for the camera feed. On some mobile browsers it can end up 0x0 or not playing.
  const videos = Array.from(document.querySelectorAll("video"));
  // Prefer the biggest video element if multiple exist.
  const video = videos.sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight))[0] || videos[0];
  if (!video) {
    logDebug("No <video> element found yet");
    return null;
  }

  try {
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.style.position = "fixed";
    video.style.inset = "0";
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "cover";
    video.style.objectPosition = "center center";
    video.style.zIndex = "0";
    video.style.background = "#000";
  } catch {
    // ignore
  }

  // Try to play (some browsers need a direct play() call after user gesture)
  if (video.paused) {
    const p = video.play?.();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }

  return video;
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

function setHudLocked(locked) {
  // When locked=true, hide reticle/hint.
  document.body.classList.toggle("hud-hidden", !!locked);
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
    const name = e?.name || "UnknownError";
    if (name === "NotReadableError") {
      setLoading("Camera is busy. Close other apps/tabs using camera, then try again.");
    } else if (name === "NotAllowedError" || name === "SecurityError") {
      setLoading("Camera blocked. Allow camera permission in browser settings.");
    } else if (name === "NotFoundError" || name === "OverconstrainedError") {
      setLoading("No usable camera found. Try switching browser/device.");
    } else {
      setLoading("Camera failed to start. Try again after closing other camera apps.");
    }
    logDebug(`Camera permission failed: ${name}`);
    return;
  }

  const youtubeContainer = getEl("youtube-container");
  const youtubeVideo = getEl("youtube-video");

  const sheetWatchBtn = document.getElementById("sheet-watch");
  const sheetOpenBtn = document.getElementById("sheet-open");
  const sheetCloseBtn = document.getElementById("sheet-close");
  const sheetUnmuteBtn = document.getElementById("sheet-unmute");

  const mindarThree = new MINDAR.IMAGE.MindARThree({
    container: document.body,
    imageTargetSrc: CONFIG.imageTargetSrc,
    // Disable built-in UI overlays; we provide our own HUD.
    uiLoading: false,
    uiScanning: false,
    maxTrack: 1,
  });

  const { renderer, scene, camera } = mindarThree;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1));

  const arAccent = 0x19a974;

  function createTargetBadge() {
    const group = new THREE.Group();

    const frameGeo = new THREE.PlaneGeometry(1.05, 1.05);
    const frameMat = new THREE.MeshBasicMaterial({
      color: arAccent,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    group.add(frame);

    const ringGeo = new THREE.RingGeometry(0.42, 0.48, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: arAccent,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.z = 0.01;
    group.add(ring);

    group.userData = { frameMat, ringMat, active: false };
    group.visible = false;
    return group;
  }

  let currentTargetIndex = null;
  let lostTimeout = null;

  // Wire sheet buttons once
  if (sheetCloseBtn) sheetCloseBtn.onclick = () => closeSheet();
  if (sheetOpenBtn) {
    sheetOpenBtn.onclick = () => {
      const t = TARGETS[currentTargetIndex ?? -1];
      if (!t?.youtubeId) return;
      window.open(getYouTubeWatchUrl(t.youtubeId), "_blank", "noopener,noreferrer");
    };
  }
  if (sheetWatchBtn) {
    sheetWatchBtn.onclick = () => {
      if (typeof currentTargetIndex !== "number") return;
      playVideoForTarget(currentTargetIndex);
    };
  }
  if (sheetUnmuteBtn) {
    sheetUnmuteBtn.onclick = () => {
      setLoading("To hear audio: open video and unmute in YouTube player.");
      logDebug("Unmute hint shown");
      setTimeout(() => hideLoading(), 1200);
    };
  }

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

    const badge = createTargetBadge();
    anchor.group.add(badge);

    anchor.onTargetFound = () => {
      console.log(`✅ Target ${i} found`);
      logDebug(`Target ${i} found`);
      hideLoading();
      setHudLocked(true);

      badge.visible = true;
      badge.userData.active = true;
      badge.userData.frameMat.opacity = 0.35;
      badge.userData.ringMat.opacity = 0.85;

      updateSheetForTarget(TARGETS[i]);
      playVideoForTarget(i);
    };

    anchor.onTargetLost = () => {
      console.log(`❌ Target ${i} lost`);
      logDebug(`Target ${i} lost`);

      setHudLocked(false);

      badge.userData.active = false;
      badge.visible = false;

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
  hideLoading();

  // After MindAR starts, force camera video visibility/attributes.
  const camVideo = ensureCameraVideoVisible();
  if (camVideo) {
    const tick = () => {
      const hasFrames = (camVideo.readyState >= 2) && (camVideo.videoWidth > 0) && (camVideo.videoHeight > 0);
      logDebug(hasFrames ? `Camera OK ${camVideo.videoWidth}x${camVideo.videoHeight}` : `Camera starting… readyState=${camVideo.readyState}`);
    };
    tick();
    setTimeout(tick, 800);
    setTimeout(tick, 2000);
  }

  renderer.setAnimationLoop(() => {
    // Animate badges (pulse) when active
    const t = performance.now() * 0.001;
    scene.traverse((obj) => {
      if (!obj?.userData?.frameMat || !obj?.userData?.ringMat) return;
      if (!obj.userData.active) return;
      const pulse = 0.6 + 0.4 * Math.sin(t * 3.2);
      obj.userData.ringMat.opacity = 0.35 + 0.45 * pulse;
      obj.userData.frameMat.opacity = 0.12 + 0.18 * pulse;
      obj.rotation.z = 0.02 * Math.sin(t * 1.5);
    });
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
    // If it takes too long, keep UI responsive and show a helpful hint.
    setTimeout(() => {
      if (document.getElementById("loading")?.style?.display !== "none") {
        setLoading("Still starting… If stuck, close other camera apps and try again.");
      }
    }, 4000);
  });
} else {
  // Fallback if button missing
  setLoading("Start button missing in HTML.");
  logDebug("Missing #start-ar button");
}
