# DriveSkills — AI-Based Driving License Examination System

An AI-powered web platform that supports practical driving license examinations in Jordan by combining computer vision-based video analysis with human examiner input. Built as a graduation project for the Data Science & Artificial Intelligence program at Yarmouk University.

<!-- Add a homepage screenshot here -->
<!-- ![DriveSkills Homepage](./screenshots/homepage.png) -->

---

## 📖 Overview

Traditional practical driving exams rely entirely on a human examiner's real-time observation, which can be affected by subjectivity, fatigue, and limited observation time. **DriveSkills** addresses this by using three specialized AI models to analyze driving-test videos and generate structured, evidence-based scores — while keeping the examiner in control of the final decision.

The system evaluates the practical exam out of **100 marks**:

| Evaluation Source | Purpose | Marks |
|---|---|---|
| Road Analysis API | Road driving behavior across 16 criteria | 56 |
| Parking Evaluation API | Parking alignment and stability | 5 |
| Driver Monitoring API | Driver behavior and seatbelt usage | 4 |
| Manual Examiner Entry | Human judgment criteria (mirrors, gear usage, etc.) | 35 |
| **Total** | | **100** |

**AI contributes 65% of the final score; the examiner contributes the remaining 35%.**

---

## ✨ Features

- 🔐 Secure authentication and role-based dashboard (Supabase Auth)
- 🎥 Video upload for three exam stages: road driving, parking, and driver monitoring
- 🤖 Three independent AI APIs for automated video analysis
- 📊 Transparent score breakdown (AI score + manual score → final score)
- 🎮 Educational Driving Game for interactive learning
- 💬 Chatbot Assistant for platform guidance
- 👩‍🏫 Theory Driving Instructors section for exam preparation support

<!-- Add feature screenshots here -->
<!-- ![Dashboard](./screenshots/dashboard.png) -->
<!-- ![Practical Test Page](./screenshots/practical-test.png) -->

---

## 🧠 AI Architecture

DriveSkills uses a **multi-model architecture** instead of one large model, since road driving, parking, and in-cabin driver behavior are visually very different problems.

| API | Models Used | Classes / Task |
|---|---|---|
| **Road Analysis API** | YOLOv8n (traffic objects) + Custom YOLOv8n (road signs) + YOLOv8n-seg (lane segmentation) | car, person, traffic_light, stop_sign, crosswalk, speed_bump, no_entry_sign, lane |
| **Parking Evaluation API** | Car detection + Custom YOLOv8n (cone detection) | Vehicle alignment & stability relative to cones |
| **Driver Monitoring API** | YOLOv8 (driver behavior) + EfficientNetB3 (seatbelt classification) | 13 behavior classes (texting, drowsiness, etc.) + seatbelt/no-seatbelt |

All models are hosted as **Hugging Face Spaces** and called from the Next.js frontend via the **Gradio Client**.

### Model Performance

| Model | Precision | Recall | mAP@50 | mAP@50-95 |
|---|---|---|---|---|
| Road Signs Detection | 0.952 | 0.931 | 0.974 | 0.772 |
| Lane Segmentation (mask) | 0.980 | 0.973 | 0.986 | 0.901 |
| Cone Detection | 0.862 | 0.797 | 0.857 | 0.507 |
| Driver Behavior Detection | 0.959 | 0.964 | 0.976 | 0.777 |

| Model | Accuracy | Precision | Recall | AUC |
|---|---|---|---|---|
| Seatbelt Classification (EfficientNetB3) | 0.74 | 0.82 | 0.76 | 0.81 |

Models were adapted to the Jordanian driving context using a hybrid strategy: public datasets from **Roboflow Universe** combined with locally collected Jordanian street footage.

<!-- Add a model results / confusion matrix screenshot here -->
<!-- ![Model Results](./screenshots/model-results.png) -->

---

## 🛠️ Tech Stack

**Frontend:** Next.js, React, TypeScript, Tailwind CSS
**Backend / Database:** Supabase (Authentication + PostgreSQL)
**AI Serving:** Hugging Face Spaces, Gradio Client
**AI Models:** YOLOv8 / Ultralytics, TensorFlow / Keras (EfficientNetB3)
**Deployment:** Vercel (frontend), Hugging Face Spaces (AI APIs)

---

## 🏗️ System Architecture

```
User → Next.js Web App → Supabase (Auth + DB)
                       ↓
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Road Analysis   Parking API   Driver Monitoring
   API (HF Space)  (HF Space)    API (HF Space)
        ↓              ↓              ↓
        └──────────────┼──────────────┘
                        ↓
              Score Calculation
                        ↓
              Supabase (Results) → Dashboard
```

<!-- Add the real architecture diagram screenshot here -->
<!-- ![Architecture](./screenshots/architecture.png) -->

---

## 📁 Project Structure

```
app/
  dashboard/          → Candidate dashboard
  practical-test/     → Video upload & AI evaluation page
  game/                → Educational driving game
  chatbot/             → Chatbot assistant
  instructors/         → Theory instructors section
components/           → Reusable React components
lib/
  supabase/            → Supabase client configuration
  api/                 → AI API integration helpers
scripts/               → SQL database scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js
- A Supabase project (URL + anon key)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
npm run build
npm start
```

---





## ⚠️ Limitations

- Analyzes uploaded videos rather than real-time live streams
- AI performance depends on video quality and lighting conditions
- Not currently integrated with official government examination systems
- Requires stable internet access (depends on Supabase and Hugging Face Spaces availability)

## 🔮 Future Work

- Real-time multi-camera analysis
- Mobile application for examiners
- Larger Jordanian-specific dataset for improved model accuracy
- Official integration with traffic department systems

---

## 📄 License

<!-- Add your license here, e.g. MIT -->




## 🚀 Hugging Face Spaces: 


https://huggingface.co/spaces/shahednazzal/road_model
https://huggingface.co/spaces/shahednazzal/parking
https://huggingface.co/spaces/taimaa47/behavior-seatbelt
