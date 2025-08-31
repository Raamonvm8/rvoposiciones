import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';
import { from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private auth: Auth, private firestore: Firestore) {}

  // Registro de usuario
  register(fullName: string, email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password).then((userCredential) => {
      // Guardar información adicional en Firestore
      return setDoc(doc(this.firestore, `users/${userCredential.user.uid}`), {
        fullName,
        email,
        createdAt: new Date()
      });
    }));
  }

  // Login
  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }
}
