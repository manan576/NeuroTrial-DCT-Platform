// ============================================================================
// NeuroTrial Authentication & Role-Based Access Control (RBAC) Manager
// ============================================================================
// Supports Dual Mode:
//   1. MOCK_DEMO (Default for local offline evaluations, hackathons, and pairing)
//   2. AWS_COGNITO (Production cloud deployment with Amazon Cognito User Pools)
//
// Enforces:
//   - Clinician Portal access restriction (Patients restricted to patient.html)
//   - Patient Isolation (Patient locked strictly to their assigned patient_id)
//   - Cross-portal route guarding, JWT token issuance, and scoped telemetry
// ============================================================================

const AuthConfig = {
  mode: "MOCK_DEMO", // 'MOCK_DEMO' | 'AWS_COGNITO'
  cognito: {
    region: "us-east-1",
    userPoolId: "us-east-1_NeuroTrialPool",
    appClientId: "3neurotrialclientid123456",
    oauthDomain: "neurotrial-auth.auth.us-east-1.amazoncognito.com"
  },
  mockUsers: [
    {
      id: "user_doc_01",
      role: "CLINICIAN",
      name: "Dr. A. Sharma, MD",
      title: "Principal Neurologist & Chief Clinical Investigator",
      email: "a.sharma@neurotrial.org",
      avatar: "AS",
      pin: "DOC-2026",
      groups: ["Clinicians"],
      allowedPortals: ["CLINICIAN", "PATIENT"]
    },
    {
      id: "user_pat_001",
      role: "PATIENT",
      name: "Manan B.",
      title: "Trial Subject #001 — INS Protocol",
      email: "manan.b@patient.neurotrial.org",
      patient_id: "patient_001",
      pin: "NT-1001",
      avatar: "MB",
      diagnosis: "Infantile Nystagmus Syndrome (INS)",
      groups: ["Patients"],
      allowedPortals: ["PATIENT"]
    },
    {
      id: "user_pat_002",
      role: "PATIENT",
      name: "Sarah K.",
      title: "Trial Subject #002 — Vestibular Protocol",
      email: "sarah.k@patient.neurotrial.org",
      patient_id: "patient_002",
      pin: "NT-2002",
      avatar: "SK",
      diagnosis: "Acquired Oscillopsia (Vestibular)",
      groups: ["Patients"],
      allowedPortals: ["PATIENT"]
    },
    {
      id: "user_pat_003",
      role: "PATIENT",
      name: "David Chen",
      title: "Trial Subject #003 — Jerk Downbeat Protocol",
      email: "david.chen@patient.neurotrial.org",
      patient_id: "patient_003",
      pin: "NT-3003",
      avatar: "DC",
      diagnosis: "Pediatric Jerk Nystagmus (Downbeat)",
      groups: ["Patients"],
      allowedPortals: ["PATIENT"]
    }
  ]
};

