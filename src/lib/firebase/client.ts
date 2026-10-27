import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const env = import.meta.env;
export const firebaseConfigured = Boolean(env['VITE_FIREBASE_API_KEY'] && env['VITE_FIREBASE_PROJECT_ID'] && env['VITE_FIREBASE_APP_ID'] && env['VITE_FIREBASE_AUTH_DOMAIN']);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let analytics: Analytics | null = null;
if (firebaseConfigured) {
  const config = {
    apiKey: env['VITE_FIREBASE_API_KEY'] as string,
    authDomain: env['VITE_FIREBASE_AUTH_DOMAIN'] as string,
    projectId: env['VITE_FIREBASE_PROJECT_ID'] as string,
    storageBucket: env['VITE_FIREBASE_STORAGE_BUCKET'] as string | undefined,
    messagingSenderId: env['VITE_FIREBASE_MESSAGING_SENDER_ID'] as string | undefined,
    appId: env['VITE_FIREBASE_APP_ID'] as string,
    measurementId: env['VITE_FIREBASE_MEASUREMENT_ID'] as string | undefined,
  };
  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  void isSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app as FirebaseApp);
    })
    .catch(() => {
      analytics = null;
    });
}

export { app, auth, db, analytics };
