import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(), provideFirebaseApp(() => initializeApp({ projectId: "rvoposiciones", appId: "1:48238612080:web:bb90a2975ba3ad392e2eb5", storageBucket: "rvoposiciones.firebasestorage.app", apiKey: "AIzaSyD0dE3-a9UeiJ0bFjLHoujJpqngoQ2adg0", authDomain: "rvoposiciones.firebaseapp.com", messagingSenderId: "48238612080", measurementId: "G-7WL275MC6R" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore()),
  ]
};
