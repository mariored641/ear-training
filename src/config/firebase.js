import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
// TODO: Replace with your actual Firebase project credentials
// Instructions to get these:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or use existing one
// 3. Go to Project Settings > General
// 4. Scroll down to "Your apps" and click "Web" icon
// 5. Copy the firebaseConfig object and paste it below

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let app;
let db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // If Firebase fails to initialize, app will continue to work with localStorage only
}

export { db };
