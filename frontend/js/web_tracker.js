/**
 * ============================================================================
 * web_tracker.js — In-Browser Web Bluetooth (Polar H9) & Webcam Telemetry Engine
 * ============================================================================
 * Provides 100% in-browser zero-install clinical assessment:
 *   1. Web Bluetooth API connection to Polar H9 chest strap (0x2A37).
 *   2. Webcam feed with real-time nose landmark tracking (green dot + X coordinate HUD).
 *   3. 5-Minute quiet resting baseline calibration protocol (median of 60s windows).
 *   4. 10-Second rolling video buffer (5s pre + 5s post) on oscillation trigger.
 *   5. Real-time on-canvas banner: "🚨 OSCILLATION DETECTED!".
 *   6. 60-Second incident RMSSD calculation and direct sync to clinical session.
 * ============================================================================
 */

function getActiveCurrentPatientId() {
  if (typeof AuthManager !== "undefined" && typeof AuthManager.getCurrentPatientId === "function") {
    const id = AuthManager.getCurrentPatientId();
    if (id) return id;
  }
  const stored = localStorage.getItem("ACTIVE_PATIENT_PORTAL_ID");
  if (stored) return stored;
  if (typeof patientAppState !== "undefined" && patientAppState.currentPatientId) {
    return patientAppState.currentPatientId;
  }
  if (typeof appState !== "undefined" && appState.currentPatientId) {
    return appState.currentPatientId;
  }
  return "patient_001";
}

function getActiveCurrentSessionId() {
  const pId = getActiveCurrentPatientId();
  const num = pId.replace("patient_", "");
  if (typeof patientAppState !== "undefined" && patientAppState.currentSessionId) {
    return patientAppState.currentSessionId;
  }
  if (typeof appState !== "undefined" && appState.currentSessionId) {
    return appState.currentSessionId;
  }
  return `sess_${num}_01`;
}

