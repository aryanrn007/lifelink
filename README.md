# LifeLink

**Target SDG:** 3 (Good Health & Well-being)

## Problem Statement

In emergency situations, every second counts. Traditional emergency services often face delays due to high call volumes or geographic distance, especially in densely populated urban areas where immediate first-aid response can be critical. LifeLink addresses this gap by creating a hyper-local emergency response network that connects people in need with nearby verified first-aid volunteers in real-time, reducing response times and potentially saving lives. The app also provides offline-capable CPR guidance to empower bystanders with life-saving knowledge when professional help is not immediately available.

## Tech Stack and Declared Dependencies

- **Build Tool:** Vite
- **Framework:** React (v19.2.8)
- **Styling:** Tailwind CSS v4 with @tailwindcss/vite plugin (v4.3.3)
- **Routing:** react-router-dom (v7.18.4)
- **Backend:** Firebase SDK v10+ modular (v12.19.0)
  - Authentication (anonymous sign-in)
  - Cloud Firestore (real-time database)
- **Maps:** Leaflet (v1.9.4) and react-leaflet (v5.0.0)
- **PWA:** vite-plugin-pwa (v1.3.0)

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Then fill in your Firebase configuration values in `.env`

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Deploy to Firebase Hosting:
   ```bash
   npm run deploy
   ```

## Architecture

The Firestore data model is documented in [DATA_MODEL.md](./DATA_MODEL.md). This schema defines the three main collections:

- **emergencies**: Emergency requests with caller info, location, status, and responder list
- **responders**: Volunteer profiles with skills, on-duty status, and real-time location
- **resources**: Fixed emergency resources like AEDs and first-aid kits

Phase 2 (data model) is complete. Subsequent phases (3-5) will build on this schema without field renames.

## Team Contributions

[Team contributions to be added]
