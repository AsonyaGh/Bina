
import * as firebaseApp from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Replace with your actual Firebase project configuration
const firebaseConfig = {
   apiKey: "AIzaSyBk4z6uYueay650P8Doc8UWcuQIZAeMt4U",
  authDomain: "bina-ca5ac.firebaseapp.com",
  projectId: "bina-ca5ac",
  storageBucket: "bina-ca5ac.firebasestorage.app",
  messagingSenderId: "899860561662",
  appId: "1:899860561662:web:57b3f6db15c6c20aba6faf",
  measurementId: "G-0S4CDXGJW2"
};

const app = firebaseApp.initializeApp(firebaseConfig);
export const db = getFirestore(app);
