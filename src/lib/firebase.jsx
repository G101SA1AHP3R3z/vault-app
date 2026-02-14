// /src/lib/firebase.jsx
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBAzs4wQPtZCsI-QQHiFmFxlxnVTVHfG_w",
  authDomain: "the-vault-7d9fe.firebaseapp.com",
  projectId: "the-vault-7d9fe",
  // ✅ IMPORTANT: use bucket name WITHOUT gs://
  storageBucket: "gs://the-vault-7d9fe.firebasestorage.app",
  messagingSenderId: "88313488276",
  appId: "1:88313488276:web:3afb61f8c62bec09ece581",
  measurementId: "G-87Q0GM1EW8",
};

// Avoid re-initializing in Vite HMR
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ Google provider export (fixes your named export error)
export const googleProvider = new GoogleAuthProvider();

// Optional: Analytics (only runs in browser + if supported)
export let analytics = null;
if (typeof window !== "undefined") {
  analyticsSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {
      // ignore analytics errors
    });
}
