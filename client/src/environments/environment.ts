// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { provideAuth } from "@angular/fire/auth";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const environment = {
    firebaseConfig : {
        apiKey: "AIzaSyD0dE3-a9UeiJ0bFjLHoujJpqngoQ2adg0",
        authDomain: "rvoposiciones.firebaseapp.com",
        projectId: "rvoposiciones",
        storageBucket: "rvoposiciones.firebasestorage.app",
        messagingSenderId: "48238612080",
        appId: "1:48238612080:web:4dc603324c9f1e542e2eb5",
        measurementId: "G-W9GBZSN90E"
    }
      
}

// Initialize Firebase
export const app = initializeApp(environment.firebaseConfig);
export const auth = getAuth(app);
export const DB = getFirestore(app);
export const analytics = getAnalytics(app);