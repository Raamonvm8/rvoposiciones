import { Component, NgModule } from '@angular/core';
//import { AuthService } from '../auth.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, app, DB } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';




@Component({
    selector: 'app-header',
    standalone:true,
    imports: [NgIf, FormsModule, RouterLink, NgClass, NgFor],
    templateUrl: './header.component.html',
    styleUrl: './header.component.css'
})
export class HeaderComponent {

  fullname: string = '';
  email: string = '';
  password: string = '';
  isLoggedIn: boolean = false;
  muestraLogin: boolean = false;
  errorMessage: string = '';
  selectedIndex: number = -1;
  isMenuOpen: boolean = false;
  showRegisterModal = false;
  registerStep = 1;
  activeTab: 'form' | 'plans' = 'form';

  registerData = {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cursos: {
      primaria: false,
      PT: false,
      secundaria: false
    },
    materiales: [],
    talleres: [],
    recursos: false
  };

  items: {title: string, ruta: string}[] = [{title: 'SOBRE RAMÓN', ruta: 'quiénsoy'}, {title: 'MIS LIBROS', ruta: 'libros'}, {title: 'MATERIALES', ruta: 'materiales'}, {title: 'FORMACIÓN', ruta: ''}];

  constructor(private authService: AuthService, private http: HttpClient) {}

  ngOnInit(){
    const savedIndex = localStorage.getItem('selectedIndex');
    if (savedIndex !== null) {
        this.selectedIndex = parseInt(savedIndex, 10);
    }
  }

  onSubmit(): void {
    signInWithEmailAndPassword(auth, this.email, this.password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        if (!user.emailVerified) {
          alert('Debes verificar tu email antes de poder acceder.');
          return; 
        }

        this.isLoggedIn = true;
        this.muestraLogin = false;
        const token = await user.getIdToken();

        // ✅ Enviar token al backend para crear/actualizar usuario en MySQL
        this.http.post('http://localhost:3000/api/users', {}, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: () => console.log('Usuario sincronizado con MySQL'),
          error: err => console.error('Error al sincronizar usuario:', err)
        });
        console.log('Usuario logueado:', user);
      })
      .catch((error) => {
        console.error('Error de login:', error);
        this.errorMessage = 'Credenciales incorrectas';
      });

  }
  
  logout(): void {
    this.isLoggedIn = false;
    this.email = '';
    this.password = '';
  }

  // Método para mostrar u ocultar el formulario
  toggleLoginForm(x: string) {
    if(x=='login'){
      this.muestraLogin = !this.muestraLogin;
    }else{
      this.showRegisterModal = true;
      this.registerStep = 1;
      this.activeTab = 'form';
    }
  }
  setActiveTab(tab: 'form' | 'plans') {
    this.activeTab = tab;
  }

  goToPlans() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (!this.registerData.email || !this.registerData.password) {
      alert('Completa todos los campos');
      return;
    }
    this.registerStep = 2;
    
  }

  choosePlan(plan: string) {
    if (!this.registerData.email || !this.registerData.password) {
      alert('Por favor completa los campos de registro antes de elegir un plan');
      return;
    }

    console.log(`Plan elegido: ${plan}`);

    // Registro en Firebase
    createUserWithEmailAndPassword(auth, this.registerData.email, this.registerData.password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        auth.languageCode = 'es';

        
        sendEmailVerification(user).then(() => {
          alert('Se ha enviado un email de verificación. Verifica para iniciar sesión.');
        });

        const token = await user.getIdToken();
        this.http.post('http://localhost:3000/api/users', this.registerData, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: () => console.log('Usuario guardado en MySQL'),
          error: err => console.error('Error guardando en MySQL:', err)
        });

        this.closeRegisterModal();
        this.registerStep = 1; // vuelve al formulario
      })
      .catch((error) => {
        console.error('Error registrando:', error);
        alert(error.message);
      });


  }

  closeRegisterModal() {
    this.showRegisterModal = false;
    this.registerStep = 1;
  }
  goBackToForm() {
    this.registerStep = 1;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
  indexActual(index: number) {
    this.selectedIndex = index;
    localStorage.setItem('selectedIndex', index.toString());
  }
  

}