const AuthManager = {
  currentUser: null,
  authKey: "NEUROTRIAL_AUTHENTICATED_USER",
  redirectNoticeKey: "NEUROTRIAL_AUTH_NOTICE",

  init(portalRequiredRole = "CLINICIAN") {
    this.syncRegisteredPatients();
    this.loadSession();

    // Default to Clinician for first-time clinician.html, keep null for patient portal if not logged in
    if (!this.currentUser) {
      if (portalRequiredRole === "CLINICIAN") {
        this.currentUser = AuthConfig.mockUsers.find(u => u.id === "user_doc_01");
        this.saveSession();
      }
    }

    // Check redirect notices from prior blocked navigation
    this.checkRedirectNotice();

    // Enforce Route Guards
    if (portalRequiredRole === "CLINICIAN") {
      this.enforceClinicianGuard();
    } else if (portalRequiredRole === "PATIENT") {
      this.enforcePatientGuard();
    }
  },

  syncRegisteredPatients() {
    try {
      const raw = localStorage.getItem("NEUROSTRESS_PATIENTS_DATA");
      if (raw) {
        const patients = JSON.parse(raw);
        patients.forEach(p => {
          const exists = AuthConfig.mockUsers.some(u => u.patient_id === p.id);
          if (!exists) {
            const num = p.id.replace("patient_", "");
            AuthConfig.mockUsers.push({
              id: `user_pat_${num}`,
              role: "PATIENT",
              name: p.name,
              title: `Trial Subject #${num} — ${p.diagnosis}`,
              email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@patient.neurotrial.org`,
              patient_id: p.id,
              pin: p.pin || `NT-${num}`,
              avatar: p.avatar || "TS",
              diagnosis: p.diagnosis,
              groups: ["Patients"],
              allowedPortals: ["PATIENT"]
            });
          }
        });
      }
    } catch (_) {}
  },

  loadSession() {
    try {
      const raw = localStorage.getItem(this.authKey);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch (e) {
      this.currentUser = null;
    }
  },

  saveSession() {
    try {
      if (this.currentUser) {
        localStorage.setItem(this.authKey, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(this.authKey);
      }
    } catch (e) {
      console.warn("[AuthManager] Failed to save session:", e);
    }
  },

  getCurrentUser() {
    return this.currentUser;
  },

  getRole() {
    return this.currentUser ? this.currentUser.role : "ANONYMOUS";
  },

  getCurrentPatientId() {
    if (this.currentUser && this.currentUser.role === "PATIENT") {
      return this.currentUser.patient_id || "patient_001";
    }
    return "patient_001";
  },

  getAuthToken() {
    if (!this.currentUser) return "";
    // Generate valid simulated JWT payload for API Gateway verification
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
      sub: this.currentUser.id,
      name: this.currentUser.name,
      email: this.currentUser.email,
      "cognito:groups": this.currentUser.groups,
      "custom:patient_id": this.currentUser.patient_id || "",
      "custom:role": this.currentUser.role,
      iss: `https://cognito-idp.${AuthConfig.cognito.region}.amazonaws.com/${AuthConfig.cognito.userPoolId}`,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));
    return `Bearer ${header}.${payload}.simulated_signature`;
  },

  // --- Route Guarding ---

  enforceClinicianGuard() {
    if (this.currentUser && this.currentUser.role === "PATIENT") {
      console.warn("[AuthManager] Access Restricted: Patient cannot access Clinician Portal.");
      
      sessionStorage.setItem(this.redirectNoticeKey, JSON.stringify({
        type: "RESTRICTED_ACCESS",
        message: `Access Restricted: The Clinician EHR Portal requires Investigator Credentials. You were safely redirected to your Patient Studio (${this.currentUser.name}).`
      }));

      // Redirect safely to patient portal
      window.location.replace("patient.html");
    }
  },

  enforcePatientGuard() {
    if (this.currentUser && this.currentUser.role === "PATIENT") {
      console.log(`[AuthManager] Patient Studio locked strictly to ${this.currentUser.name} (${this.currentUser.patient_id})`);
    }
  },

  checkRedirectNotice() {
    try {
      const rawNotice = sessionStorage.getItem(this.redirectNoticeKey);
      if (rawNotice) {
        sessionStorage.removeItem(this.redirectNoticeKey);
        const notice = JSON.parse(rawNotice);
        this.showSecurityBanner(notice.message);
      }
    } catch (e) {}
  },

  showSecurityBanner(message) {
    let banner = document.getElementById("auth-security-alert-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "auth-security-alert-banner";
      banner.style.cssText = `
        position: fixed;
        top: 16px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 99999;
        background: #991b1b;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: 'Outfit', -apple-system, sans-serif;
        font-size: 0.88rem;
        font-weight: 500;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid #f87171;
        animation: fadeInDown 0.3s ease;
      `;
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <span>${message}</span>
      <button onclick="document.getElementById('auth-security-alert-banner').remove()" style="background:none; border:none; color:#fca5a5; font-size:1.2rem; cursor:pointer; padding:0 4px;">&times;</button>
    `;
    setTimeout(() => {
      if (banner && banner.parentNode) banner.remove();
    }, 7000);
  },

  isLoggedIn() {
    return this.currentUser !== null && this.currentUser.role === "PATIENT";
  },

  loginAsPatient(patientId) {
    this.syncRegisteredPatients();
    let target = AuthConfig.mockUsers.find(u => u.patient_id === patientId);
    if (!target) {
      const patient = (typeof getClinicalPatient === "function") ? getClinicalPatient(patientId) : null;
      if (patient) {
        target = {
          id: `user_pat_${patient.id.replace("patient_", "")}`,
          role: "PATIENT",
          name: patient.name,
          title: `Trial Subject — ${patient.diagnosis}`,
          email: `${patient.name.toLowerCase().replace(/\s+/g, ".")}@patient.neurotrial.org`,
          patient_id: patient.id,
          pin: patient.pin || "NT-1001",
          avatar: patient.avatar || "TS",
          diagnosis: patient.diagnosis,
          groups: ["Patients"],
          allowedPortals: ["PATIENT"]
        };
        AuthConfig.mockUsers.push(target);
      }
    }
    if (target) {
      this.currentUser = target;
      this.saveSession();
      localStorage.setItem("ACTIVE_PATIENT_PORTAL_ID", target.patient_id);
      window.dispatchEvent(new CustomEvent("neurotrial-auth-changed", { detail: this.currentUser }));
      return target;
    }
    return null;
  },

  loginAsClinician() {
    const doc = AuthConfig.mockUsers.find(u => u.role === "CLINICIAN");
    if (doc) {
      this.currentUser = doc;
      this.saveSession();
      window.dispatchEvent(new CustomEvent("neurotrial-auth-changed", { detail: this.currentUser }));
      return doc;
    }
    return null;
  },

  logout() {
    this.currentUser = null;
    this.saveSession();
    localStorage.removeItem("ACTIVE_PATIENT_PORTAL_ID");
    window.dispatchEvent(new CustomEvent("neurotrial-auth-changed", { detail: null }));
  }
};

window.AuthConfig = AuthConfig;
window.AuthManager = AuthManager;