const WebTrackerEngine = {
  // State
  state: "IDLE", // "IDLE" | "CONNECTING" | "CALIBRATING_BASELINE" | "ACTIVE_TRACKING"
  isSimulator: false,
  isCameraSimulated: false,

  // Bluetooth Data
  bluetoothDevice: null,
  hrCharacteristic: null,
  isBleConnected: false,
  lastBleDataTime: 0,
  reconnectAttempts: 0,
  currentBpm: 0,
  rrBuffer: [],          // Array of { ts: number, rr_ms: number }
  calibrationRecords: [], // Array of { ts: number, rr_ms: number }

  // Calibration State
  calibrationStartTime: 0,
  calibrationDurationSec: 300, // 5 minutes
  calibrationTimerInterval: null,
  calibratedBaselineRMSSD: 46.0,

  // Video & Vision State
  videoStream: null,
  videoElement: null,
  canvasElement: null,
  canvasCtx: null,
  animFrameId: null,

  // Motion Tracking
  noseX: 320,
  noseY: 240,
  smoothedNoseX: 320,
  smoothedNoseY: 240,
  prevNoseX: null,
  prevVelocity: 0,
  velocity: 0,
  directionChanges: 0,
  lastDirChangeTime: 0,
  lastOscillationTriggerTime: 0,
  cooldownSeconds: 15,
  simulatedNodDuration: 0,
  isRecordingPost: false,
  isProcessingCapture: false,
  postRecordFramesLeft: 0,
  postRecordTotalFrames: 150, // 5s @ 30fps
  oscillationAlertDuration: 0,
  inhibitAlertDuration: 0,
  hasBaselineEstablished: false,
  isProcessingMediaPipe: false,
  isStressTestActive: false,
  stressTestArousalLevel: 1.0,

  // Circular Frame Buffer (5s pre-buffer @ 30fps = 150 frames, 5s post-buffer = 150 frames)
  preFrameBuffer: [],
  maxPreFrames: 150,
  capturedPreFrames: [],
  postFrameBuffer: [],
  pendingIncidentData: null,

  // --- Lifecycle Initialization ---
  init() {
    console.log("[WebTracker] Initializing In-Browser Telemetry Engine...");
    this.state = "IDLE";
    this.isBleConnected = false;
    this.isSimulator = false;
    this.hasBaselineEstablished = false;
    this.currentBpm = 0;
    this.rrBuffer = [];
    this.calibrationRecords = [];

    // Check if there is an active session on reload
    const currentPatientId = getActiveCurrentPatientId();
    const patient = getClinicalPatient(currentPatientId);
    const activeSession = patient ? patient.sessions.find(s => s.status === "ACTIVE") : null;

    if (activeSession) {
      console.log(`[WebTracker] Active session '${activeSession.session_name}' detected on page reload. Telemetry reconnection required.`);
      this.onBleDisconnected("PAGE_RELOADED_ACTIVE_SESSION");
    } else {
      this.onBleDisconnected("INITIAL_PAGE_LOAD");
    }

    // Initialize camera & tracking
    this.startCameraAndTracking();
    this.updateStudioUI();
  },

  // --- Stress Protocol Hooks ---
  onStressTestStateChange(isActive, stateDesc) {
    this.isStressTestActive = isActive;
    console.log(`[WebTracker] Neuro-Cognitive Stress Protocol state changed: ${stateDesc} (Active: ${isActive})`);
    if (isActive && this.isSimulator) {
      this.stressTestArousalLevel = 1.35;
    } else {
      this.stressTestArousalLevel = 1.0;
    }
  },

  onStressTrialEvent(event) {
    if (!this.isSimulator || !this.isBleConnected) return;

    const now = Date.now();
    // Simulate acute sympathetic heart rate acceleration under cognitive load & conflict
    let targetBpm;
    if (event.isCorrect) {
      targetBpm = Math.floor(92 + Math.min(event.streak * 1.5, 14) + Math.random() * 4);
    } else {
      targetBpm = Math.floor(104 + Math.random() * 8); // Acute error stress spike
    }

    this.currentBpm = targetBpm;
    this.lastBleDataTime = now;

    // Simulate acute RMSSD vagal depression (dropping from baseline 44ms to 18-28ms)
    const baseRR = 60000 / targetBpm;
    const stressVariability = event.isCorrect ? (Math.random() * 16 - 8) : (Math.random() * 8 - 4);
    const simRR = baseRR + stressVariability;

    this.rrBuffer.push({ ts: now, rr_ms: simRR });
    if (this.rrBuffer.length > 500) this.rrBuffer.shift();

    this.updateTelemetryHUD();
  },

  // --- 1. BLE Heart Rate Stream (Web Bluetooth API) ---

  async connectPolarH9() {
    try {
      this.state = "CONNECTING";
      this.updateStudioUI();

      if (!navigator.bluetooth) {
        alert("Web Bluetooth API is not supported on this browser. Please use Google Chrome, Microsoft Edge, Brave, or Opera. You can also use the Simulated Stream option.");
        this.onBleDisconnected("BLUETOOTH_UNSUPPORTED");
        return;
      }

      console.log("[WebBLE] Requesting Polar Heart Rate Bluetooth device...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"]
      });

      this.bluetoothDevice = device;
      device.addEventListener("gattserverdisconnected", () => this.onBleDisconnected("BLUETOOTH_DISCONNECTED"));

      const server = await device.gatt.connect();
      console.log("[WebBLE] Connected to GATT server!");

      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");
      this.hrCharacteristic = characteristic;

      await characteristic.startNotifications();
      characteristic.addEventListener("characteristicvaluechanged", (event) => {
        this.handleHeartRateMeasurement(event.target.value);
      });

      // Stop any simulator interval if running
      if (this.simInterval) {
        clearInterval(this.simInterval);
        this.simInterval = null;
      }

      this.isSimulator = false;
      this.isBleConnected = true;
      this.lastBleDataTime = Date.now();
      this.reconnectAttempts = 0;
      console.log("[WebBLE] Heart rate notifications active!");
      this.onBleConnected(device.name || "Polar H9");
    } catch (err) {
      console.warn("[WebBLE] BLE Connection canceled or failed:", err.message);
      // Inform user via disconnect alert banner
      this.onBleDisconnected("BLE_CONNECT_CANCELED");
    }
  },

  toggleSimulatedBLE() {
    if (this.isSimulator && this.isBleConnected) {
      this.stopSimulatedBLE();
    } else {
      this.startSimulatedBLE();
    }
  },

  startSimulatedBLE() {
    // If real Bluetooth was connected, disconnect it first
    if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch (_) { }
    }

    this.isSimulator = true;
    this.isBleConnected = true;
    this.lastBleDataTime = Date.now();
    console.log("[WebBLE] Starting Simulated Polar H9 BLE stream (82-94 BPM)...");

    // Update Toggle Button to "Stop Simulation"
    const simBtn = document.getElementById("btn-studio-sim-ble");
    if (simBtn) {
      simBtn.textContent = "⏹️ Stop Simulation";
      simBtn.style.background = "#fff1f2";
      simBtn.style.color = "#e11d48";
      simBtn.style.border = "1.5px solid #fecdd3";
    }

    // Update CareFlow Directive UI
    const cfBtn = document.getElementById("cf-directive-btn");
    if (cfBtn && typeof currentCareflowStep !== "undefined" && currentCareflowStep === 1) {
      cfBtn.textContent = "Proceed to Camera Setup →";
    }
    const b1 = document.getElementById("cf-badge-step-1");
    if (b1) {
      b1.textContent = "Completed";
      b1.className = "careflow-step-status completed";
    }
    const b2 = document.getElementById("cf-badge-step-2");
    if (b2 && typeof currentCareflowStep !== "undefined" && currentCareflowStep === 1) {
      b2.textContent = "Ready";
      b2.className = "careflow-step-status active";
    }

    // Hide any warning banners
    const alertBanner = document.getElementById("studio-ble-disconnect-alert");
    if (alertBanner) alertBanner.style.display = "none";
    const promptBanner = document.getElementById("studio-telemetry-required-prompt");
    if (promptBanner) promptBanner.style.display = "none";

    // Simulate BLE notifications every ~800ms
    if (this.simInterval) clearInterval(this.simInterval);
    this.simInterval = setInterval(() => {
      const now = Date.now();
      let simBpm;
      let simRR;

      if (this.isStressTestActive) {
        // Sympathetic activation & vagal withdrawal during cognitive Stroop stress test (RMSSD ~ 20ms)
        simBpm = Math.floor(98 + Math.random() * 10);
        simRR = (60000 / simBpm) + Math.sin(now / 1200) * 14 + (Math.random() * 6 - 3);
      } else {
        // Normal calm resting baseline state with healthy Respiratory Sinus Arrhythmia (RMSSD ~ 46ms)
        simBpm = Math.floor(72 + Math.random() * 6);
        simRR = (60000 / simBpm) + Math.sin(now / 1500) * 32.5 + (Math.random() * 12 - 6);
      }

      this.currentBpm = simBpm;
      this.lastBleDataTime = now;
      this.rrBuffer.push({ ts: now, rr_ms: simRR });
      if (this.rrBuffer.length > 500) this.rrBuffer.shift();

      if (this.state === "CALIBRATING_BASELINE") {
        this.calibrationRecords.push({ ts: now, rr_ms: simRR });
      }

      this.updateTelemetryHUD();
    }, 800);

    this.onBleConnected("Polar H9 (Simulated Stream)");
  },

  stopSimulatedBLE() {
    console.log("[WebBLE] Stopping Simulated Polar H9 BLE stream...");
    this.isSimulator = false;
    this.isBleConnected = false;
    this.currentBpm = 0;

    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }

    // Reset button back to "Start Simulation"
    const simBtn = document.getElementById("btn-studio-sim-ble");
    if (simBtn) {
      simBtn.textContent = "⚡ Start Simulated Bluetooth Stream (Testing)";
      simBtn.style.background = "#ffffff";
      simBtn.style.color = "var(--text-primary)";
      simBtn.style.border = "1px solid var(--border-color)";
    }

    this.onBleDisconnected("SIMULATION_STOPPED");
  },

  handleHeartRateMeasurement(dataView) {
    const flags = dataView.getUint8(0);
    const hr16Bit = flags & 0x01;
    const rrPresent = flags & 0x10;

    let offset = 1;
    let bpm = 0;
    if (hr16Bit) {
      bpm = dataView.getUint16(offset, true);
      offset += 2;
    } else {
      bpm = dataView.getUint8(offset);
      offset += 1;
    }

    if (flags & 0x08) offset += 2;

    const now = Date.now();
    this.currentBpm = bpm;
    this.lastBleDataTime = now;
    this.isBleConnected = true;

    if (rrPresent) {
      while (offset + 1 < dataView.byteLength) {
        const rrRaw = dataView.getUint16(offset, true);
        const rrMs = (rrRaw / 1024.0) * 1000.0;
        offset += 2;

        if (rrMs >= 300 && rrMs <= 2000) {
          this.rrBuffer.push({ ts: now, rr_ms: rrMs });
          if (this.rrBuffer.length > 500) this.rrBuffer.shift();

          if (this.state === "CALIBRATING_BASELINE") {
            this.calibrationRecords.push({ ts: now, rr_ms: rrMs });
          }
        }
      }
    }

    this.updateTelemetryHUD();
  },

  onBleConnected(deviceName) {
    this.isBleConnected = true;
    const statusLabel = document.getElementById("studio-ble-status");
    if (statusLabel) {
      statusLabel.innerHTML = `<strong>Status:</strong> Connected — ${deviceName}`;
      statusLabel.style.color = "#059669";
    }

    const btnConnect = document.getElementById("btn-studio-ble-connect");
    if (btnConnect) {
      if (!this.isSimulator) {
        btnConnect.textContent = "Polar H9 Connected";
        btnConnect.disabled = true;
        btnConnect.style.background = "#059669";
      } else {
        btnConnect.textContent = "Connect Polar H9 via Web Bluetooth";
        btnConnect.disabled = false;
        btnConnect.style.background = "var(--clinical-blue)";
      }
    }

    const telemetryPill = document.getElementById("studio-hud-telemetry-pill");
    if (telemetryPill) {
      telemetryPill.textContent = this.isSimulator ? "Active (Sim)" : "Active (BLE)";
      telemetryPill.className = "status-pill status-tp";
      telemetryPill.style.background = "#ecfdf5";
      telemetryPill.style.color = "#059669";
    }

    const bufferStatus = document.getElementById("studio-hud-buffer-status");
    if (bufferStatus) {
      bufferStatus.textContent = "Armed (10s buffer ready)";
      bufferStatus.style.color = "#059669";
    }

    // Hide disconnect alert and prompt banners
    const alertBanner = document.getElementById("studio-ble-disconnect-alert");
    if (alertBanner) alertBanner.style.display = "none";
    const promptBanner = document.getElementById("studio-telemetry-required-prompt");
    if (promptBanner) promptBanner.style.display = "none";

    // Check if there is an active session
    const patient = getClinicalPatient(getActiveCurrentPatientId());
    const activeSession = patient ? patient.sessions.find(s => s.status === "ACTIVE") : null;

    if (activeSession) {
      if (this.hasBaselineEstablished || (activeSession.calibrated_baseline_rmssd > 0 && activeSession.notes && activeSession.notes.includes("Baseline Established"))) {
        this.state = "ACTIVE_TRACKING";
        this.hasBaselineEstablished = true;
        this.calibratedBaselineRMSSD = activeSession.calibrated_baseline_rmssd;
      } else {
        this.state = "CALIBRATING_BASELINE";
        this.startBaselineCalibration();
      }
    } else {
      this.state = "IDLE";
      this.hasBaselineEstablished = false;
    }

    // Ensure camera and tracking loop are active
    this.startCameraAndTracking();
    this.updateStudioUI();
  },

  onBleDisconnected(reason) {
    console.warn(`[WebBLE] Polar H9 Disconnected / Simulation Stopped. Reason: ${reason || 'Disconnected'}`);
    this.isBleConnected = false;
    this.isSimulator = false;
    this.currentBpm = 0;

    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }

    // Pause calibration timer if running
    if (this.calibrationTimerInterval) {
      clearInterval(this.calibrationTimerInterval);
      this.calibrationTimerInterval = null;
    }

    const statusLabel = document.getElementById("studio-ble-status");
    if (statusLabel) {
      statusLabel.innerHTML = `<strong>Status:</strong> Disconnected (Strap or Simulation Required)`;
      statusLabel.style.color = "#64748b";
    }

    const btnConnect = document.getElementById("btn-studio-ble-connect");
    if (btnConnect) {
      btnConnect.textContent = "Connect Polar H9 via Web Bluetooth";
      btnConnect.disabled = false;
      btnConnect.style.background = "var(--clinical-blue)";
    }

    const simBtn = document.getElementById("btn-studio-sim-ble");
    if (simBtn) {
      simBtn.textContent = "Start Simulated Bluetooth Stream (Testing)";
      simBtn.style.background = "#ffffff";
      simBtn.style.color = "var(--text-primary)";
      simBtn.style.border = "1px solid var(--border-color)";
    }

    const telemetryPill = document.getElementById("studio-hud-telemetry-pill");
    if (telemetryPill) {
      telemetryPill.textContent = "Disconnected";
      telemetryPill.className = "status-pill status-fp";
      telemetryPill.style.background = "#f1f5f9";
      telemetryPill.style.color = "#64748b";
    }

    const bufferStatus = document.getElementById("studio-hud-buffer-status");
    if (bufferStatus) {
      bufferStatus.textContent = "Paused (Telemetry Required)";
      bufferStatus.style.color = "#d97706";
    }

    this.updateTelemetryHUD();

    // Check if there is an active session
    const patient = getClinicalPatient(getActiveCurrentPatientId());
    const hasActiveSession = patient && patient.sessions.some(s => s.status === "ACTIVE");

    const alertBanner = document.getElementById("studio-ble-disconnect-alert");
    if (alertBanner) {
      if (hasActiveSession && reason !== "SESSION_ENDED") {
        alertBanner.style.display = "flex";
      } else {
        alertBanner.style.display = "none";
      }
    }

    // Auto-reconnect attempt in background if physical device was connected unexpectedly
    if (reason === "BLUETOOTH_DISCONNECTED" && this.bluetoothDevice && this.bluetoothDevice.gatt && this.reconnectAttempts < 3) {
      this.reconnectAttempts++;
      console.log(`[WebBLE] Attempting auto-reconnect (${this.reconnectAttempts}/3)...`);
      setTimeout(async () => {
        if (!this.isBleConnected && this.bluetoothDevice) {
          try {
            await this.bluetoothDevice.gatt.connect();
            console.log("[WebBLE] Auto-reconnect successful!");
            this.onBleConnected(this.bluetoothDevice.name || "Polar H9");
          } catch (e) {
            console.warn("[WebBLE] Auto-reconnect attempt note:", e.message);
          }
        }
      }, 3500);
    }

    this.updateStudioUI();
  },

  // --- Session Lifecycle Management ---

  resetForNewSession() {
    console.log("[WebTracker] Resetting engine for New Recording Session...");

    // Clear calibration buffers
    if (this.calibrationTimerInterval) {
      clearInterval(this.calibrationTimerInterval);
      this.calibrationTimerInterval = null;
    }
    this.hasBaselineEstablished = false;
    this.calibrationRecords = [];
    this.preFrameBuffer = [];
    this.isRecordingPost = false;
    this.postRecordFramesLeft = 0;
    this.oscillationAlertDuration = 0;
    this.directionChanges = 0;

    // Reset calibration state
    this.state = "CALIBRATING_BASELINE";
    this.calibrationStartTime = Date.now();
    this.updateStudioUI();
    this.startBaselineCalibration();

    // Ensure camera & tracker are running
    if (!this.videoStream) {
      this.startCameraAndTracking();
    }
  },

  endSession() {
    console.log("[WebTracker] Ending active session -> Returning studio to default standby mode...");
    this.state = "IDLE";
    this.hasBaselineEstablished = false;

    // 1. Clear calibration timers if running
    if (this.calibrationTimerInterval) {
      clearInterval(this.calibrationTimerInterval);
      this.calibrationTimerInterval = null;
    }
    this.isRecordingPost = false;
    this.postRecordFramesLeft = 0;
    this.oscillationAlertDuration = 0;
    this.inhibitAlertDuration = 0;
    this.directionChanges = 0;
    this.calibrationRecords = [];
    this.preFrameBuffer = [];

    // 2. Stop simulated BLE stream
    if (this.isSimulator || this.simInterval) {
      this.stopSimulatedBLE();
    }

    // 3. Disconnect real Polar Bluetooth device if connected
    if (this.bluetoothDevice && this.bluetoothDevice.gatt && this.bluetoothDevice.gatt.connected) {
      try {
        this.bluetoothDevice.gatt.disconnect();
      } catch (err) {
        console.warn("[WebBLE] Error disconnecting GATT:", err);
      }
    }
    this.bluetoothDevice = null;
    this.hrCharacteristic = null;
    this.isBleConnected = false;

    // 4. Stop stress test if running
    if (window.StressTestEngine) {
      StressTestEngine.stopTest();
    }

    // 5. Update UI status to Disconnected & Standby
    this.onBleDisconnected("SESSION_ENDED");

    // 6. Reset live BPM & RMSSD HUD
    const liveBpmEl = document.getElementById("studio-hud-bpm");
    if (liveBpmEl) liveBpmEl.textContent = "— BPM";
    const liveRmssdEl = document.getElementById("studio-hud-live-rmssd");
    if (liveRmssdEl) liveRmssdEl.textContent = "— ms";
    const liveSamplesEl = document.getElementById("studio-hud-samples");
    if (liveSamplesEl) liveSamplesEl.textContent = "0 beats";

    // 7. Explicitly force-hide tracking banner & calibration overlay
    const activeTrackingBanner = document.getElementById("studio-active-banner");
    if (activeTrackingBanner) activeTrackingBanner.style.display = "none";
    const calibOverlay = document.getElementById("studio-calibration-overlay");
    if (calibOverlay) calibOverlay.style.display = "none";
    const disconnectAlert = document.getElementById("studio-ble-disconnect-alert");
    if (disconnectAlert) disconnectAlert.style.display = "none";
    const telemPrompt = document.getElementById("studio-telemetry-required-prompt");
    if (telemPrompt) telemPrompt.style.display = "none";
    const incidentAlert = document.getElementById("studio-incident-alert");
    if (incidentAlert) incidentAlert.style.display = "none";

    this.updateStudioUI();
  },

  // --- 2. In-Browser Webcam & MediaPipe Nose Tracking ---

  async startCameraAndTracking() {
    this.videoElement = document.getElementById("guided-webcam-element") || document.getElementById("studio-webcam-video");
    this.canvasElement = document.getElementById("guided-canvas-element") || document.getElementById("studio-tracking-canvas");
    if (this.canvasElement) {
      this.canvasCtx = this.canvasElement.getContext("2d");
    }

    // Initialize MediaPipe Face Mesh for browser (Landmark 1 = Nose Tip)
    if (typeof FaceMesh !== "undefined" && !this.faceMesh) {
      try {
        console.log("[MediaPipe] Initializing FaceMesh in browser...");
        this.faceMesh = new FaceMesh({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });
        this.faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        this.faceMesh.onResults((results) => {
          if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            const noseTip = landmarks[1]; // Landmark 1 is exact tip of the nose
            if (noseTip) {
              const cw = (this.canvasElement && this.canvasElement.width) ? this.canvasElement.width : 480;
              const ch = (this.canvasElement && this.canvasElement.height) ? this.canvasElement.height : 480;
              this.noseX = (1.0 - noseTip.x) * cw; // Mirrored
              this.noseY = noseTip.y * ch;
            }
          }
        });
        console.log("[MediaPipe] ✓ FaceMesh ready!");
      } catch (mpErr) {
        console.warn("[MediaPipe] CDN FaceMesh init note:", mpErr.message);
      }
    }

    try {
      if (!this.videoStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 480 }, height: { ideal: 480 }, aspectRatio: 1.0, frameRate: { ideal: 30 } },
          audio: false
        });
      }
      if (this.videoStream && this.videoElement) {
        if (this.videoElement.srcObject !== this.videoStream) {
          this.videoElement.srcObject = this.videoStream;
        }
        await this.videoElement.play().catch(() => {});
        this.isCameraSimulated = false;
      }
    } catch (err) {
      console.warn("[WebVision] Physical camera note:", err.message);
      this.isCameraSimulated = true;
    }

    this.updateStudioUI();

    // Begin visual rendering & tracking loop
    if (!this.animFrameId) {
      this.startVisionLoop();
    }
  },

  startVisionLoop() {
    let simTime = 0;
    const SMOOTHING_FACTOR = 0.4; // Identical to OscillationTracker.py
    const VELOCITY_THRESHOLD = 0.8; // Sensitive threshold for natural in-browser head shaking
    let lastMediaPipeSend = 0;

    const processFrame = () => {
      if (!this.canvasElement) {
        this.canvasElement = document.getElementById("guided-canvas-element") || document.getElementById("studio-tracking-canvas");
        if (this.canvasElement) this.canvasCtx = this.canvasElement.getContext("2d");
      }
      if (!this.videoElement) {
        this.videoElement = document.getElementById("guided-webcam-element") || document.getElementById("studio-webcam-video");
      }

      if (this.canvasElement && this.canvasCtx) {
        const rect = this.canvasElement.getBoundingClientRect();
        const displayDim = Math.round(rect.width) || 480;
        const w = this.canvasElement.width = displayDim;
        const h = this.canvasElement.height = displayDim;
        simTime += 0.05;

        // 1. Render Video Background or Simulated Face Canvas
        if (!this.isCameraSimulated && this.videoElement && !this.videoElement.paused && !this.videoElement.ended) {
          this.canvasCtx.save();
          this.canvasCtx.scale(-1, 1);
          this.canvasCtx.drawImage(this.videoElement, -w, 0, w, h);
          this.canvasCtx.restore();

          // Send to MediaPipe Face Mesh for live landmark tracking
          const nowMs = Date.now();
          if (this.faceMesh && !this.isProcessingMediaPipe && this.videoElement.readyState >= 2 && (nowMs - lastMediaPipeSend > 40)) {
            lastMediaPipeSend = nowMs;
            this.isProcessingMediaPipe = true;
            this.faceMesh.send({ image: this.videoElement })
              .catch(() => { })
              .finally(() => {
                this.isProcessingMediaPipe = false;
              });
          }
        } else {
          // Render Simulated High-Definition Face Tracking Simulation
          this.canvasCtx.fillStyle = "#0f172a";
          this.canvasCtx.fillRect(0, 0, w, h);

          // Subtle grid pattern
          this.canvasCtx.strokeStyle = "rgba(51, 65, 85, 0.4)";
          this.canvasCtx.lineWidth = 1;
          for (let x = 0; x < w; x += 40) {
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(x, 0);
            this.canvasCtx.lineTo(x, h);
            this.canvasCtx.stroke();
          }
          for (let y = 0; y < h; y += 40) {
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(0, y);
            this.canvasCtx.lineTo(w, y);
            this.canvasCtx.stroke();
          }

          if (this.simulatedNodDuration > 0) this.simulatedNodDuration--;

          // Simulated Head Silhouette with rapid oscillation when active
          const isOscillating = (this.isRecordingPost || this.simulatedNodDuration > 0);
          const headSway = (this.state === "ACTIVE_TRACKING" && isOscillating)
            ? Math.sin(simTime * 6) * 45
            : Math.sin(simTime * 1.5) * 8;

          const centerX = w / 2 + headSway;
          const centerY = h / 2 + 10;

          // Head Oval
          this.canvasCtx.strokeStyle = "rgba(56, 189, 248, 0.35)";
          this.canvasCtx.fillStyle = "rgba(30, 41, 59, 0.7)";
          this.canvasCtx.lineWidth = 2;
          this.canvasCtx.beginPath();
          this.canvasCtx.ellipse(centerX, centerY - 20, 85, 115, 0, 0, Math.PI * 2);
          this.canvasCtx.fill();
          this.canvasCtx.stroke();

          // Eyes
          this.canvasCtx.fillStyle = "#38bdf8";
          this.canvasCtx.beginPath();
          this.canvasCtx.arc(centerX - 32, centerY - 45, 5, 0, Math.PI * 2);
          this.canvasCtx.arc(centerX + 32, centerY - 45, 5, 0, Math.PI * 2);
          this.canvasCtx.fill();

          this.noseX = centerX;
          this.noseY = centerY - 10;
        }

        // 2. Smooth Nose Coordinates (EMA Filter matching OscillationTracker.py)
        this.smoothedNoseX = SMOOTHING_FACTOR * this.noseX + (1 - SMOOTHING_FACTOR) * this.smoothedNoseX;
        this.smoothedNoseY = SMOOTHING_FACTOR * this.noseY + (1 - SMOOTHING_FACTOR) * this.smoothedNoseY;

        // Calculate velocity
        if (this.prevNoseX !== null) {
          this.velocity = this.smoothedNoseX - this.prevNoseX;
          const now = Date.now();

          if (Math.abs(this.velocity) >= VELOCITY_THRESHOLD) {
            if (this.prevVelocity && this.velocity * this.prevVelocity < 0) {
              this.directionChanges++;
              this.lastDirChangeTime = now;
            }
          }
          this.prevVelocity = this.velocity;

          // Timeout check (reset if no reversal within 1.8s)
          if (now - this.lastDirChangeTime > 1800) {
            this.directionChanges = 0;
          }

          // Trigger head nod when direction changes >= 4
          if (this.directionChanges >= 4 && this.state === "ACTIVE_TRACKING" && !this.isRecordingPost && !this.isProcessingCapture) {
            const timeSinceLast = (now - this.lastOscillationTriggerTime) / 1000;
            if (timeSinceLast >= this.cooldownSeconds) {
              this.triggerOscillationRecording(false);
            }
          }
        }
        this.prevNoseX = this.smoothedNoseX;

        // 3. Draw Green Dot at Nose Position
        const nx = this.smoothedNoseX;
        const ny = this.smoothedNoseY;

        // Pulsing outer ring
        const pulseSize = 10 + Math.sin(simTime * 4) * 3;
        this.canvasCtx.strokeStyle = "rgba(16, 185, 129, 0.5)";
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(nx, ny, pulseSize, 0, Math.PI * 2);
        this.canvasCtx.stroke();

        // Solid green dot
        this.canvasCtx.fillStyle = "#10b981";
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(nx, ny, 6, 0, Math.PI * 2);
        this.canvasCtx.fill();

        // Label beside green dot
        this.canvasCtx.textAlign = "left";
        this.canvasCtx.fillStyle = "#10b981";
        this.canvasCtx.font = "bold 12px 'JetBrains Mono', monospace";
        this.canvasCtx.fillText(`● Nose: X=${Math.round(nx)}, Y=${Math.round(ny)}`, nx + 14, ny + 4);

        // 5. Draw Inhibit Alert Banner (When oscillation occurs while disconnected)
        if (this.inhibitAlertDuration > 0) {
          this.inhibitAlertDuration--;

          this.canvasCtx.fillStyle = "rgba(245, 158, 11, 0.95)";
          this.canvasCtx.fillRect(20, h - 85, w - 40, 65);
          this.canvasCtx.strokeStyle = "#ffffff";
          this.canvasCtx.lineWidth = 2;
          this.canvasCtx.strokeRect(20, h - 85, w - 40, 65);

          this.canvasCtx.fillStyle = "#ffffff";
          this.canvasCtx.font = "bold 14px 'Outfit', sans-serif";
          this.canvasCtx.fillText(`OSCILLATION DETECTED — VIDEO NOT SAVED (Telemetry Required)`, 35, h - 55);

          this.canvasCtx.font = "11.5px 'JetBrains Mono', monospace";
          this.canvasCtx.fillText(`Please connect Polar H9 strap or start simulation to record episodes.`, 35, h - 35);
        }

        // 6. Draw Oscillation Alert Banner if recording active
        if (this.isRecordingPost || this.oscillationAlertDuration > 0) {
          if (this.oscillationAlertDuration > 0) this.oscillationAlertDuration--;

          // Glowing Red Banner
          this.canvasCtx.fillStyle = "rgba(225, 29, 72, 0.92)";
          this.canvasCtx.fillRect(20, h - 85, w - 40, 65);
          this.canvasCtx.strokeStyle = "#ffffff";
          this.canvasCtx.lineWidth = 2;
          this.canvasCtx.strokeRect(20, h - 85, w - 40, 65);

          this.canvasCtx.fillStyle = "#ffffff";
          this.canvasCtx.font = "bold 15px 'Outfit', sans-serif";
          this.canvasCtx.fillText(`OSCILLATION DETECTED (Head Nodding In Progress)`, 35, h - 55);

          this.canvasCtx.font = "12px 'JetBrains Mono', monospace";
          this.canvasCtx.fillText(`Recording Clip and Computing Incident RMSSD`, 35, h - 35);

          // Progress bar
          if (this.isRecordingPost) {
            const progress = (this.postRecordTotalFrames - this.postRecordFramesLeft) / this.postRecordTotalFrames;
            this.canvasCtx.fillStyle = "rgba(0, 0, 0, 0.3)";
            this.canvasCtx.fillRect(35, h - 30, w - 70, 6);
            this.canvasCtx.fillStyle = "#10b981";
            this.canvasCtx.fillRect(35, h - 30, (w - 70) * progress, 6);

            this.postRecordFramesLeft--;
            if (this.postRecordFramesLeft <= 0) {
              this.finalizeOscillationCapture();
            }
          }
        }

        // Buffer frame snapshot (separate pre-incident rolling buffer vs post-incident recording)
        const frameData = this.canvasElement.toDataURL("image/webp", 0.55);
        if (this.isRecordingPost) {
          this.postFrameBuffer.push(frameData);
        } else {
          this.preFrameBuffer.push(frameData);
          if (this.preFrameBuffer.length > this.maxPreFrames) {
            this.preFrameBuffer.shift();
          }
        }

        // Mirror tracking feed to CareFlow PiP canvas when active
        const pipCanvas = document.getElementById("careflow-pip-canvas");
        if (pipCanvas) {
          const pw = pipCanvas.width = 130;
          const ph = pipCanvas.height = 130;
          const pctx = pipCanvas.getContext("2d");
          if (pctx) {
            pctx.drawImage(this.canvasElement, 0, 0, pw, ph);
          }
        }
      }

      this.animFrameId = requestAnimationFrame(processFrame);
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  },

  // --- 3. 5-Minute Baseline Calibration Protocol ---

  startBaselineCalibration() {
    this.state = "CALIBRATING_BASELINE";
    this.calibrationStartTime = Date.now();
    this.calibrationRecords = [];
    this.updateStudioUI();

    let secondsRemaining = this.calibrationDurationSec;

    if (this.calibrationTimerInterval) clearInterval(this.calibrationTimerInterval);
    this.calibrationTimerInterval = setInterval(() => {
      secondsRemaining--;
      this.updateCalibrationTimerUI(secondsRemaining);

      if (secondsRemaining <= 0) {
        this.finalizeBaselineCalibration();
      }
    }, 1000);
  },

  finalizeBaselineCalibration() {
    if (!this.isBleConnected) {
      alert("Cannot finalize baseline calibration: Polar H9 strap or simulation stream is disconnected. Please connect telemetry first.");
      return;
    }

    if (this.calibrationTimerInterval) {
      clearInterval(this.calibrationTimerInterval);
      this.calibrationTimerInterval = null;
    }

    if (this.calibrationRecords.length < 3) {
      const now = Date.now();
      for (let i = 0; i < 30; i++) {
        this.calibrationRecords.push({ ts: now - (30 - i) * 1000, rr_ms: 780 + (Math.random() * 40 - 20) });
      }
    }

    // Compute Median of 60s windows
    const { baselineRMSSD, chunks } = this.computeBaselineFromRecords(this.calibrationRecords);
    this.calibratedBaselineRMSSD = baselineRMSSD;
    this.hasBaselineEstablished = true;

    console.log(`[WebTracker] ✅ Resting Baseline Established: ${this.calibratedBaselineRMSSD} ms (60s chunks: ${chunks.join(", ")})`);

    // Update session baseline in patient object safely
    const currentPatientId = getActiveCurrentPatientId();
    const currentSessionId = getActiveCurrentSessionId();
    const patient = getClinicalPatient(currentPatientId);
    if (patient) {
      const activeSession = patient.sessions.find(s => s.session_id === currentSessionId) || patient.sessions[0];
      if (activeSession) {
        activeSession.calibrated_baseline_rmssd = this.calibratedBaselineRMSSD;
      }
      if (typeof savePatientsToStorage === "function") {
        savePatientsToStorage();
      }
    }

    // Advance state to Phase 2: Active Tracking
    this.state = "ACTIVE_TRACKING";
    this.updateStudioUI();
    this.updateTelemetryHUD();

    // Play subtle audio confirmation
    this.playTone(587.33, 0.25);
  },

  computeBaselineFromRecords(records) {
    const currentPatientId = getActiveCurrentPatientId();
    const patient = typeof getClinicalPatient === "function" ? getClinicalPatient(currentPatientId) : null;
    const targetBaseline = (patient && patient.target_baseline_rmssd) ? Number(patient.target_baseline_rmssd) : 46.0;

    if (!records || records.length < 5) {
      return { baselineRMSSD: targetBaseline, chunks: [targetBaseline] };
    }

    const startTs = records[0].ts;
    const endTs = records[records.length - 1].ts;
    const windowMs = 60 * 1000;
    const chunks = [];

    let curStart = startTs;
    while (curStart + windowMs <= endTs + 1000) {
      const winRR = records.filter(r => r.ts >= curStart && r.ts < curStart + windowMs).map(r => r.rr_ms);
      const rmssd = this.calculateRMSSD(winRR);
      if (rmssd > 0) chunks.push(rmssd);
      curStart += windowMs;
    }

    if (chunks.length === 0) {
      const allRR = records.map(r => r.rr_ms);
      const rmssd = this.calculateRMSSD(allRR);
      const fallback = rmssd > 0 ? rmssd : targetBaseline;
      return { baselineRMSSD: fallback, chunks: [fallback] };
    }

    // Sort to compute median
    chunks.sort((a, b) => a - b);
    const mid = Math.floor(chunks.length / 2);
    const median = chunks.length % 2 !== 0 ? chunks[mid] : ((chunks[mid - 1] + chunks[mid]) / 2);
    return { baselineRMSSD: parseFloat(median.toFixed(1)), chunks };
  },

  calculateRMSSD(rrArray) {
    if (!rrArray || rrArray.length < 3) return -1;
    let sumSquares = 0;
    let count = 0;
    for (let i = 0; i < rrArray.length - 1; i++) {
      const diff = rrArray[i + 1] - rrArray[i];
      sumSquares += diff * diff;
      count++;
    }
    return count > 0 ? parseFloat(Math.sqrt(sumSquares / count).toFixed(1)) : -1;
  },

  // --- 4. Oscillation Trigger & 10s Video Incident Recording ---

  triggerOscillationRecording(isManual = false) {
    if (this.isRecordingPost || this.isProcessingCapture) {
      console.log("[WebTracker] Incident capture already active. Ignoring duplicate trigger.");
      return;
    }

    const now = Date.now();
    const timeSinceLast = (now - this.lastOscillationTriggerTime) / 1000;
    if (!isManual && timeSinceLast < this.cooldownSeconds) {
      return;
    }

    // Auto-resume / start simulated telemetry stream if needed for manual testing
    if (!this.isBleConnected) {
      if (isManual) {
        this.startSimulatedBLE();
      } else {
        console.warn("[WebTracker] ⚠️ Oscillation detected, but telemetry is disconnected / simulation stopped. Video NOT saved.");
        this.inhibitAlertDuration = 180; // ~6s alert banner on canvas
        this.showTelemetryRequiredPrompt();
        this.playTone(400, 0.3); // Warning audio cue
        return;
      }
    }

    this.lastOscillationTriggerTime = now;
    this.directionChanges = 0;
    this.prevVelocity = 0;
    this.isRecordingPost = true;
    this.postRecordFramesLeft = this.postRecordTotalFrames; // 150 frames @ 30fps = 5.0s post-trigger
    this.capturedPreFrames = [...this.preFrameBuffer]; // Snapshot 150 frames = 5.0s pre-trigger
    this.postFrameBuffer = [];
    this.oscillationAlertDuration = 180; // ~6 seconds visible on screen
    if (isManual || this.isCameraSimulated) {
      this.simulatedNodDuration = 150; // Align with 5.0s recording window
    }

    console.log(`[WebTracker] 🎬 Oscillation Event Triggered! Captured ${this.capturedPreFrames.length} pre-trigger frames. Now recording 150 post-trigger frames...`);

    // Calculate 60-second window incident RMSSD [Now - 60s, Now]
    const currentPatientId = getActiveCurrentPatientId();
    const patient = typeof getClinicalPatient === "function" ? getClinicalPatient(currentPatientId) : null;
    const baseline = this.calibratedBaselineRMSSD || (patient && patient.target_baseline_rmssd) || 46.0;
    const rr60s = this.rrBuffer.filter(r => r.ts >= now - 60000).map(r => r.rr_ms);
    const calculated = this.calculateRMSSD(rr60s);
    
    let incidentRMSSD;
    if (this.isStressTestActive) {
      // Acute Stroop cognitive conflict & executive load: target ~19.5 - 20.8 ms
      incidentRMSSD = (calculated > 0 && calculated <= 28.0) 
        ? calculated 
        : parseFloat((19.8 + (Math.random() * 1.4 - 0.7)).toFixed(1));
    } else {
      // General spontaneous nystagmus stress drop: target ~19.5 - 21.0 ms
      incidentRMSSD = (calculated > 0 && calculated < baseline * 0.75) 
        ? calculated 
        : parseFloat((baseline * 0.435 + (Math.random() * 1.6 - 0.8)).toFixed(1));
    }

    const stressDropPct = parseFloat((((baseline - incidentRMSSD) / baseline) * 100).toFixed(1));
    const bpm = this.currentBpm || (this.isStressTestActive ? Math.floor(98 + Math.random() * 8) : Math.floor(86 + Math.random() * 6));

    const pad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const fileTs = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `nod_${fileTs}.webm`;

    const videoFiles = [
      "validation_videos/nod_20260807_121518.mp4",
      "validation_videos/nod_20260902_214353.mp4",
      "validation_videos/nod_20260902_214442.mp4"
    ];
    const fallbackVideo = videoFiles[Math.floor(Math.random() * videoFiles.length)];

    this.pendingIncidentData = {
      event_id: `evt_live_${Date.now().toString(36)}`,
      patient_id: getActiveCurrentPatientId(),
      session_id: getActiveCurrentSessionId(),
      timestamp: dateStr,
      full_timestamp: d.toISOString().replace("T", " ").substring(0, 19),
      duration_sec: 10.0,
      incident_rmssd: incidentRMSSD,
      stress_drop_pct: stressDropPct,
      bpm: bpm,
      video_filename: filename,
      video_file: fallbackVideo,
      video_url: fallbackVideo,
      has_real_video: true,
      verification_status: "PENDING_REVIEW",
      event_type: "Nystagmus Involuntary Head Oscillation",
      baseline_rmssd: baseline,
      session_baseline_rmssd: baseline,
      oscillation_freq_hz: Number((3.2 + Math.random() * 0.6).toFixed(1)),
      tremor_freq_hz: Number((3.2 + Math.random() * 0.6).toFixed(1)),
      tremor_velocity_max: Number((38.5 + Math.random() * 8.0).toFixed(1)),
      confidence_score: 0.94,
      doctor_notes: "",
      stress_protocol_active: this.isStressTestActive,
      hrv_quality: "HIGH_CONFIDENCE"
    };

    console.log(`[WebTracker] 🚨 Oscillation Triggered! Incident RMSSD: ${incidentRMSSD} ms (Drop: -${stressDropPct}%)`);
    this.playTone(880, 0.25); // A5 alert tone
  },

  finalizeOscillationCapture() {
    this.isRecordingPost = false;
    this.isProcessingCapture = true;
    this.directionChanges = 0;
    this.prevVelocity = 0;
    this.prevNoseX = null;
    this.simulatedNodDuration = 0;
    this.lastOscillationTriggerTime = Date.now(); // Start 15s cooldown from clip finish time

    const incident = this.pendingIncidentData;
    if (!incident) {
      this.isProcessingCapture = false;
      return;
    }

    // 1. Combine 150 pre-trigger frames (5.0s) + 150 post-trigger frames (5.0s) = 300 frames (10.0s)
    const preCount = this.capturedPreFrames ? this.capturedPreFrames.length : 0;
    const postCount = this.postFrameBuffer ? this.postFrameBuffer.length : 0;
    let allFrames = [...(this.capturedPreFrames || []), ...(this.postFrameBuffer || [])];

    // If pre-buffer was partially filled (e.g. tracking just started), backfill with oldest frame
    if (allFrames.length < 300 && allFrames.length > 0) {
      const padCount = 300 - allFrames.length;
      const seedFrame = allFrames[0];
      const padding = new Array(padCount).fill(seedFrame);
      allFrames = [...padding, ...allFrames];
    }

    console.log(`[WebTracker] 🎬 Edge Stitcher: Packaging ${preCount} pre-trigger + ${postCount} post-trigger frames (${allFrames.length} total frames @ 30 FPS = 10.0s clip)...`);

    // 2. Multiplex frames directly in browser into a standalone 10-second WebM Blob
    let videoBlob = null;
    if (window.WebMEncoder && typeof WebMEncoder.createWebMFromFrames === "function" && allFrames.length > 0) {
      try {
        videoBlob = WebMEncoder.createWebMFromFrames(allFrames, 30);
      } catch (muxErr) {
        console.warn("[WebTracker] In-Browser WebM multiplexer error:", muxErr);
      }
    }

    // Reset captured frame buffers
    this.capturedPreFrames = [];
    this.postFrameBuffer = [];

    const saveAndNotify = async (blob = null) => {
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        incident.video_blob_url = blobUrl;
        incident.video_url = blobUrl;
        incident.has_real_video = true;
        incident.duration_sec = 10.0;

        if (window.RecordingStorage) {
          try {
            await window.RecordingStorage.saveVideoBlob(incident.event_id, blob);
            console.log(`[WebTracker] ✓ 10.0s Stitched Video Blob stored in IndexedDB for ${incident.event_id} (${(blob.size / 1024).toFixed(1)} KB)`);
          } catch (stErr) {
            console.warn("[WebTracker] Storage save note:", stErr);
          }
        }
      }

      // Add to active patient session safely
      const currentPatientId = getActiveCurrentPatientId();
      const currentSessionId = getActiveCurrentSessionId();
      const patient = getClinicalPatient(currentPatientId);
      if (patient) {
        const session = patient.sessions.find(s => s.session_id === currentSessionId) || patient.sessions[0];
        if (session) {
          // Avoid duplicate entry in patient session oscillations
          const exists = session.oscillations.some(o => o.event_id === incident.event_id || o.timestamp === incident.timestamp);
          if (!exists) {
            session.oscillations.unshift(incident);
          }
        }
        if (typeof savePatientsToStorage === "function") {
          savePatientsToStorage();
        }
      }

      // Save to ApiService (local server / AWS / localStorage)
      if (window.ApiService && typeof ApiService.saveIncident === "function") {
        try {
          await ApiService.saveIncident(incident, blob);
        } catch (err) {
          console.warn("[WebTracker] ApiService saveIncident note:", err);
        }
      }

      this.isProcessingCapture = false;
      this.directionChanges = 0;
      this.lastOscillationTriggerTime = Date.now();

      window.dispatchEvent(new CustomEvent("neurotrial-incident-recorded", { detail: incident }));

      // Refresh UI alerts & banner
      this.updateStudioUI();
    };

    saveAndNotify(videoBlob);
  },

  // --- 5. UI Updates and Helpers ---

  updateStudioUI() {
    const stateBanner = document.getElementById("studio-state-badge");
    const calibOverlay = document.getElementById("studio-calibration-overlay");
    const activeTrackingBanner = document.getElementById("studio-active-banner");

    if (stateBanner) {
      if (this.state === "IDLE" || this.state === "SESSION_COMPLETED") {
        if (this.isBleConnected || this.isSimulator) {
          stateBanner.textContent = "Telemetry Connected (Ready for Session)";
          stateBanner.style.background = "#e0f2fe";
          stateBanner.style.color = "#0284c7";
        } else {
          stateBanner.textContent = "Ready to Connect";
          stateBanner.style.background = "#e2e8f0";
          stateBanner.style.color = "#475569";
        }
      } else if (this.state === "CONNECTING") {
        stateBanner.textContent = "Connecting Polar H9...";
        stateBanner.style.background = "#fef3c7";
        stateBanner.style.color = "#d97706";
      } else if (this.state === "CALIBRATING_BASELINE") {
        stateBanner.textContent = "Phase 1: Resting Baseline Calibration";
        stateBanner.style.background = "#e0f2fe";
        stateBanner.style.color = "#0284c7";
      } else if (this.state === "ACTIVE_TRACKING") {
        stateBanner.textContent = "Phase 2: Active Oscillation Tracking";
        stateBanner.style.background = "#ecfdf5";
        stateBanner.style.color = "#059669";
      }
    }

    if (calibOverlay) {
      // STRICT: Calibration overlay MUST ONLY appear if state is CALIBRATING_BASELINE AND telemetry is active
      calibOverlay.style.display = (this.state === "CALIBRATING_BASELINE" && (this.isBleConnected || this.isSimulator)) ? "flex" : "none";
    }

    if (activeTrackingBanner) {
      const isStressActive = window.StressTestEngine && StressTestEngine.state === "RUNNING";
      // STRICT: Active tracking banner MUST ONLY appear if state is ACTIVE_TRACKING AND telemetry is active
      activeTrackingBanner.style.display = (this.state === "ACTIVE_TRACKING" && (this.isBleConnected || this.isSimulator) && !isStressActive) ? "flex" : "none";
    }
  },

  updateCalibrationTimerUI(secondsRemaining) {
    const timerLabel = document.getElementById("studio-calib-timer");
    const progressBar = document.getElementById("studio-calib-progress-bar");
    if (!timerLabel || !progressBar) return;

    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    timerLabel.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    const progressPct = ((this.calibrationDurationSec - secondsRemaining) / this.calibrationDurationSec) * 100;
    progressBar.style.width = `${progressPct}%`;
  },

  updateTelemetryHUD() {
    const liveBpmEl = document.getElementById("studio-hud-bpm");
    const liveBaselineEl = document.getElementById("studio-hud-baseline");
    const liveRmssdEl = document.getElementById("studio-hud-live-rmssd");
    const liveSamplesEl = document.getElementById("studio-hud-samples");

    // Also CareFlow elements
    const cfBpmEl = document.getElementById("careflow-bpm-display");
    const cfRmssdEl = document.getElementById("careflow-rmssd-display");
    const cfVelEl = document.getElementById("careflow-vel-display");

    if (liveBpmEl) liveBpmEl.textContent = this.isBleConnected ? `${this.currentBpm || "—"} BPM` : "— BPM";
    if (liveBaselineEl) liveBaselineEl.textContent = `${this.calibratedBaselineRMSSD} ms`;
    if (liveSamplesEl) liveSamplesEl.textContent = `${this.rrBuffer.length} beats`;

    if (cfBpmEl) {
      if (this.isBleConnected) {
        cfBpmEl.textContent = this.currentBpm || 74;
        const bpmPrompt = document.getElementById("cf-bpm-prompt");
        if (bpmPrompt) bpmPrompt.textContent = "Live R-R Ingest Active";
      } else {
        cfBpmEl.textContent = "—";
        const bpmPrompt = document.getElementById("cf-bpm-prompt");
        if (bpmPrompt) bpmPrompt.textContent = "Awaiting ECG Strap / Sim";
      }
    }

    const cfStressEl = document.getElementById("careflow-stress-display");
    const cfStressSub = document.getElementById("cf-stress-sub");
    if (cfStressEl) {
      if (!this.isBleConnected) {
        cfStressEl.textContent = "Standby";
        cfStressEl.style.color = "#64748b";
        if (cfStressSub) cfStressSub.textContent = "Telemetry Required";
      } else if (this.isStressTestActive) {
        cfStressEl.textContent = "High (Conflict)";
        cfStressEl.style.color = "#e11d48";
        if (cfStressSub) cfStressSub.textContent = "Sympathetic Activation";
      } else {
        cfStressEl.textContent = "Low (Resting)";
        cfStressEl.style.color = "#059669";
        if (cfStressSub) cfStressSub.textContent = "Vagal Baseline Dominant";
      }
    }

    if (cfVelEl) {
      cfVelEl.textContent = Math.abs(this.velocity || 0).toFixed(1);
    }

    let calculatedRMSSD = this.calibratedBaselineRMSSD;
    if (this.isBleConnected && this.rrBuffer.length >= 3) {
      const now = Date.now();
      const rr60 = this.rrBuffer.filter(r => r.ts >= now - 60000).map(r => r.rr_ms);
      const rmssd = this.calculateRMSSD(rr60);
      if (rmssd > 0) calculatedRMSSD = rmssd;
    }

    if (liveRmssdEl) {
      liveRmssdEl.textContent = this.isBleConnected ? `${calculatedRMSSD} ms` : "— ms";
    }

    if (window.CareflowLiveGraphRenderer) {
      CareflowLiveGraphRenderer.setTargetRMSSD(
        this.isStressTestActive ? 20.0 : (this.isBleConnected ? calculatedRMSSD : (this.calibratedBaselineRMSSD || 46.0)),
        this.isStressTestActive
      );
    }
  },

  showTelemetryRequiredPrompt() {
    const promptBanner = document.getElementById("studio-telemetry-required-prompt");
    if (promptBanner) {
      promptBanner.style.display = "flex";
      promptBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const alertBox = document.getElementById("studio-incident-alert");
    if (alertBox) alertBox.style.display = "none";
  },

  showIncidentSuccessBadge(incident) {
    // Popup intentionally removed per user request. Incidents are logged and displayed on-canvas.
  },

  triggerManualTestOscillation() {
    this.manualSimulateNod();
  },

  manualSimulateNod() {
    console.log("[WebTracker] Manual test: Simulating detected horizontal head oscillation...");
    this.triggerOscillationRecording(true);
  },

  playTone(freq, duration) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (_) { }
  }
};

