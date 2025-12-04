
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Config from the provided code
export const firebaseConfig = {
  apiKey: "AIzaSyBTHcX_Ha3CZPNHY8vcWilcOe4oF3f6rKU",
  authDomain: "lmsapp-19548.firebaseapp.com",
  projectId: "lmsapp-19548",
  storageBucket: "lmsapp-19548.firebasestorage.app",
  messagingSenderId: "584664617140",
  appId: "1:584664617140:web:8ffa1650976191c45887e1",
  measurementId: "G-1TK7RW8H15"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Helper for dynamic collection paths based on App ID
// Note: In a real React app, App ID is usually constant, but we keep the structure
const APP_ID = 'default-app-id';
export const getPath = (col: string) => `artifacts/${APP_ID}/public/data/${col}`;
export const getRef = (col: string) => collection(db, 'artifacts', APP_ID, 'public', 'data', col);
