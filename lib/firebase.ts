// Firebase SDK v10 - Modern modular approach
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k",
  authDomain: "abcdc-staff-system.firebaseapp.com",
  projectId: "abcdc-staff-system",
  storageBucket: "abcdc-staff-system.firebasestorage.app",
  messagingSenderId: "442207878284",
  appId: "1:442207878284:web:49b157573851b124d28fa9"
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
} else {
  app = getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);
}

export { app, auth, db, storage, functions };
