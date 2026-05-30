# AI Surviellance - CCTV Ingestion & AI SOC Platform

**AI Surviellance** is a production-ready, dark glassmorphic Security Operations Center (SOC) dashboard. It enables security operators to ingest multiple CCTV streams, run automated FFmpeg keyframe extraction, and index people, clothing, locations, and timestamps using the Google Gemini Vision API. 

The platform supports robust local sandbox mock fallbacks when AWS S3, Google Maps, or Gemini API keys are omitted.

---

## 🏗️ Architecture Overview

The platform uses a modular **MERN** (MongoDB, Express, React, Node) architecture with a clean separation between client and server layers.

```
                  ┌─────────────────────────────────────────┐
                  │          React Vite Client              │
                  │  (Dashboard, Ingest, AI Search, Radar)  │
                  └────────────────────┬────────────────────┘
                                       │ (REST API / JWT Auth)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │         Express Node.js Server          │
                  │  (Controllers, Middlewares, Routers)    │
                  └──────┬─────────────┬─────────────┬──────┘
                         │             │             │
                         ▼             ▼             ▼
                 ┌───────────────┐ ┌───────────┐ ┌──────────────┐
                 │ MongoDB Atlas │ │ Local/S3  │ │ Gemini API/  │
                 │   Database    │ │  Storage  │ │ Mock Engine  │
                 └───────────────┘ └───────────┘ └──────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **React 19 & Vite** – Main Single Page Application client framework.
- **Tailwind CSS v4** – Modern declarative styling.
- **Lucide Icons** – High fidelity tactical action icons.
- **Framer Motion** – Cybernetic transition effects and CRT scanline animations.
- **React Router 7** – Single Page Application view routes.
- **Axios & TanStack Query** – Structured state requests.

### Backend
- **Node.js & Express.js** – Main REST API server with routing middleware.
- **MongoDB & Mongoose** – Relational document modeling.
- **FFmpeg (fluent-ffmpeg)** – Keyframe snapshot extraction and thumbnails.
- **Google GenAI SDK** – Gemini 1.5/2.0 Vision model interface.
- **AWS SDK v3 (S3)** – Object bucket storage for processed frames/clips.
- **JWT & bcryptjs** – Security signature checking and hashing.

---

## 🚀 Getting Started

### Prerequisites
1. **Node.js** v20+ (with `npm`)
2. **MongoDB** running locally or a MongoDB Atlas connection string.
3. **FFmpeg** installed on your system path.
   - **Mac (Homebrew):** `brew install ffmpeg`
   - **Linux (Debian):** `sudo apt-get install -y ffmpeg`
   - **Windows:** Download from official website and add to environment variable PATH.

---

### Local Execution Setup

#### 1. Configure the Backend Environment
Create a `.env` file inside the `server/` directory (you can copy `.env.example` from the root):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/antigravity-surveillance
JWT_SECRET=super_secret_cyber_security_key

# optional keys (will fallback to local storage and sandbox AI engine if empty)
GEMINI_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=
```

#### 2. Install and Seed the Server
```bash
cd server
npm install

# Seed default Operator (admin@antigravity.ai / password123) and 3 video feeds
npm run seed

# Start server in development mode
npm run dev
```
The server will boot on `http://localhost:5000`.

#### 3. Install and Launch the Frontend Client
In a new terminal window:
```bash
cd client
npm install

# Start Vite client dev server
npm run dev
```
The client will serve on `http://localhost:3000` (or the next available port).

---

### 🐳 Running via Docker Compose

Docker Compose automatically configures a local MongoDB database container, links the server container (installing the Debian system `ffmpeg` automatically), and deploys the client React app behind an Nginx reverse proxy.

#### 1. Deploy the Stack
From the project root:
```bash
docker-compose up --build -d
```

#### 2. Seed the MongoDB Database
Run the seed script inside the server container to generate coordinates, mock paths, and default admin credentials:
```bash
docker exec -it aisurviellance-server npm run seed:prod
```

#### 3. Access the SOC Console
- Open your browser to `http://localhost:3000`
- Log in with the standard credentials:
  - **Ingress Email:** `admin@antigravity.ai`
  - **Access Password:** `password123`

---

## 🧠 AI Integration & Mock Fallback Engine

If you do not provide a `GEMINI_API_KEY` or `AWS_ACCESS_KEY_ID`, **AI Surviellance** initiates its high-fidelity sandboxed modules:

1. **Storage Sandbox**: Processed clips and extracted frame snapshots are saved directly to `/server/uploads/` and served statically.
2. **Cognitive AI Sandbox**: When a file is uploaded, the server uses local keyframe slicing. The detection indexing parses natural descriptions and auto-generates matching bounding boxes, confidence coefficients (85%–98%), and random chronologically offset coordinate nodes to ensure the tracking map works seamlessly immediately.
3. **Semantic Search Simulator**: In the absence of an API key, the search controller utilizes text parsing algorithms to scan for clothing terms (e.g., `"red"`, `"blue"`, `"jeans"`, `"black"`, `"jacket"`) inside the seeded document indexes and returns relevant timelines, confidence metrics, and bounding-box coordinates.

---

## 🛰️ Dashboard Core Features

1. **Operations Console (Dashboard)**
   - Cloud connectivity indicators (Gemini core status, AWS S3 status, Maps integration).
   - Ingest analytics counter panels.
   - Interactive animated SVG Detection trend chart.
   - Real-time ingress incident log catalog.

2. **Video Ingestion Port (Upload Center)**
   - Drag & drop local mp4 files.
   - Assign camera names, custom IDs, IP addresses, recording start times, and location lat/long coordinates.
   - Real-time S3 upload progress bars and server ingestion pipelines status tracker.

3. **AI Semantic Search**
   - Natural language search field (e.g., *"Show person wearing black jacket and jeans"*).
   - Dynamic filtered matching events grid with extracted frame previews.
   - Click to track pathing.

4. **Surveillance Stream Library**
   - Catalog of all ingested clips.
   - Quick access links to track on radar maps or open AI search.
   - Delete streams and cascade delete their indexed detections.

5. **Tactical GPS Radar Map**
   - Chronological incident tracking utilizing coordinates.
   - Custom SVG map grids depicting detection breadcrumbs with directional arrows, camera identifiers, and timeline steps.
