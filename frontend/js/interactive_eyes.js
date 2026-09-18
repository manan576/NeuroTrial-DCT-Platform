/**
 * ============================================================================
 * interactive_eyes.js — Dynamic Animated Eyes with Mouse Following & Nystagmus Physics
 * NeuroTrial Clinical Research Platform
 * ============================================================================
 */

(function () {
  let isOscillating = false;
  let oscillationAnimId = null;
  let oscillationStartTime = 0;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isTrackingMouse = true;

  // Eye Elements
  let leftPupil, rightPupil, leftEye, rightEye;
  let nystagmusToggleBtn, statusBadge, waveformCanvas, waveformCtx;
  let waveData = [];

  function init() {
    leftEye = document.getElementById("nystagmus-left-eye");
    rightEye = document.getElementById("nystagmus-right-eye");
    leftPupil = document.getElementById("nystagmus-left-pupil");
    rightPupil = document.getElementById("nystagmus-right-pupil");
    nystagmusToggleBtn = document.getElementById("btn-toggle-nystagmus-demo");
    statusBadge = document.getElementById("nystagmus-demo-status-badge");
    waveformCanvas = document.getElementById("nystagmus-live-waveform-canvas");

    if (waveformCanvas) {
      waveformCtx = waveformCanvas.getContext("2d");
    }

    if (!leftEye || !rightEye || !leftPupil || !rightPupil) {
      return;
    }

    // Window Mouse Move Listener
    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (isTrackingMouse && !isOscillating) {
        updatePupilPositions(mouseX, mouseY);
      }
    });

    // Touch support for mobile/tablets
    window.addEventListener("touchmove", (e) => {
      if (e.touches && e.touches[0]) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
        if (isTrackingMouse && !isOscillating) {
          updatePupilPositions(mouseX, mouseY);
        }
      }
    }, { passive: true });

    // Button Toggle Listener
    if (nystagmusToggleBtn) {
      nystagmusToggleBtn.addEventListener("click", () => {
        toggleNystagmusOscillation();
      });
    }

    // Natural random eye blink schedule
    scheduleRandomBlink();

    // Initial neutral center gaze
    updatePupilPositions(window.innerWidth / 2, window.innerHeight / 2);
  }

  function getEyeCenter(element) {
    if (!element) return { x: 0, y: 0 };
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function calculatePupilOffset(eyeCenter, targetX, targetY, maxRadius = 32) {
    const dx = targetX - eyeCenter.x;
    const dy = targetY - eyeCenter.y;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);

    // Damped distance constraint
    const clampedDist = Math.min(dist * 0.12, maxRadius);
    const offsetX = Math.cos(angle) * clampedDist;
    const offsetY = Math.sin(angle) * clampedDist;

    return { offsetX, offsetY, angle, dist };
  }

  function updatePupilPositions(targetX, targetY) {
    if (!leftEye || !rightEye || !leftPupil || !rightPupil) return;

    const leftCenter = getEyeCenter(leftEye);
    const rightCenter = getEyeCenter(rightEye);

    const leftOffset = calculatePupilOffset(leftCenter, targetX, targetY, 30);
    const rightOffset = calculatePupilOffset(rightCenter, targetX, targetY, 30);

    leftPupil.style.transform = `translate(${leftOffset.offsetX.toFixed(1)}px, ${leftOffset.offsetY.toFixed(1)}px)`;
    rightPupil.style.transform = `translate(${rightOffset.offsetX.toFixed(1)}px, ${rightOffset.offsetY.toFixed(1)}px)`;
  }

  function scheduleRandomBlink() {
    const nextBlinkMs = 3200 + Math.random() * 4500;
    setTimeout(() => {
      triggerBlink();
      scheduleRandomBlink();
    }, nextBlinkMs);
  }

  function triggerBlink() {
    if (!leftEye || !rightEye) return;
    leftEye.classList.add("blinking");
    rightEye.classList.add("blinking");

    setTimeout(() => {
      if (leftEye) leftEye.classList.remove("blinking");
      if (rightEye) rightEye.classList.remove("blinking");
    }, 180);
  }

  function toggleNystagmusOscillation() {
    isOscillating = !isOscillating;

    if (isOscillating) {
      startOscillation();
    } else {
      stopOscillation();
    }
  }

  function startOscillation() {
    isOscillating = true;
    oscillationStartTime = performance.now();

    if (nystagmusToggleBtn) {
      nystagmusToggleBtn.classList.add("active-oscillating");
      nystagmusToggleBtn.innerHTML = `
        <span class="btn-osc-pulse-dot"></span>
        <span>Stop Simulation</span>
      `;
    }

    if (statusBadge) {
      statusBadge.className = "nystagmus-status-pill oscillating";
      statusBadge.innerHTML = `
        <span class="osc-beacon"></span>
        <span>Involuntary Oscillation: <strong>1.6 Hz</strong> (Horizontal Jerk)</span>
      `;
    }

    const demoCard = document.getElementById("nystagmus-interactive-card");
    if (demoCard) demoCard.classList.add("is-oscillating");

    // Start 60 FPS Physics Animation Loop
    runOscillationLoop();
  }

  function stopOscillation() {
    isOscillating = false;
    if (oscillationAnimId) {
      cancelAnimationFrame(oscillationAnimId);
      oscillationAnimId = null;
    }

    if (nystagmusToggleBtn) {
      nystagmusToggleBtn.classList.remove("active-oscillating");
      nystagmusToggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        </svg>
        <span>Look How Nystagmus Looks Like</span>
      `;
    }

    if (statusBadge) {
      statusBadge.className = "nystagmus-status-pill tracking";
      statusBadge.innerHTML = `
        <span class="track-beacon"></span>
        <span>Tracking Mouse Cursor</span>
      `;
    }

    const demoCard = document.getElementById("nystagmus-interactive-card");
    if (demoCard) demoCard.classList.remove("is-oscillating");

    // Return pupils smoothly to mouse position
    updatePupilPositions(mouseX, mouseY);
  }

  function runOscillationLoop() {
    if (!isOscillating) return;

    const now = performance.now();
    const elapsedSec = (now - oscillationStartTime) / 1000;

    // Physiological Jerk Nystagmus: Gentle 1.6 Hz fundamental + fast return saccade
    const freqHz = 1.6;
    const omega = 2 * Math.PI * freqHz;
    const amplitudePx = 30; // Clear, unmistakable horizontal oscillation

    // Sinusoidal oscillation with characteristic slow-drift / rapid saccadic recovery
    const slowPhase = Math.sin(elapsedSec * omega);
    const fastPhaseHarmonic = 0.22 * Math.sin(elapsedSec * omega * 2);
    const offsetX = (slowPhase + fastPhaseHarmonic) * amplitudePx;

    // Slight vertical micro-drift (< 1.5px) for realism
    const offsetY = Math.sin(elapsedSec * 0.9) * 1.5;

    if (leftPupil && rightPupil) {
      leftPupil.style.transform = `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px)`;
      rightPupil.style.transform = `translate(${offsetX.toFixed(1)}px, ${offsetY.toFixed(1)}px)`;
    }

    // Render live telemetry waveform graph
    drawWaveform(offsetX);

    oscillationAnimId = requestAnimationFrame(runOscillationLoop);
  }

  function drawWaveform(val) {
    if (!waveformCanvas || !waveformCtx) return;

    const w = waveformCanvas.width;
    const h = waveformCanvas.height;

    waveData.push(val);
    if (waveData.length > w / 2) {
      waveData.shift();
    }

    waveformCtx.clearRect(0, 0, w, h);

    // Center Zero Guide
    waveformCtx.strokeStyle = "rgba(80, 138, 100, 0.22)";
    waveformCtx.lineWidth = 1;
    waveformCtx.setLineDash([3, 3]);
    waveformCtx.beginPath();
    waveformCtx.moveTo(0, h / 2);
    waveformCtx.lineTo(w, h / 2);
    waveformCtx.stroke();
    waveformCtx.setLineDash([]);

    // Live Oscillatory Waveform
    waveformCtx.strokeStyle = "#508a64";
    waveformCtx.lineWidth = 2.2;
    waveformCtx.beginPath();

    for (let i = 0; i < waveData.length; i++) {
      const x = i * 2;
      const y = h / 2 - (waveData[i] * (h / 80));
      if (i === 0) {
        waveformCtx.moveTo(x, y);
      } else {
        waveformCtx.lineTo(x, y);
      }
    }
    waveformCtx.stroke();

    // Pulse head
    if (waveData.length > 0) {
      const lastX = (waveData.length - 1) * 2;
      const lastY = h / 2 - (waveData[waveData.length - 1] * (h / 80));
      waveformCtx.fillStyle = "#3e6e4f";
      waveformCtx.beginPath();
      waveformCtx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      waveformCtx.fill();
    }
  }

  // Global exports
  window.InteractiveEyes = {
    init,
    toggleNystagmusOscillation,
    startOscillation,
    stopOscillation
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
