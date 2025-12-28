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

  isAdmin: boolean = false;

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

  items: {title: string, ruta: string}[] = [{title: 'SOBRE RAMÓN', ruta: 'quiénsoy'}, {title: 'MIS LIBROS', ruta: 'libros'}, {title: 'MATERIALES', ruta: 'materiales'}, {title: 'TALLERES', ruta: 'talleres'}];

  nameAdmin: string = 'ADMIN';
  constructor(private http: HttpClient, private authModal: ModalRegisterLoginService) {}

  ngOnInit() {
    const savedIndex = localStorage.getItem('selectedIndex');
    if (savedIndex !== null) {
        this.selectedIndex = parseInt(savedIndex, 10);
    }

    const auth = getAuth();

    onAuthStateChanged(auth, async (user) => {
      this.isLoggedIn = !!user;

      if (user) {
        try {
          const token = await user.getIdToken();

          this.http.get<any>('http://localhost:3000/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          }).subscribe({
            next: data => {
              this.registerData.isAdmin = !!data.isAdmin;
            },
            error: () => {
              this.registerData.isAdmin = false;
            }
          });

        } catch (err) {
          console.error('Error obteniendo token', err);
          this.registerData.isAdmin = false;
        }
      } else {
        this.registerData.isAdmin = false;
      }
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

    this.closeRegisterModal();

    const auth = getAuth();

    // Registro en Firebase
    createUserWithEmailAndPassword(auth, this.registerData.email, this.registerData.password)
      .then(async (userCredential) => {
        const user = userCredential.user;
        auth.languageCode = 'es';

        // Desactivar temporalmente el login automático
        this.isLoggedIn = false;

        // Enviar email de verificación
        await sendEmailVerification(user);

        // Mostrar Swal de éxito
        await Swal.fire({
          icon: 'success',
          title: 'Registro completo',
          text: 'Se ha enviado un email de verificación. Verifica tu correo para iniciar sesión.',
          confirmButtonText: 'Entendido',
          buttonsStyling: false,
          customClass: {
            confirmButton: 'my-confirm-button'
          }
        });

        // Cerrar sesión para asegurarnos de que no quede logueado
        await signOut(auth);

        // Guardar en backend
        const safeRegisterData = {
          fullName: this.registerData.fullName || '',
          email: this.registerData.email || '',
          cursos: this.registerData.cursos || { primaria: false, PT: false, secundaria: false },
          materiales: this.registerData.materiales || [],
          talleres: this.registerData.talleres || [],
          recursos: this.registerData.recursos ?? false,
          isAdmin: this.registerData.isAdmin ?? false
        };
        const token = await user.getIdToken();

        this.http.post('http://localhost:3000/api/users', safeRegisterData, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: () => console.log('Usuario guardado en MySQL'),
          error: err => console.error('Error guardando en MySQL:', err)
        });

        // Reiniciar modal y pasos
        this.registerStep = 1;
      })
      .catch((error) => {
        console.error('Error registrando:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message,
          confirmButtonText: 'Entendido',
          buttonsStyling: false,
          customClass: {
            confirmButton: 'my-confirm-button'
          }
        });
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

  closeMobileMenu() {
    this.isMenuOpen = false;
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