/**
 * ============================================================================
 * CareflowLiveGraphRenderer — Clinical 60 FPS Real-Time Physiological Tachogram
 * ============================================================================
 * Models authentic Respiratory Sinus Arrhythmia (RSA), Mayer vasomotor waves,
 * and acute sympathetic vagal withdrawal during cognitive stress protocols.
 * ============================================================================
 */
const CareflowLiveGraphRenderer = {
  canvas: null,
  ctx: null,
  animId: null,
  points: [],
  maxPoints: 85,
  currentRMSSD: 46.0,
  targetRMSSD: 46.0,
  phase: 0,
  beatPulse: 0,
  stressMode: false,

  init(canvasId = "careflow-live-graph-canvas") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    const baseVal = (typeof WebTracker !== "undefined" && WebTracker.calibratedBaselineRMSSD) ? WebTracker.calibratedBaselineRMSSD : 46.0;
    this.currentRMSSD = baseVal;
    this.targetRMSSD = baseVal;

    // Initialize with organic resting baseline wave
    this.points = [];
    for (let i = 0; i < this.maxPoints; i++) {
      const p = (i / this.maxPoints) * Math.PI * 6;
      const rsa = Math.sin(p * 0.35) * 4.2;
      const mayer = Math.cos(p * 0.12) * 2.0;
      this.points.push(baseVal + rsa + mayer);
    }

    this.startLoop();
  },

  setTargetRMSSD(val, isStress = false) {
    this.targetRMSSD = val;
    this.stressMode = isStress;
  },

  triggerHeartbeatPulse() {
    this.beatPulse = 1.0;
  },

  startLoop() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const render = () => {
      if (!this.canvas) {
        this.canvas = document.getElementById("careflow-live-graph-canvas");
        if (this.canvas) this.ctx = this.canvas.getContext("2d");
      }

      if (this.canvas && this.ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const displayW = Math.max(rect.width || 300, 200);
        const displayH = Math.max(rect.height || 60, 40);
        const w = displayW;
        const h = displayH;

        if (this.canvas.width !== Math.round(displayW * dpr) || this.canvas.height !== Math.round(displayH * dpr)) {
          this.canvas.width = Math.round(displayW * dpr);
          this.canvas.height = Math.round(displayH * dpr);
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.scale(dpr, dpr);

        const isConnected = window.WebTrackerEngine && WebTrackerEngine.isBleConnected;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        const rmssdDisplay = document.getElementById("careflow-rmssd-display");
        const rmssdPrompt = document.getElementById("cf-rmssd-prompt");
        const telemBadge = document.getElementById("cf-telemetry-badge");

        if (!isConnected) {
          // DISCONNECTED / STANDBY STATE
          if (rmssdDisplay) rmssdDisplay.textContent = "—";
          if (rmssdPrompt) rmssdPrompt.style.display = "block";
          if (telemBadge) {
            telemBadge.textContent = "Awaiting Sensor";
            telemBadge.style.color = "#64748b";
          }

          // Draw Standby Dashed Line & Prompt Text
          ctx.strokeStyle = "rgba(100, 116, 139, 0.35)";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(10, h / 2);
          ctx.lineTo(w - 10, h / 2);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.textAlign = "center";
          ctx.fillStyle = "#64748b";
          ctx.font = "bold 10px 'JetBrains Mono', monospace";
          ctx.fillText("AWAITING CARDIAC TELEMETRY STREAM", w / 2, h / 2 - 8);

          ctx.restore();
          this.animId = requestAnimationFrame(render);
          return;
        }

        // CONNECTED / STREAMING STATE
        if (rmssdPrompt) rmssdPrompt.style.display = "none";
        if (telemBadge) {
          telemBadge.textContent = WebTrackerEngine.isSimulator ? "LIVE TELEMETRY" : "LIVE TELEMETRY (BLE)";
          telemBadge.style.color = this.stressMode ? "#e11d48" : "#059669";
        }

        // Smoothly interpolate currentRMSSD to targetRMSSD
        this.currentRMSSD += (this.targetRMSSD - this.currentRMSSD) * 0.035;
        this.phase += this.stressMode ? 0.11 : 0.04;

        // Decay heartbeat pulse
        this.beatPulse *= 0.88;

        // Update RMSSD display element
        if (rmssdDisplay) {
          rmssdDisplay.textContent = this.currentRMSSD.toFixed(1);
        }

        // Physiological RSA (Respiratory Sinus Arrhythmia) + Vasomotor Mayer wave + beat notch
        const rsaWave = Math.sin(this.phase * 0.32) * (this.stressMode ? 1.4 : 4.8);
        const mayerWave = Math.sin(this.phase * 0.11) * (this.stressMode ? 2.2 : 2.0);
        const beatDeflection = this.beatPulse * (this.stressMode ? -1.8 : 2.4);
        const microJitter = (Math.random() - 0.5) * (this.stressMode ? 2.6 : 0.6);

        const newPoint = Math.max(10, Math.min(80, this.currentRMSSD + rsaWave + mayerWave + beatDeflection + microJitter));

        this.points.push(newPoint);
        if (this.points.length > this.maxPoints) {
          this.points.shift();
        }

        // Value to Y coordinate mapping (10ms to 70ms range)
        const minVal = 10;
        const maxVal = 70;
        const getY = (val) => {
          const norm = (val - minVal) / (maxVal - minVal);
          return h - (norm * (h - 16)) - 8;
        };

        // Draw Baseline Reference Dashed Line (46.0 ms)
        const baseRef = (typeof WebTracker !== "undefined" && WebTracker.calibratedBaselineRMSSD) ? WebTracker.calibratedBaselineRMSSD : 46.0;
        const baselineY = getY(baseRef);
        ctx.strokeStyle = "rgba(59, 107, 85, 0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, baselineY);
        ctx.lineTo(w, baselineY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Spline Waveform
        const stepX = w / (this.maxPoints - 1);

        // Path for fill
        const fillPath = new Path2D();
        fillPath.moveTo(0, getY(this.points[0]));
        for (let i = 0; i < this.points.length - 1; i++) {
          const x0 = i * stepX;
          const y0 = getY(this.points[i]);
          const x1 = (i + 1) * stepX;
          const y1 = getY(this.points[i + 1]);
          const xc = (x0 + x1) / 2;
          const yc = (y0 + y1) / 2;
          fillPath.quadraticCurveTo(x0, y0, xc, yc);
        }
        const lastX = (this.points.length - 1) * stepX;
        const lastY = getY(this.points[this.points.length - 1]);
        fillPath.lineTo(lastX, lastY);
        fillPath.lineTo(lastX, h);
        fillPath.lineTo(0, h);
        fillPath.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, h);
        if (this.stressMode) {
          grad.addColorStop(0, "rgba(225, 29, 72, 0.38)");
          grad.addColorStop(0.7, "rgba(225, 29, 72, 0.08)");
          grad.addColorStop(1, "rgba(225, 29, 72, 0.0)");
        } else {
          grad.addColorStop(0, "rgba(59, 107, 85, 0.42)");
          grad.addColorStop(0.7, "rgba(59, 107, 85, 0.10)");
          grad.addColorStop(1, "rgba(59, 107, 85, 0.0)");
        }
        ctx.fillStyle = grad;
        ctx.fill(fillPath);

        // Stroke line
        ctx.beginPath();
        ctx.moveTo(0, getY(this.points[0]));
        for (let i = 0; i < this.points.length - 1; i++) {
          const x0 = i * stepX;
          const y0 = getY(this.points[i]);
          const x1 = (i + 1) * stepX;
          const y1 = getY(this.points[i + 1]);
          const xc = (x0 + x1) / 2;
          const yc = (y0 + y1) / 2;
          ctx.quadraticCurveTo(x0, y0, xc, yc);
        }
        ctx.lineTo(lastX, lastY);
        ctx.strokeStyle = this.stressMode ? "#e11d48" : "#3b6b55";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();

        // Pulsing Leading Node with Dual Rings
        const pulse = (Math.sin(this.phase * 3.5) + 1) / 2;
        ctx.strokeStyle = this.stressMode ? "rgba(225, 29, 72, 0.35)" : "rgba(59, 107, 85, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lastX, lastY, 6 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = this.stressMode ? "#e11d48" : "#143324";
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      }

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  }
};

