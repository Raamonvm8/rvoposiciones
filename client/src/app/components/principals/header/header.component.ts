import { Component, NgModule } from '@angular/core';
//import { AuthService } from '../auth.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, app, DB } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { getAbsoluteURL } from 'video.js/dist/types/utils/url';
import { ModalRegisterLoginService } from '../../../services/modal-register-login.service';
import Swal from 'sweetalert2';




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
  emailOlvidado: string = '';
  password: string = '';
  isLoggedIn: boolean = false;
  muestraLogin: boolean = false;
  errorMessage: string = '';
  selectedIndex: number = -1;
  isMenuOpen: boolean = false;
  showRegisterModal = false;
  registerStep = 1;
  activeTab: 'form' | 'plans' = 'form';

  showContraOlvidada: boolean = false;

  user: User | null = null;

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
    recursos: false,
    isAdmin: false
  };

  items: {title: string, ruta: string}[] = [{title: 'SOBRE RAMÓN', ruta: 'quiénsoy'}, {title: 'MIS LIBROS', ruta: 'libros'}, {title: 'MATERIALES', ruta: 'materiales'}, {title: 'TALLERES', ruta: ''}];

  constructor(private http: HttpClient, private authModal: ModalRegisterLoginService) {}

  ngOnInit() {
    const savedIndex = localStorage.getItem('selectedIndex');
    if (savedIndex !== null) {
        this.selectedIndex = parseInt(savedIndex, 10);
    }

    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      this.isLoggedIn = !!user;
    });

    this.authModal.showLoginModal$.subscribe(show => {
      this.muestraLogin = show;
    });

    this.authModal.showRegisterModal$.subscribe(show => {
      this.showRegisterModal = show;
    });
  }


  onSubmit(): void {
    signInWithEmailAndPassword(auth, this.email, this.password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        if (!user.emailVerified) {
          alert('Debes verificar tu email antes de poder acceder.');
          await signOut(auth);
          return; 
        }

        this.isLoggedIn = true;
        this.muestraLogin = false;
        const token = await user.getIdToken();

        // ✅ Enviar token al backend para crear/actualizar usuario en MySQL
        const safeLoginData = {
          fullName: this.fullname || '',
          email: this.email || '',
          cursos: { primaria: false, PT: false, secundaria: false },
          materiales: [],
          talleres: [],
          recursos: false,
          isAdmin: false
        };

        this.http.post('http://localhost:3000/api/users', safeLoginData, {
          headers: { Authorization: `Bearer ${token}` }
        })

        console.log('Usuario logueado:', user);
      })
      .catch((error) => {
        console.error('Error de login:', error);

        let mensaje = 'Credenciales incorrectas. Comprueba correo y contraseña';
        if (!this.email || !this.password){
          mensaje = 'Credenciales incompletas'
        }else{
          switch (error.code) {
            case 'auth/user-not-found':
              mensaje = 'El correo no está registrado';
              break;
            case 'auth/invalid-credential':
              break;
            case 'auth/invalid-email':
              mensaje = 'El formato del correo no es válido';
              break;
            case 'auth/too-many-requests':
              mensaje = 'Demasiados intentos fallidos. Inténtalo más tarde';
              break;
            default:
              mensaje = 'Error al iniciar sesión. Inténtalo de nuevo';
              break;
          }
        }
        

        Swal.fire({
          toast: true,
          customClass: {
            popup: 'custom-toast'
          },
          icon: 'error',
          title: mensaje,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      });


  }
  
  logout(): void {
    const auth = getAuth();
    signOut(auth)
    .then(() => {
      console.log('Sesión cerrada correctamente');
      this.isLoggedIn = false;
      this.user = null;
      this.email = '';
      this.password = '';
      // Opcional: recargar la página
      location.reload();
    })
    .catch((error) => {
      console.error('Error cerrando sesión:', error);
    });
    
  }

  toggleLoginForm(x: string) {
    if (x === 'login') {
      this.authModal.openLogin();
    } else {
      this.authModal.openRegister();
      this.registerStep = 1;
      this.activeTab = 'form';
    }
  }

  closeLoginModal(){
    this.authModal.closeLogin();

  }

  closeRegisterModal() {
    this.authModal.closeRegister();
    this.registerStep = 1;
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

  if (this.registerData.password !== this.registerData.confirmPassword) {
    alert('Las contraseñas no coinciden');
    return;
  }

  console.log(`Plan elegido: ${plan}`);

  const auth = getAuth();

  // Registro en Firebase
  createUserWithEmailAndPassword(auth, this.registerData.email, this.registerData.password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      auth.languageCode = 'es';

      // Enviar email de verificación
      await sendEmailVerification(user);
      alert('Se ha enviado un email de verificación. Verifica para iniciar sesión.');

      // Cerrar sesión inmediatamente para que no se loguee automáticamente
      await signOut(auth);

      // Preparar datos seguros para enviar al backend (evitar undefined/null)
      const safeRegisterData = {
        fullName: this.registerData.fullName || '',
        email: this.registerData.email || '',
        cursos: this.registerData.cursos || { primaria: false, PT: false, secundaria: false },
        materiales: this.registerData.materiales || [],
        talleres: this.registerData.talleres || [],
        recursos: this.registerData.recursos ?? false,
        isAdmin: this.registerData.isAdmin ?? false
      };

      // Obtener token para autorización con Firebase
      const token = await user.getIdToken();

      // Enviar datos al backend
      this.http.post('http://localhost:3000/api/users', safeRegisterData, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: () => console.log('Usuario guardado en MySQL'),
        error: err => console.error('Error guardando en MySQL:', err)
      });

      // Cerrar modal y reiniciar pasos
      this.closeRegisterModal();
      this.registerStep = 1;
    })
    .catch((error) => {
      console.error('Error registrando:', error);
      alert(error.message);
    });
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

  contraOlvidada(){
    this.showContraOlvidada = true;
  }
  changePass(): void{
    sendPasswordResetEmail(auth, this.emailOlvidado)
    .then(() => {
      alert('Si el email es correcto, le ha debido llegar un enlace para restablecer su contraseña. Revise la bandeja de entrada/spam.');
      this.closeModalPass();
      this.toggleLoginForm('login');
      console.log("Correo de restablecimiento enviado");
    })
    .catch((error) => {
    if (error.code === 'auth/user-not-found') {
      alert('El email no se encuentra registrado en nuestra web');
    } else {
      console.error("Error al enviar el correo:", error);
    }
  });

  }

  closeModalPass(){
    this.showContraOlvidada = false;
  }
  

}
function gradient(arg0: number, deg: any, arg2: any, arg3: number, d64: any, arg5: any, arg6: number, f: any) {
  throw new Error('Function not implemented.');
}

