# AgriNova | AI-Powered Autonomous Agricultural Robot

AgriNova is an AI-powered autonomous agricultural robot designed for real-time farm monitoring, environmental sensing, plant health detection, and intelligent agricultural decision support.

## Project Vision
This web application serves as the central monitoring hub for the AgriNova system, providing farmers with a professional, intuitive interface to observe farm metrics and receive AI-driven recommendations.

## Tech Stack
- **Frontend**: Plain HTML5, Tailwind CSS v4, Vanilla JavaScript.
- **Visualizations**: Chart.js for historical and real-time trends.
- **Icons**: Lucide Icons.
- **Backend (Mocked)**: Firebase Realtime Database & Cloud Firestore (Client-side simulation).

## Features
- **Real-time Monitoring**: Live updates for temperature, humidity, soil moisture, and more.
- **Plant Health AI**: Diagnostic summary of crop conditions based on robot vision analysis.
- **Interactive Graphs**: Historical data trends for both environment and plant metrics.
- **AI Analysis**: Deep insights and "Next Action" recommendations.
- **Secure Access**: Simulation of Google Authentication for sensitive data protection.

## Getting Started
1. Run `npm install` to install build dependencies.
2. Run `npm run dev` to start the development server.
3. Access the dashboard at `http://localhost:3000`.

## Firebase Integration
To enable real Firebase integration:
1. Update `js/firebase-config.js` with your Firebase project credentials.
2. In the respective logic files (`js/auth.js`, `js/dashboard.js`, etc.), uncomment the Firebase initialization code and update the listeners from mock to the real `onValue` and `getDocs` functions.

---
*Developed as a Final Year Computing Project.*
