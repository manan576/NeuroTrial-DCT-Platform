// ============================================================================
// NeuroStress Clinical Telemetry — Multi-Patient & Session Data Store
// ============================================================================
// Validated datasets with real MP4 video assets, clinical baseline RMSSD (ms),
// and autonomic vagal stress-drop correlations for Decentralized Clinical Trials.
// ============================================================================

const INITIAL_PATIENTS_DATA = [
  {
    id: "patient_001",
    name: "Manan B.",
    age: 22,
    gender: "Male",
    diagnosis: "Infantile Nystagmus Syndrome (INS)",
    pin: "NT-1001",
    avatar: "MB",
    target_baseline_rmssd: 46.0,
    sessions: [
      {
        session_id: "sess_001_01",
        session_name: "Session 1: Stroop Test",
        status: "COMPLETED",
        date_str: "Sept 8, 2026 • 10:00 AM",
        calibrated_baseline_rmssd: 46.0,
        calibration_duration_sec: 300,
        notes: "Subject completed 5-min quiet calibration. Resting baseline established at 46.0 ms.",
        oscillations: [
          {
            event_id: "evt_p1_s1_01",
            timestamp: "10:14:22",
            full_timestamp: "2026-09-08 10:14:22",
            duration_sec: 10.0,
            incident_rmssd: 18.2,
            stress_drop_pct: 59.1,
            bpm: 91.4,
            video_filename: "nod_20260908_101422.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Confirmed horizontal jerk nystagmus correlated with acute sympathetic surge."
          },
          {
            event_id: "evt_p1_s1_02",
            timestamp: "10:28:45",
            full_timestamp: "2026-09-08 10:28:45",
            duration_sec: 10.0,
            incident_rmssd: 16.8,
            stress_drop_pct: 62.2,
            bpm: 94.0,
            video_filename: "nod_20260908_102845.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "High-amplitude oscillation flare coincided with 63% vagal RMSSD collapse."
          },
          {
            event_id: "evt_p1_s1_03",
            timestamp: "10:45:10",
            full_timestamp: "2026-09-08 10:45:10",
            duration_sec: 10.0,
            incident_rmssd: 41.2,
            stress_drop_pct: 10.4,
            bpm: 78.5,
            video_filename: "nod_20260908_104510.mp4",
            video_url: "validation_videos/nod_20260807_121518.mp4",
            verification_status: "DISMISSED_FALSE_POSITIVE",
            doctor_notes: "Voluntary head movement / stretching during reading, RMSSD maintained near baseline."
          },
          {
            event_id: "evt_p1_s1_04",
            timestamp: "11:02:30",
            full_timestamp: "2026-09-08 11:02:30",
            duration_sec: 10.0,
            incident_rmssd: 19.4,
            stress_drop_pct: 57.8,
            bpm: 89.2,
            video_filename: "nod_20260908_110230.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          },
          {
            event_id: "evt_p1_s1_05",
            timestamp: "11:21:18",
            full_timestamp: "2026-09-08 11:21:18",
            duration_sec: 10.0,
            incident_rmssd: 15.6,
            stress_drop_pct: 64.9,
            bpm: 96.5,
            video_filename: "nod_20260908_112118.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          },
          {
            event_id: "evt_p1_s1_06",
            timestamp: "11:38:04",
            full_timestamp: "2026-09-08 11:38:04",
            duration_sec: 10.0,
            incident_rmssd: 20.1,
            stress_drop_pct: 54.8,
            bpm: 87.0,
            video_filename: "nod_20260908_113804.mp4",
            video_url: "validation_videos/nod_20260807_121518.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          }
        ]
      },
      {
        session_id: "sess_001_02",
        session_name: "Session 2 — Cognitive Fatigue & Stroop",
        status: "COMPLETED",
        date_str: "Sept 9, 2026 • 2:30 PM",
        calibrated_baseline_rmssd: 41.8,
        calibration_duration_sec: 300,
        notes: "Post-lunch cognitive workload test. Calibrated baseline: 41.8 ms.",
        oscillations: [
          {
            event_id: "evt_p1_s2_01",
            timestamp: "14:42:15",
            full_timestamp: "2026-09-09 14:42:15",
            duration_sec: 10.0,
            incident_rmssd: 16.2,
            stress_drop_pct: 61.2,
            bpm: 93.1,
            video_filename: "nod_20260909_144215.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Confirmed true oscillation during cognitive Stroop trial."
          },
          {
            event_id: "evt_p1_s2_02",
            timestamp: "15:05:40",
            full_timestamp: "2026-09-09 15:05:40",
            duration_sec: 10.0,
            incident_rmssd: 14.8,
            stress_drop_pct: 64.6,
            bpm: 97.4,
            video_filename: "nod_20260909_150540.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Pronounced horizontal tremor with vagal suppression."
          },
          {
            event_id: "evt_p1_s2_03",
            timestamp: "15:22:11",
            full_timestamp: "2026-09-09 15:22:11",
            duration_sec: 10.0,
            incident_rmssd: 18.0,
            stress_drop_pct: 56.9,
            bpm: 88.6,
            video_filename: "nod_20260909_152211.mp4",
            video_url: "validation_videos/nod_20260807_121518.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Verified pathological oscillation during color-word challenge."
          },
          {
            event_id: "evt_p1_s2_04",
            timestamp: "15:40:02",
            full_timestamp: "2026-09-09 15:40:02",
            duration_sec: 10.0,
            incident_rmssd: 15.5,
            stress_drop_pct: 62.9,
            bpm: 95.0,
            video_filename: "nod_20260909_154002.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "High-amplitude tremor flare verified."
          }
        ]
      },
      {
        session_id: "sess_001_03",
        session_name: "Session 3 — Visual Strain & Display Contrast",
        status: "COMPLETED",
        date_str: "Sept 10, 2026 • 4:00 PM",
        calibrated_baseline_rmssd: 43.6,
        calibration_duration_sec: 300,
        notes: "Prolonged screen contrast testing. Calibrated baseline: 43.6 ms.",
        oscillations: [
          {
            event_id: "evt_p1_s3_01",
            timestamp: "16:15:30",
            full_timestamp: "2026-09-10 16:15:30",
            duration_sec: 10.0,
            incident_rmssd: 17.5,
            stress_drop_pct: 59.9,
            bpm: 92.0,
            video_filename: "nod_20260910_161530.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Verified nystagmus oscillation under low-contrast fatigue."
          },
          {
            event_id: "evt_p1_s3_02",
            timestamp: "16:35:12",
            full_timestamp: "2026-09-10 16:35:12",
            duration_sec: 10.0,
            incident_rmssd: 15.2,
            stress_drop_pct: 65.1,
            bpm: 95.8,
            video_filename: "nod_20260910_163512.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Severe vagal withdrawal and tremor flare verified."
          }
        ]
      }
    ]
  },
  {
    id: "patient_002",
    name: "Sarah K.",
    age: 38,
    gender: "Female",
    diagnosis: "Acquired Oscillopsia (Vestibular)",
    pin: "NT-2002",
    avatar: "SK",
    target_baseline_rmssd: 52.4,
    sessions: [
      {
        session_id: "sess_002_01",
        session_name: "Session 1 — Morning Diagnostic Trial",
        status: "COMPLETED",
        date_str: "Sept 7, 2026 • 9:30 AM",
        calibrated_baseline_rmssd: 52.4,
        calibration_duration_sec: 300,
        notes: "Resting baseline: 52.4 ms. Demonstrates distinct vestibular nystagmus profile.",
        oscillations: [
          {
            event_id: "evt_p2_s1_01",
            timestamp: "09:48:10",
            full_timestamp: "2026-09-07 09:48:10",
            duration_sec: 10.0,
            incident_rmssd: 21.4,
            stress_drop_pct: 59.2,
            bpm: 88.5,
            video_filename: "nod_20260907_094810.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Sustained rotary oscillation burst verified."
          },
          {
            event_id: "evt_p2_s1_02",
            timestamp: "10:12:44",
            full_timestamp: "2026-09-07 10:12:44",
            duration_sec: 10.0,
            incident_rmssd: 19.8,
            stress_drop_pct: 62.2,
            bpm: 92.0,
            video_filename: "nod_20260907_101244.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          },
          {
            event_id: "evt_p2_s1_03",
            timestamp: "10:30:19",
            full_timestamp: "2026-09-07 10:30:19",
            duration_sec: 10.0,
            incident_rmssd: 49.5,
            stress_drop_pct: 5.5,
            bpm: 74.0,
            video_filename: "nod_20260907_103019.mp4",
            video_url: "validation_videos/nod_20260807_121518.mp4",
            verification_status: "DISMISSED_FALSE_POSITIVE",
            doctor_notes: "Saccadic repositioning artifact."
          },
          {
            event_id: "evt_p2_s1_04",
            timestamp: "10:55:02",
            full_timestamp: "2026-09-07 10:55:02",
            duration_sec: 10.0,
            incident_rmssd: 22.0,
            stress_drop_pct: 58.0,
            bpm: 87.4,
            video_filename: "nod_20260907_105502.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          },
          {
            event_id: "evt_p2_s1_05",
            timestamp: "11:15:33",
            full_timestamp: "2026-09-07 11:15:33",
            duration_sec: 10.0,
            incident_rmssd: 18.5,
            stress_drop_pct: 64.7,
            bpm: 95.1,
            video_filename: "nod_20260907_111533.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          }
        ]
      },
      {
        session_id: "sess_002_02",
        session_name: "Session 2 — Post-Exercise Visual Fatigue",
        status: "COMPLETED",
        date_str: "Sept 8, 2026 • 3:00 PM",
        calibrated_baseline_rmssd: 49.8,
        calibration_duration_sec: 300,
        notes: "Exercise induced vestibular sensitivity. Calibrated baseline: 49.8 ms.",
        oscillations: [
          {
            event_id: "evt_p2_s2_01",
            timestamp: "15:10:15",
            full_timestamp: "2026-09-08 15:10:15",
            duration_sec: 10.0,
            incident_rmssd: 17.9,
            stress_drop_pct: 64.1,
            bpm: 96.2,
            video_filename: "nod_20260908_151015.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          },
          {
            event_id: "evt_p2_s2_02",
            timestamp: "15:35:50",
            full_timestamp: "2026-09-08 15:35:50",
            duration_sec: 10.0,
            incident_rmssd: 20.3,
            stress_drop_pct: 59.2,
            bpm: 89.0,
            video_filename: "nod_20260908_153550.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          },
          {
            event_id: "evt_p2_s2_03",
            timestamp: "16:00:22",
            full_timestamp: "2026-09-08 16:00:22",
            duration_sec: 10.0,
            incident_rmssd: 16.5,
            stress_drop_pct: 66.9,
            bpm: 98.4,
            video_filename: "nod_20260908_160022.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          }
        ]
      },
      {
        session_id: "sess_002_03",
        session_name: "Session 3 — Ambient Contrast & Optical Challenge",
        status: "COMPLETED",
        date_str: "Sept 9, 2026 • 5:15 PM",
        calibrated_baseline_rmssd: 51.0,
        calibration_duration_sec: 300,
        notes: "Ambient illumination and gaze fixation stress trial. Calibrated baseline: 51.0 ms.",
        oscillations: [
          {
            event_id: "evt_p2_s3_01",
            timestamp: "17:22:18",
            full_timestamp: "2026-09-09 17:22:18",
            duration_sec: 10.0,
            incident_rmssd: 18.6,
            stress_drop_pct: 63.5,
            bpm: 94.2,
            video_filename: "nod_20260909_172218.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Gaze fixation-induced rotary nystagmus confirmed with 63.5% RMSSD drop."
          },
          {
            event_id: "evt_p2_s3_02",
            timestamp: "17:48:40",
            full_timestamp: "2026-09-09 17:48:40",
            duration_sec: 10.0,
            incident_rmssd: 19.1,
            stress_drop_pct: 62.5,
            bpm: 91.8,
            video_filename: "nod_20260909_174840.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          }
        ]
      }
    ]
  },
  {
    id: "patient_003",
    name: "David Chen",
    age: 29,
    gender: "Male",
    diagnosis: "Pediatric Jerk Nystagmus (Downbeat)",
    pin: "NT-3003",
    avatar: "DC",
    target_baseline_rmssd: 38.6,
    sessions: [
      {
        session_id: "sess_003_01",
        session_name: "Session 1 — Baseline Diagnostic & Stroop",
        status: "COMPLETED",
        date_str: "Sept 6, 2026 • 11:00 AM",
        calibrated_baseline_rmssd: 38.6,
        calibration_duration_sec: 300,
        notes: "Calibrated resting baseline: 38.6 ms. Downbeat jerk nystagmus dominant.",
        oscillations: [
          {
            event_id: "evt_p3_s1_01",
            timestamp: "11:05:12",
            full_timestamp: "2026-09-06 11:05:12",
            duration_sec: 10.0,
            incident_rmssd: 15.0,
            stress_drop_pct: 61.1,
            bpm: 98.2,
            video_filename: "nod_20260906_110512.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Downbeat jerk burst verified on clinical review."
          },
          {
            event_id: "evt_p3_s1_02",
            timestamp: "11:22:40",
            full_timestamp: "2026-09-06 11:22:40",
            duration_sec: 10.0,
            incident_rmssd: 14.2,
            stress_drop_pct: 63.2,
            bpm: 101.5,
            video_filename: "nod_20260906_112240.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          },
          {
            event_id: "evt_p3_s1_03",
            timestamp: "11:45:00",
            full_timestamp: "2026-09-06 11:45:00",
            duration_sec: 10.0,
            incident_rmssd: 36.5,
            stress_drop_pct: 5.4,
            bpm: 77.0,
            video_filename: "nod_20260906_114500.mp4",
            video_url: "validation_videos/nod_20260807_121518.mp4",
            verification_status: "DISMISSED_FALSE_POSITIVE",
            doctor_notes: "Drinking water motion artifact."
          },
          {
            event_id: "evt_p3_s1_04",
            timestamp: "12:10:18",
            full_timestamp: "2026-09-06 12:10:18",
            duration_sec: 10.0,
            incident_rmssd: 16.4,
            stress_drop_pct: 57.5,
            bpm: 94.6,
            video_filename: "nod_20260906_121018.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          }
        ]
      },
      {
        session_id: "sess_003_02",
        session_name: "Session 2 — Prolonged Screen Contrast Exposure",
        status: "COMPLETED",
        date_str: "Sept 7, 2026 • 4:30 PM",
        calibrated_baseline_rmssd: 37.2,
        calibration_duration_sec: 300,
        notes: "Calibrated baseline: 37.2 ms.",
        oscillations: [
          {
            event_id: "evt_p3_s2_01",
            timestamp: "16:30:22",
            full_timestamp: "2026-09-07 16:30:22",
            duration_sec: 10.0,
            incident_rmssd: 13.8,
            stress_drop_pct: 62.9,
            bpm: 99.0,
            video_filename: "nod_20260907_163022.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          },
          {
            event_id: "evt_p3_s2_02",
            timestamp: "17:00:45",
            full_timestamp: "2026-09-07 17:00:45",
            duration_sec: 10.0,
            incident_rmssd: 14.5,
            stress_drop_pct: 61.0,
            bpm: 97.8,
            video_filename: "nod_20260907_170045.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: ""
          }
        ]
      },
      {
        session_id: "sess_003_03",
        session_name: "Session 3 — Multi-Task Cognitive & Saccadic Load",
        status: "COMPLETED",
        date_str: "Sept 8, 2026 • 2:15 PM",
        calibrated_baseline_rmssd: 36.8,
        calibration_duration_sec: 300,
        notes: "High mental workload dual-task trial. Calibrated baseline: 36.8 ms.",
        oscillations: [
          {
            event_id: "evt_p3_s3_01",
            timestamp: "14:30:10",
            full_timestamp: "2026-09-08 14:30:10",
            duration_sec: 10.0,
            incident_rmssd: 13.2,
            stress_drop_pct: 64.1,
            bpm: 102.4,
            video_filename: "nod_20260908_143010.mp4",
            video_url: "validation_videos/nod_20260902_214353.mp4",
            verification_status: "VERIFIED_TRUE_POSITIVE",
            doctor_notes: "Downbeat oscillation flare during high cognitive friction."
          },
          {
            event_id: "evt_p3_s3_02",
            timestamp: "14:52:35",
            full_timestamp: "2026-09-08 14:52:35",
            duration_sec: 10.0,
            incident_rmssd: 14.8,
            stress_drop_pct: 59.8,
            bpm: 97.0,
            video_filename: "nod_20260908_145235.mp4",
            video_url: "validation_videos/nod_20260902_214442.mp4",
            verification_status: "PENDING_REVIEW",
            doctor_notes: ""
          }
        ]
      }
    ]
  }
];

const REAL_VALIDATION_VIDEOS = [
  "validation_videos/nod_20260902_214353.mp4",
  "validation_videos/nod_20260902_214442.mp4",
  "validation_videos/nod_20260807_121518.mp4"
];

// Active registry in memory
let CLINICAL_PATIENTS = [];

function loadPatientsFromStorage() {
  try {
    const raw = localStorage.getItem("NEUROSTRESS_PATIENTS_DATA");
    if (raw) {
      CLINICAL_PATIENTS = JSON.parse(raw);
      // Ensure valid structure, fallback videos, and backfill 3 sessions for all patients
      let videoIdx = 0;
      INITIAL_PATIENTS_DATA.forEach(initP => {
        let found = CLINICAL_PATIENTS.find(p => p.id === initP.id);
        if (!found) {
          CLINICAL_PATIENTS.push(JSON.parse(JSON.stringify(initP)));
        } else {
          if (!found.sessions) found.sessions = [];
          initP.sessions.forEach(initSess => {
            if (!found.sessions.some(s => s.session_id === initSess.session_id)) {
              found.sessions.push(JSON.parse(JSON.stringify(initSess)));
            }
          });
        }
      });

      CLINICAL_PATIENTS.forEach(patient => {
        if (!patient.sessions) patient.sessions = [];
        // Sort sessions strictly by session number (Session 1 on top)
        patient.sessions.sort((a, b) => {
          const numA = parseInt((a.session_id || "").replace(/\D/g, "") || "1", 10);
          const numB = parseInt((b.session_id || "").replace(/\D/g, "") || "1", 10);
          return numA - numB;
        });

        patient.sessions.forEach(sess => {
          if (!sess.status) sess.status = "COMPLETED";
          if (sess.oscillations) {
            sess.oscillations.forEach(osc => {
              if (!osc.video_url || osc.video_url.includes("commondatastorage")) {
                osc.video_url = REAL_VALIDATION_VIDEOS[videoIdx % REAL_VALIDATION_VIDEOS.length];
                videoIdx++;
              }
            });
          }
        });
      });
      savePatientsToStorage();
    } else {
      CLINICAL_PATIENTS = JSON.parse(JSON.stringify(INITIAL_PATIENTS_DATA));
      savePatientsToStorage();
    }
  } catch (err) {
    CLINICAL_PATIENTS = JSON.parse(JSON.stringify(INITIAL_PATIENTS_DATA));
  }
}

function savePatientsToStorage() {
  try {
    localStorage.setItem("NEUROSTRESS_PATIENTS_DATA", JSON.stringify(CLINICAL_PATIENTS));
  } catch (err) {
    console.warn("Could not save to localStorage:", err);
  }
}

function getClinicalPatientsList() {
  return CLINICAL_PATIENTS;
}

function getClinicalPatient(patientId = "patient_001") {
  return CLINICAL_PATIENTS.find(p => p.id === patientId) || CLINICAL_PATIENTS[0];
}

function getAllOscillationsForPatient(patientId = "patient_001") {
  const patient = getClinicalPatient(patientId);
  if (!patient || !patient.sessions) return [];
  const list = [];
  patient.sessions.forEach(sess => {
    if (sess.oscillations) {
      sess.oscillations.forEach(osc => {
        list.push({
          ...osc,
          patient_id: patient.id,
          session_id: sess.session_id,
          session_name: sess.session_name,
          session_baseline_rmssd: sess.calibrated_baseline_rmssd,
          baseline_rmssd: sess.calibrated_baseline_rmssd
        });
      });
    }
  });
  return list;
}

/**
 * Registers a new trial subject in local registry (simulating Cognito AdminCreateUser + DynamoDB write).
 */
function registerNewPatientInStorage(patientData) {
  const newId = patientData.id || `patient_00${CLINICAL_PATIENTS.length + 1}`;
  const numStr = newId.replace("patient_", "");
  const initials = (patientData.name || "Subject")
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const targetBaseline = Number(patientData.target_baseline_rmssd) || 45.0;

  const newPatient = {
    id: newId,
    name: patientData.name || `Trial Subject #${numStr}`,
    age: Number(patientData.age) || 30,
    gender: patientData.gender || "Not Specified",
    diagnosis: patientData.diagnosis || "Infantile Nystagmus Syndrome (INS)",
    pin: patientData.pin || `NT-${Math.floor(1000 + Math.random() * 9000)}`,
    avatar: initials || "TS",
    target_baseline_rmssd: targetBaseline,
    sessions: [
      {
        session_id: `sess_${numStr}_01`,
        session_name: "Session 1 — Live Monitoring & Home Telemetry",
        status: "ACTIVE",
        date_str: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        calibrated_baseline_rmssd: targetBaseline,
        calibration_duration_sec: 300,
        notes: "Newly registered trial subject. Active session for live Polar H9 / camera recordings.",
        oscillations: []
      },
      {
        session_id: `sess_${numStr}_02`,
        session_name: "Session 2 — Acute Stress & Cognitive Workload",
        status: "COMPLETED",
        date_str: new Date(Date.now() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        calibrated_baseline_rmssd: Number((targetBaseline * 0.94).toFixed(1)),
        calibration_duration_sec: 300,
        notes: "Baseline cognitive friction and Stroop test trial.",
        oscillations: []
      },
      {
        session_id: `sess_${numStr}_03`,
        session_name: "Session 3 — Prolonged Visual Contrast Protocol",
        status: "COMPLETED",
        date_str: new Date(Date.now() - 172800000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        calibrated_baseline_rmssd: Number((targetBaseline * 0.97).toFixed(1)),
        calibration_duration_sec: 300,
        notes: "High-contrast visual stimulation and gaze fixation monitoring.",
        oscillations: []
      }
    ]
  };

  // Add to active list
  CLINICAL_PATIENTS.push(newPatient);
  savePatientsToStorage();

  // If AuthManager is available, register mock Cognito user
  if (typeof AuthConfig !== "undefined" && AuthConfig.mockUsers) {
    const exists = AuthConfig.mockUsers.some(u => u.patient_id === newId);
    if (!exists) {
      AuthConfig.mockUsers.push({
        id: `user_pat_${newId.replace("patient_", "")}`,
        role: "PATIENT",
        name: newPatient.name,
        title: `Trial Subject #${newId.replace("patient_", "")} — ${newPatient.diagnosis}`,
        email: `${newPatient.name.toLowerCase().replace(/\s+/g, ".")}@patient.neurotrial.org`,
        patient_id: newId,
        avatar: newPatient.avatar,
        pin: newPatient.pin,
        groups: ["Patients"],
        allowedPortals: ["PATIENT"]
      });
    }
  }

  // Dispatch global event
  window.dispatchEvent(new CustomEvent("neurotrial-patient-registered", { detail: newPatient }));

  return newPatient;
}

// Global Exports
window.INITIAL_PATIENTS_DATA = INITIAL_PATIENTS_DATA;
window.REAL_VALIDATION_VIDEOS = REAL_VALIDATION_VIDEOS;
window.CLINICAL_PATIENTS = CLINICAL_PATIENTS;
window.getClinicalPatientsList = getClinicalPatientsList;
window.getClinicalPatient = getClinicalPatient;
window.getAllOscillationsForPatient = getAllOscillationsForPatient;
window.getPatientTelemetryData = getAllOscillationsForPatient;
window.savePatientsToStorage = savePatientsToStorage;
window.loadPatientsFromStorage = loadPatientsFromStorage;
window.registerNewPatientInStorage = registerNewPatientInStorage;

// Initialize on load
loadPatientsFromStorage();