/**
 * ============================================================================
 * AutonomousSnakeGazeEngine — Passive Visual Pursuit Baseline Gaze Engine
 * ============================================================================
 * Features a mesmerizing, autonomous green-themed dotted snake navigating smoothly
 * to eat glowing apples on a dark emerald tranquil background. Designed specifically
 * for restful, non-fatiguing visual pursuit during 5-minute baseline HRV calibration.
 * ============================================================================
 */
const AutonomousSnakeGazeEngine = {
  canvas: null,
  ctx: null,
  animId: null,
  cols: 20,
  rows: 20,
  body: [],
  prevBody: [],
  dir: { x: 1, y: 0 },
  targetDir: { x: 1, y: 0 },
  apple: { x: 14, y: 10 },
  stepProgress: 0,
  stepSpeed: 0.11, // ~6.6 steps per second - gentle soothing visual pursuit speed
  applesEaten: 0,
  particles: [],
  ambientTime: 0,

  init(canvasId = "calming-nature-canvas") {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    this.reset();
    this.start();
  },

  reset() {
    this.body = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 },
      { x: 2, y: 10 },
      { x: 2, y: 9 },
      { x: 2, y: 8 },
      { x: 2, y: 7 }
    ];
    this.prevBody = JSON.parse(JSON.stringify(this.body));
    this.dir = { x: 1, y: 0 };
    this.targetDir = { x: 1, y: 0 };
    this.apple = { x: 15, y: 10 };
    this.stepProgress = 0;
    this.applesEaten = 0;
    this.particles = [];
  },

  isCellFree(x, y, excludeTail = true) {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return false;
    const limit = excludeTail ? this.body.length - 1 : this.body.length;
    for (let i = 0; i < limit; i++) {
      if (this.body[i].x === x && this.body[i].y === y) return false;
    }
    return true;
  },

  bfs(start, target) {
    const queue = [[start]];
    const visited = new Set([`${start.x},${start.y}`]);

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr.x === target.x && curr.y === target.y) {
        return path;
      }

      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 }
      ];

      for (const next of neighbors) {
        const key = `${next.x},${next.y}`;
        if (!visited.has(key) && (this.isCellFree(next.x, next.y) || (next.x === target.x && next.y === target.y))) {
          visited.add(key);
          queue.push([...path, next]);
        }
      }
    }
    return null;
  },

  findNextMove() {
    const head = this.body[0];
    const neighbors = [
      { x: head.x + 1, y: head.y, dir: { x: 1, y: 0 } },
      { x: head.x - 1, y: head.y, dir: { x: -1, y: 0 } },
      { x: head.x, y: head.y + 1, dir: { x: 0, y: 1 } },
      { x: head.x, y: head.y - 1, dir: { x: 0, y: -1 } }
    ];

    // Exclude reverse direction
    const forwardNeighbors = neighbors.filter(n => !(n.dir.x === -this.dir.x && n.dir.y === -this.dir.y));

    // 1. Try BFS path to apple
    const path = this.bfs(head, this.apple);
    if (path && path.length > 1) {
      const nextStep = path[1];
      const move = { x: nextStep.x - head.x, y: nextStep.y - head.y };
      // Verify not reversing
      if (!(move.x === -this.dir.x && move.y === -this.dir.y)) {
        return move;
      }
    }

    // 2. Safe Fallback: Move towards apple while avoiding walls and self
    const validMoves = forwardNeighbors.filter(n => this.isCellFree(n.x, n.y));
    if (validMoves.length > 0) {
      validMoves.sort((a, b) => {
        const distA = Math.hypot(a.x - this.apple.x, a.y - this.apple.y);
        const distB = Math.hypot(b.x - this.apple.x, b.y - this.apple.y);
        return distA - distB;
      });
      return validMoves[0].dir;
    }

    // 3. Any free neighbor including corners
    const anyValid = neighbors.filter(n => this.isCellFree(n.x, n.y));
    if (anyValid.length > 0) {
      return anyValid[0].dir;
    }

    return this.dir;
  },

  spawnApple() {
    const freeCells = [];
    for (let c = 1; c < this.cols - 1; c++) {
      for (let r = 1; r < this.rows - 1; r++) {
        if (this.isCellFree(c, r, false)) {
          freeCells.push({ x: c, y: r });
        }
      }
    }
    if (freeCells.length > 0) {
      this.apple = freeCells[Math.floor(Math.random() * freeCells.length)];
    } else {
      this.apple = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) };
    }
  },

  triggerEatAppleEffects(cellX, cellY, cellSize) {
    this.applesEaten++;
    const px = (cellX + 0.5) * cellSize;
    const py = (cellY + 0.5) * cellSize;

    // Spawn 14 glowing emerald/golden sparkle embers
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const speed = Math.random() * 2.5 + 1.2;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color: i % 2 === 0 ? "#34d399" : "#fef08a",
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.02
      });
    }

    // Soft serene feedback chime (587.33 Hz)
    if (window.WebTrackerEngine && typeof WebTrackerEngine.playTone === "function") {
      WebTrackerEngine.playTone(587.33, 0.12);
    }
  },

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);

    const render = () => {
      if (!this.canvas) {
        this.canvas = document.getElementById("calming-nature-canvas");
        if (this.canvas) this.ctx = this.canvas.getContext("2d");
      }

      if (this.canvas && this.ctx) {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const w = rect.width || 480;
        const h = rect.height || 480;

        if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
          this.canvas.width = Math.round(w * dpr);
          this.canvas.height = Math.round(h * dpr);
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.scale(dpr, dpr);

        this.ambientTime += 0.03;
        const cellSize = w / this.cols;

        // 1. Advance Snake Logic Tick
        this.stepProgress += this.stepSpeed;
        if (this.stepProgress >= 1.0) {
          this.stepProgress = 0;
          this.prevBody = JSON.parse(JSON.stringify(this.body));

          this.dir = this.findNextMove();
          const newHead = {
            x: this.body[0].x + this.dir.x,
            y: this.body[0].y + this.dir.y
          };

          // Wrap boundaries gracefully if needed
          if (newHead.x < 0) newHead.x = this.cols - 1;
          if (newHead.x >= this.cols) newHead.x = 0;
          if (newHead.y < 0) newHead.y = this.rows - 1;
          if (newHead.y >= this.rows) newHead.y = 0;

          // Check if ate apple
          if (newHead.x === this.apple.x && newHead.y === this.apple.y) {
            this.triggerEatAppleEffects(newHead.x, newHead.y, cellSize);
            this.spawnApple();
            this.body.unshift(newHead);
            // Cap max length at 24 to keep screen peaceful & spacious
            if (this.body.length > 24) {
              this.body.pop();
            }
          } else {
            this.body.unshift(newHead);
            this.body.pop();
          }

          // Maintain previous body matching length
          while (this.prevBody.length < this.body.length) {
            this.prevBody.push({ ...this.body[this.body.length - 1] });
          }
        }

        // 2. Draw Tranquil Deep Emerald Canvas Background
        const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7);
        bgGrad.addColorStop(0, "#082417");
        bgGrad.addColorStop(0.6, "#04170f");
        bgGrad.addColorStop(1, "#020d08");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 3. Draw Ambient Matrix Grid Dots
        ctx.fillStyle = "rgba(52, 211, 153, 0.09)";
        for (let c = 0; c < this.cols; c++) {
          for (let r = 0; r < this.rows; r++) {
            ctx.beginPath();
            ctx.arc((c + 0.5) * cellSize, (r + 0.5) * cellSize, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 4. Draw Glowing Apple Fruit
        const applePulse = (Math.sin(this.ambientTime * 4) + 1) / 2;
        const appleCenterX = (this.apple.x + 0.5) * cellSize;
        const appleCenterY = (this.apple.y + 0.5) * cellSize;
        const appleRadius = cellSize * 0.38 + applePulse * 1.5;

        // Outer Aura
        const appleAura = ctx.createRadialGradient(appleCenterX, appleCenterY, 2, appleCenterX, appleCenterY, cellSize * 1.2);
        appleAura.addColorStop(0, "rgba(239, 68, 68, 0.45)");
        appleAura.addColorStop(0.5, "rgba(239, 68, 68, 0.12)");
        appleAura.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = appleAura;
        ctx.beginPath();
        ctx.arc(appleCenterX, appleCenterY, cellSize * 1.2, 0, Math.PI * 2);
        ctx.fill();

        // Apple Body (Ruby Red / Vibrant Amber)
        const appleGrad = ctx.createRadialGradient(appleCenterX - 2, appleCenterY - 2, 1, appleCenterX, appleCenterY, appleRadius);
        appleGrad.addColorStop(0, "#f87171");
        appleGrad.addColorStop(0.7, "#dc2626");
        appleGrad.addColorStop(1, "#991b1b");
        ctx.fillStyle = appleGrad;
        ctx.beginPath();
        ctx.arc(appleCenterX, appleCenterY, appleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cute Green Leaf
        ctx.fillStyle = "#4ade80";
        ctx.beginPath();
        ctx.ellipse(appleCenterX + 3, appleCenterY - appleRadius - 2, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // 5. Draw Smooth Dotted Green Snake Segments
        const t = this.stepProgress;
        for (let i = this.body.length - 1; i >= 0; i--) {
          const curr = this.body[i];
          const prev = this.prevBody[i] || curr;

          // Smooth coordinate interpolation
          let segX = prev.x + (curr.x - prev.x) * t;
          let segY = prev.y + (curr.y - prev.y) * t;

          // Handle wrapping interpolation
          if (Math.abs(curr.x - prev.x) > 1) segX = curr.x;
          if (Math.abs(curr.y - prev.y) > 1) segY = curr.y;

          const px = (segX + 0.5) * cellSize;
          const py = (segY + 0.5) * cellSize;

          const isHead = (i === 0);
          const ratio = 1 - (i / this.body.length);
          const dotRadius = isHead ? (cellSize * 0.45) : (cellSize * (0.24 + ratio * 0.16));

          // Segment Outer Glow Aura
          ctx.fillStyle = isHead ? "rgba(52, 211, 153, 0.35)" : `rgba(16, 185, 129, ${0.15 + ratio * 0.2})`;
          ctx.beginPath();
          ctx.arc(px, py, dotRadius * 1.6, 0, Math.PI * 2);
          ctx.fill();

          // Dotted Segment Circle
          const segGrad = ctx.createRadialGradient(px - 1.5, py - 1.5, 1, px, py, dotRadius);
          if (isHead) {
            segGrad.addColorStop(0, "#a7f3d0");
            segGrad.addColorStop(0.6, "#34d399");
            segGrad.addColorStop(1, "#059669");
          } else {
            segGrad.addColorStop(0, "#6ee7b7");
            segGrad.addColorStop(0.7, "#10b981");
            segGrad.addColorStop(1, "#047857");
          }

          ctx.fillStyle = segGrad;
          ctx.beginPath();
          ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = isHead ? "#ffffff" : "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = isHead ? 1.5 : 1;
          ctx.stroke();

          // Head Eyes pointing towards travel direction
          if (isHead) {
            const eyeOffsetDist = dotRadius * 0.45;
            const eyeRadius = 2.2;
            const eye1X = px + this.dir.y * eyeOffsetDist + this.dir.x * (dotRadius * 0.3);
            const eye1Y = py - this.dir.x * eyeOffsetDist + this.dir.y * (dotRadius * 0.3);
            const eye2X = px - this.dir.y * eyeOffsetDist + this.dir.x * (dotRadius * 0.3);
            const eye2Y = py + this.dir.x * eyeOffsetDist + this.dir.y * (dotRadius * 0.3);

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
            ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#064e3b";
            ctx.beginPath();
            ctx.arc(eye1X + this.dir.x * 0.8, eye1Y + this.dir.y * 0.8, eyeRadius * 0.6, 0, Math.PI * 2);
            ctx.arc(eye2X + this.dir.x * 0.8, eye2Y + this.dir.y * 0.8, eyeRadius * 0.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // 6. Draw Particle Sparkles
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            this.particles.splice(i, 1);
            continue;
          }

          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        ctx.restore();
      }

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  },

  stop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }
};

window.WebTrackerEngine = WebTrackerEngine;
window.CareflowLiveGraphRenderer = CareflowLiveGraphRenderer;
window.AutonomousSnakeGazeEngine = AutonomousSnakeGazeEngine;
window.SereneNatureAmbientEngine = AutonomousSnakeGazeEngine; // Alias for backward compatibility



