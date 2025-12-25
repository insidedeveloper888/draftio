
import { initializeApp, getApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import type { Auth, User } from "firebase/auth";
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, orderBy, runTransaction, updateDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDB3_z-8BYC_EfxF5rTJvYGTyl1n7o5HDs",
  authDomain: "draft-io.firebaseapp.com",
  projectId: "draft-io",
  storageBucket: "draft-io.firebasestorage.app",
  messagingSenderId: "661819721666",
  appId: "1:661819721666:web:235d5da5c2fb5cc4b6385b"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // Ensure we only initialize once to avoid registry conflicts
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Explicitly initialize services with the app instance
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log("🔥 Firebase Hub: Connection established successfully.");
} catch (error) {
  console.error("❌ Firebase Hub: Critical initialization error:", error);
}

export const googleProvider = new GoogleAuthProvider();

// Re-export both core service instances and helper functions/types for consistent consumption.
export {
  auth, db, storage,
  signInWithPopup, signOut, onAuthStateChanged,
  collection, query, where, onSnapshot, doc, setDoc, deleteDoc, orderBy, runTransaction, updateDoc,
  ref, uploadBytes, getDownloadURL
};

export type { User, Auth, Firestore, FirebaseStorage, FirebaseApp };

export const isFirebaseEnabled = (): boolean => {
    // Only return true if both core services are successfully registered
    return !!auth && !!db;
};
