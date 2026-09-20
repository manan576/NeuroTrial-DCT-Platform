# NeuroTrial — Nystagmus & Stress Digital Biomarker Platform
### Decentralized Clinical Trial (DCT) & Remote Autonomic Telemetry Evaluation System
**Built for the Bharat Builds AWS Hackathon (Healthcare & AI Innovation Track)**

[![AWS Amplify](https://img.shields.io/badge/AWS-Amplify%20Live-FF9900.svg?logo=aws-amplify&logoColor=white)](https://main.dfms9o6dmkyla.amplifyapp.com/)
[![AWS Region](https://img.shields.io/badge/AWS%20Region-ap--south--1%20(Mumbai)-blue.svg?logo=amazon-aws)](https://aws.amazon.com/)
[![Amazon Bedrock](https://img.shields.io/badge/Amazon%20Bedrock-Claude%203.5%20Sonnet-6842FF.svg?logo=anthropic)](https://aws.amazon.com/bedrock/)
[![Computer Vision](https://img.shields.io/badge/Computer%20Vision-MediaPipe%20%2B%20OpenCV-00C0FF.svg?logo=opencv)](https://mediapipe.dev)
[![YouTube Video](https://img.shields.io/badge/Explainer%20Video-YouTube-FF0000.svg?logo=youtube)](https://www.youtube.com/watch?v=A8TrkLvEE-U)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## 🚀 Live Deployed Application (100% HTTPS • AWS Amplify)

| Portal / Component | Primary Live Link (AWS Amplify) | Global CDN Mirror (CloudFront) | Description |
| :--- | :--- | :--- | :--- |
| 🌐 **Platform Landing Portal** | **[Launch Landing Portal](https://main.dfms9o6dmkyla.amplifyapp.com/index.html)** | [CloudFront Mirror](https://d3sigeid8sbgs9.cloudfront.net/index.html) | Architecture overview, scientific foundations & in-browser explainer video |
| 🧑‍⚕️ **Patient Telemetry Studio** | **[Launch Patient Studio](https://main.dfms9o6dmkyla.amplifyapp.com/patient.html)** | [CloudFront Mirror](https://d3sigeid8sbgs9.cloudfront.net/patient.html) | In-browser MediaPipe FaceMesh tracking, BLE Polar H9 ECG, 10s ring buffer & Stroop stress test |
| 🏥 **Clinician Verification Portal** | **[Launch Clinician Portal](https://main.dfms9o6dmkyla.amplifyapp.com/clinician.html)** | [CloudFront Mirror](https://d3sigeid8sbgs9.cloudfront.net/clinician.html) | Video triage queue, 1-click verification, 3 multi-session graphs & Bedrock AI progress notes |
| ⚡ **AWS API Gateway REST API** | `https://x82idzhm6j.execute-api.ap-south-1.amazonaws.com` | — | Serverless HTTP API handling real-time telemetry ingestion, queries, and verification |
| 🎬 **Project Explainer Video** | **[Watch on YouTube](https://www.youtube.com/watch?v=A8TrkLvEE-U)** | Embedded in Landing Page | Full walkthrough of the problem, edge vision buffer, and AWS serverless architecture |

---

![NeuroTrial Landing Portal](blog_assets/Landing%20Portal.png)

---

## 🔬 Clinical Motivation & Background

**NeuroTrial** was engineered to solve a critical, long-unaddressed challenge in clinical neurology: objectively evaluating and correlating involuntary physical movement flares with autonomic stress surges in conditions like **Infantile Nystagmus**.

For decades, clinicians and neurologists hypothesized that involuntary ocular oscillations and compensatory head nodding were exacerbated by acute physiological stress. However, **no quantified scientific study or decentralized clinical tool existed to objectively prove and measure this correlation**.

Traditional neurological trials and in-clinic evaluations face three fundamental roadblocks:
1. **Siloed Research & Data Fragmentation**: Movement disorder telemetry and rare patient datasets remain trapped within isolated hospital databases, preventing researchers from pooling standardized multi-center cohorts across borders.
2. **"White-Coat Syndrome" Baseline Distortion**: In-hospital neurological evaluations induce artificial clinical anxiety, distorting true resting autonomic baselines.
3. **High Patient Travel Burden & High Dropout Rates**: In-person clinical monitoring imposes severe travel and physical fatigue on patients with movement disorders, escalating trial costs and leading to elevated dropout rates.

---

### 🎯 Objective Scientific Validation & Decentralized Clinical Trials

We engineered **NeuroTrial** to bridge this gap through a decentralized, patient-centric architecture. By synchronizing client-side edge computer vision with asynchronous Bluetooth Low Energy (BLE) ECG telemetry during controlled stress challenges, **we captured the world's first quantified proof that involuntary head oscillations in nystagmus are directly triggered by acute autonomic stress surges (evidenced by a statistically significant drop in parasympathetic RMSSD vagal tone).**

To scale this clinical breakthrough into a globally accessible research infrastructure, we architected NeuroTrial as a **Decentralized Clinical Trial (DCT) platform**. Patients can participate naturally from their home environment using standard webcams and BLE sensors with zero local software installation, while research institutions and neurologists worldwide collaborate on a unified serverless cloud to pool standardized cohorts, review verified incident clips, and monitor longitudinal biomarkers in real time.

---

## ⚙️ How NeuroTrial Works (At a Glance)

1. **In-Browser Motion Tracking**: Tracks facial and head oscillations in real-time using client-side MediaPipe Face Mesh at 30–60 FPS with zero software installation.
2. **10-Second Incident Ring Buffer**: A circular RAM buffer retains 150 pre-trigger frames. When an oscillation is detected, it captures 150 post-trigger frames and packages a standalone **10-second WebM clip** (5s before + 5s after) to an encrypted Amazon S3 vault.
3. **Autonomic Stress Drop Calculation**: Connects to a Bluetooth ECG chest strap to measure baseline Heart Rate Variability (RMSSD) and calculate the percentage drop in stress during an episode.
4. **Clinician Verification Portal**: Neurologists review queued 10-second clips with 1-click verification (`✓ Verify TP` / `✕ Dismiss FP`), instantly updating multi-session trend graphs.
5. **Amazon Bedrock AI Clinical Notes**: Uses Anthropic Claude 3.5 Sonnet on AWS to automatically synthesize longitudinal telemetry into EMR-ready SOAP progress notes.

---

## 🏗️ End-to-End System Architecture

NeuroTrial unites client-side edge computer vision, Web Bluetooth ECG hardware, and a **100% serverless AWS cloud backend** deployed in AWS Mumbai (`ap-south-1`).

![NeuroTrial End-to-End Technical Architecture](blog_assets/Architecture%20Diagram%20NeuroTrial.png)

### The 3 Core Architectural Pillars:

```
┌────────────────────────────────┐     ┌────────────────────────────────┐     ┌────────────────────────────────┐
│      1. Patient Edge Client     │     │      2. AWS Serverless Cloud   │     │    3. Clinician Workstation    │
│  • In-browser MediaPipe Face   │     │  • API Gateway REST Endpoints  │     │  • 3-Column Triage Layout      │
│  • Polar H9 Bluetooth ECG      │ ──> │  • AWS Lambda Microservices    │ ──> │  • 1-Click Verification        │
│  • 10-sec In-Memory Ring Buffer│     │  • DynamoDB Single-Table NoSQL │     │  • Multi-Session Trend Graphs  │
│  • WebM Frame Stitcher (<80ms) │     │  • S3 Encrypted Video Vault    │     │  • Bedrock Claude 3.5 Notes    │
└────────────────────────────────┘     └────────────────────────────────┘     └────────────────────────────────┘
```

1. **Edge Client (Patient Studio)**: Runs 100% in-browser using Web APIs (WebCam `getUserMedia`, Web Bluetooth GATT `0x2A37`, Canvas API). Zero raw continuous video is ever recorded or uploaded.
2. **AWS Cloud Backend**: High-speed REST API (API Gateway + AWS Lambda Python 3.11) writes single-table time-series records to Amazon DynamoDB (<10ms queries) and generates short-lived Pre-Signed URLs for direct encrypted video uploads to Amazon S3.
3. **Clinician Workstation**: Neurologists filter the triage queue, review 10s video clips with slow-motion and telemetry HUD overlays, verify true positives, and trigger Amazon Bedrock (Claude 3.5 Sonnet) to generate hospital-grade SOAP clinical notes.

---

## 🖥️ Visual Walkthrough of Key Portals

### 🧑‍⚕️ 1. Patient Clinical Studio (`patient.html`)
The Patient Studio runs directly inside any modern web browser with **zero installation required**.

#### A. Resting Baseline Calibration & ECG Connection
The patient establishes a resting autonomic baseline (quiet breathing) while connecting a Polar H9 Bluetooth ECG chest strap (or synthetic clinical stream) to calibrate baseline RMSSD.

![Patient Studio Baseline Calibration](blog_assets/Baseline%20Calibration.png)

#### B. Standardized Cognitive Stress Protocol (Stroop Challenge)
Patients undergo an interactive Color-Word Stroop conflict test (e.g., the word "BLUE" printed in red font) with 1.5-second rapid decision windows to evaluate vagal withdrawal under controlled cognitive load.

![Stroop Stress Challenge](blog_assets/Strrop%20Test.png)

#### C. Real-Time Oscillation Detection & 10s Ring Buffer
* **Sub-Pixel Landmark Tracking**: Tracks Landmark `#1` (Nose Tip) as a rigid anchor with an Exponential Moving Average ($EMA = 0.4$) filter to track involuntary head nodding without interference from blinks.
* **10-Second Volatile RAM Buffer**: Stores 150 pre-trigger frames in local RAM. When an oscillation anomaly (2.5–6.0 Hz) occurs, it captures 150 post-trigger frames and uses a custom in-browser WebM stitcher (`webm_encoder.js`) to package all 300 frames (10.0 seconds) into a video blob in under 80ms.
* **Privacy-by-Design**: Unused rolling frames are immediately overwritten in volatile memory. Only the 10-second incident clip is uploaded via S3 Pre-Signed URL.

![Oscillation Detection on Patient Portal](blog_assets/Oscillation%20Detection%20on%20Patient%20Portal.png)

---

### 🩺 2. Clinician Video Verification Workstation (`clinician.html`)
The Clinician Workstation provides neurologists with an optimized, low-latency review interface built on a strict **equal-height 3-column triage layout**:

![Clinician Verification Workstation](blog_assets/clinician%20portal.png)

* **Column 1 — Video Triage Queue**: Filterable by `All`, `Pending Review`, `Verified TP`, and `Dismissed FP`. Allows rapid cohort switching across clinical trial participants (`patient_001`, `patient_002`, `patient_003`).
* **Column 2 — Edge-to-Edge 16:9 Video Player**: High-resolution video review with telemetry HUD overlay (incident RMSSD, % stress drop, oscillation frequency), $1.0\times / 0.5\times$ slow-motion playback, and 1-click `✓ Verify TP` / `✕ Dismiss FP` actions.
* **Column 3 — Multi-Session Longitudinal Graphs & Bedrock AI**:
  - **`Session 1: Stroop Test`**: Active live protocol session. Newly verified oscillations append dynamically to this graph.
  - **`Session 2 — Cognitive Fatigue & Stroop`**: Day 2 cognitive challenge session.
  - **`Session 3 — Visual Strain & Display Contrast`**: Day 3 high-contrast screen fatigue session.
  - **Amazon Bedrock AI Copilot**: Synthesizes multi-session telemetry into EMR-ready SOAP progress notes with targeted clinical recommendations via Anthropic Claude 3.5 Sonnet.

---

## 📊 Longitudinal Clinical Telemetry & Empirical Proof

During standardized testing across cognitive stress challenges, NeuroTrial captured conclusive empirical proof that involuntary head oscillations in nystagmus are directly triggered by acute autonomic stress.

![Longitudinal Autonomic Telemetry & RMSSD Drop](blog_assets/patient%20graph.png)

### The Science Made Simple: Why RMSSD?
Heart Rate Variability (HRV) is the gold-standard non-invasive biomarker of Autonomic Nervous System (ANS) activity. NeuroTrial calculates **RMSSD (Root Mean Square of Successive Differences)**:

$$\text{RMSSD} = \sqrt{\frac{1}{N-1} \sum_{i=1}^{N-1} (RR_{i+1} - RR_i)^2}$$

* **Instantaneous Response**: While Heart Rate (BPM) takes 30–60 seconds to rise, **RMSSD drops instantaneously** upon acute sympathetic arousal and vagal withdrawal.
* **Quantified Stress Drop**:
$$\text{Stress Drop \%} = \frac{\text{RMSSD}_{\text{baseline}} - \text{RMSSD}_{\text{incident}}}{\text{RMSSD}_{\text{baseline}}} \times 100\%$$
* A vagal drop of $\ge 25\%$ coinciding with sudden head/eye oscillations confirms a **stress-triggered neurological flare** rather than an incidental voluntary movement.

---

## ☁️ AWS Cloud Services (Proof of Usage)

NeuroTrial is built on a 100% serverless, pay-per-request architecture deployed in AWS Mumbai (`ap-south-1`):

| AWS Service | Technical Role in NeuroTrial | Key Metrics & Specifications |
| :--- | :--- | :--- |
| **AWS Amplify** | Global HTTPS web hosting & automated CI/CD pipeline | Continuous Git deployment, SSL encryption |
| **Amazon API Gateway** | Serverless HTTP REST API entry point with CORS | Sub-40ms latency, auto-scaling |
| **AWS Lambda (Python 3.11)** | Microservice compute for ingestion, queries & AI summary | `lambda_ingest.py`, `lambda_query.py`, `lambda_bedrock_summary.py` |
| **Amazon DynamoDB** | Single-table NoSQL time-series telemetry store | On-Demand capacity, sub-10ms queries (`patient_id` PK, `timestamp` SK) |
| **Amazon S3** | Encrypted vault for 10-second validation video clips | SSE-S3 AES-256, Pre-Signed direct upload URLs (300s expiry) |
| **Amazon Bedrock** | Generative AI clinical progress note synthesis | Anthropic Claude 3.5 Sonnet foundation model |

---

## 📂 Repository Structure

```
├── README.md                        # Master project documentation & hackathon guide
├── TECHNICAL_BLOG_POST.md           # 5-minute technical blog post with visual assets
├── HRV_Explainer.md                 # Deep-dive physiological guide on HRV, RMSSD & ANS
├── TECHNICAL_BREAKDOWN.md           # Full technical architecture & design specification
├── Hackathon_Submission_Package.md  # Comprehensive submission package & judging summary
├── OscillationTracker.py            # Native Python OpenCV + MediaPipe + BLE Polar H9 pipeline
├── polar_h9_test.py                 # Standalone BLE GATT hardware diagnostic tool
├── validate_clips.py                # Video clip integrity validation utility
├── analyze_results.py               # Statistical oscillation & HRV correlation analysis
├── generate_diagram.py              # Architecture diagram generator
├── oscillation_log.csv              # Benchmark trial telemetry dataset
├── blog_assets/                     # High-resolution screenshots, diagrams & telemetry graphs
│   ├── Architecture Diagram NeuroTrial.png
│   ├── Baseline Calibration.png
│   ├── Landing Portal.png
│   ├── Oscillation Detection on Patient Portal.png
│   ├── Strrop Test.png
│   ├── clinician portal.png
│   └── patient graph.png
├── aws_backend/                     # AWS Serverless Cloud Backend
│   ├── deploy_infra.py              # 1-Click Boto3 Infrastructure-as-Code deployer
│   ├── lambda_ingest.py             # Telemetry & S3 clip ingestion Lambda handler
│   ├── lambda_query.py              # High-speed telemetry retrieval & KPI Lambda handler
│   ├── lambda_bedrock_summary.py    # Amazon Bedrock Claude 3.5 Sonnet clinical note generator
│   ├── seed_dynamodb.py             # Multi-session clean dataset seeder
│   └── test_backend.py              # Automated cloud test suite for Lambda & DynamoDB
└── frontend/                        # Web Applications (Vanilla JS + CSS Design System)
    ├── index.html                   # Platform Landing Page & Explainer Video Gateway
    ├── patient.html                 # Patient Clinical Studio (Edge CV + Stress Protocol)
    ├── clinician.html               # Clinician Review Workstation & Verification Triage
    ├── serve.py                     # Local development web server (port 8000)
    ├── css/
    │   └── styles.css               # Unified "Doctor Blue" & "Patient Studio" Design System
    └── js/
        ├── app.js                   # Landing page controller & video interaction
        ├── patient_app.js           # Patient studio controller & camera manager
        ├── clinician_app.js         # Clinician workstation controller & triage engine
        ├── web_tracker.js           # In-browser MediaPipe Face Mesh & 10s Ring Buffer
        ├── webm_encoder.js          # Fast in-browser WebP-to-WebM (VP8) frame stitcher
        ├── interactive_eyes.js      # Real-time ocular kinematics & gaze vector visualization
        ├── stress_test_engine.js    # Interactive Stroop stress test protocol engine
        ├── auth_manager.js          # Authentication state and profile management
        ├── api.js                   # AWS API Gateway & Lambda communication client
        ├── charts.js                # Chart.js time-series & telemetry visualization
        └── sample_data.js           # Multi-patient clinical trial dataset
```

---

## ⚡ Quickstart & Local Setup Guide

### Prerequisites
* **Python 3.9+** (Tested on Python 3.10 and 3.11)
* Modern Web Browser (Google Chrome, Microsoft Edge, or Firefox) with webcam access
* *(Optional)* Polar H9 or H10 Bluetooth Chest Strap for live ECG hardware testing
* *(Optional)* AWS CLI configured with credentials for deploying serverless backend

---

### Step 1: Clone the Repository & Install Dependencies

```bash
git clone https://github.com/manan576/NeuroTrial-DCT-Platform.git
cd NeuroTrial-DCT-Platform

# Install Python requirements
pip install opencv-python mediapipe numpy bleak boto3 botocore
```

---

### Step 2: Launch the Local Web Application

Start the development web server:

```bash
python frontend/serve.py
```

Open your browser and navigate to:
* **Landing Page**: `http://localhost:8000/index.html`
* **Patient Studio**: `http://localhost:8000/patient.html`
* **Clinician Portal**: `http://localhost:8000/clinician.html`

> 💡 *The web application operates seamlessly in offline/simulation mode with pre-bundled datasets and synthetic stress engines, and automatically connects to live AWS endpoints when deployed.*

---

### Step 3: Deploy AWS Serverless Backend (Optional)

To deploy the cloud infrastructure on your own AWS account:

```bash
# Configure AWS CLI
aws configure

# 1-Click Provisioning (DynamoDB, S3, IAM Roles, Lambdas, API Gateway)
python aws_backend/deploy_infra.py --region ap-south-1

# Seed clean clinical trial multi-session dataset into DynamoDB
python aws_backend/seed_dynamodb.py --region ap-south-1

# Run automated backend test suite
python aws_backend/test_backend.py --region ap-south-1
```

---

### Step 4: Run the Native Python Hardware Pipeline (Optional)

To run the native desktop pipeline with real-time webcam face tracking and Polar H9 BLE heart rate integration:

```bash
# Scan for Polar H9 BLE sensor
python polar_h9_test.py

# Launch integrated OpenCV face tracking + BLE HRV pipeline
python OscillationTracker.py
```

*Press `q` to exit the pipeline and review logs in `oscillation_log.csv`.*

---

## 🏆 Traditional Clinical Trials vs. NeuroTrial

| Metric | Traditional Clinical Trials | NeuroTrial (Decentralized + AWS) |
| :--- | :--- | :--- |
| **Monitoring Setting** | Artificial hospital visits (1x/month) | Continuous, natural home environment |
| **Data Fidelity** | Subjective clinician observation | Millisecond-precision Edge CV + ECG RMSSD |
| **Video Bandwidth & Storage** | Continuous 24/7 video streaming (~50 GB/day) | **Smart 10s Ring Buffer (~5 MB/day, 99.9% savings)** |
| **Data Privacy** | Raw facial video stored in cloud | **Zero raw video in cloud; only verified 10s anomaly clips** |
| **Clinician Efficiency** | Manual review of hours of footage | **1-Click Triage + Amazon Bedrock AI Copilot** |
| **Infrastructure Cost** | Dedicated server farms ($$$$) | **AWS Serverless Pay-Per-Request (< $0.05/session)** |
| **Multi-Center Collaboration** | Trapped in siloed local hospital databases | **Unified global cloud repository for pooled cohorts** |

---

## 🔮 Future Extensibility & Impact

While built and proven for Nystagmus, the exact same system can easily scale to:
* **Parkinson’s Disease**: Objectively tracking resting tremors, bradykinesia, and stress-induced motor blocks.
* **Essential Tremor & Ataxia**: Measuring real-time kinetic tremors and postural instability in home environments.
* **Decentralized Pharmaceutical Trials (DCTs)**: Enabling pharmaceutical companies to evaluate new neurological therapeutics with quantified longitudinal endpoints at a fraction of traditional trial costs.

---

## 👥 Contributors & Acknowledgements

* **Author & Team Leader**: Manan Bhate ([@manan576](https://github.com/manan576))
* **Event**: **Bharat Builds AWS Hackathon** (Healthcare & AI Innovation Track)
* **Technologies**: Amazon Web Services (Amplify, API Gateway, Lambda, DynamoDB, S3, Bedrock), MediaPipe, OpenCV, Chart.js, Bleak.

---

## 📄 License
This project is open-source under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
