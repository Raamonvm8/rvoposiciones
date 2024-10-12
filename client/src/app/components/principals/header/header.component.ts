import { Component, NgModule } from '@angular/core';
//import { AuthService } from '../auth.service';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [NgIf, FormsModule, RouterLink, NgClass, NgFor],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  username: string = '';
  password: string = '';
  isLoggedIn: boolean = false;
  muestraLogin: boolean = false;
  errorMessage: string = '';
  selectedIndex: number = -1;
  isMenuOpen: boolean = false;
  items: {title: string, ruta: string}[] = [{title: 'QUIÉN SOY', ruta: 'quiénsoy'}, {title: 'MIS LIBROS', ruta: 'libros'}, {title: 'MATERIALES', ruta: 'materiales'}, {title: 'OPTION4', ruta: ''}];

  constructor(private authService: AuthService) {}

  ngOnInit(){
    const savedIndex = localStorage.getItem('selectedIndex');
    if (savedIndex !== null) {
        this.selectedIndex = parseInt(savedIndex, 10);
    }
  }

  onSubmit(): void {
    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        this.isLoggedIn = true;
        this.errorMessage = '';
        this.muestraLogin = !this.muestraLogin;
        console.log(`Usuario logueado: ${this.username}`, response);

      },
      error: (error) => {
        this.errorMessage = 'Credenciales incorrectas';
        console.log('Error de login:', error);
      }
    });
  }

  logout(): void {
    // Aquí puedes manejar el cierre de sesión, como eliminar el token del localStorage
    this.isLoggedIn = false;
    this.username = '';
    this.password = '';
  }

  // Método para mostrar u ocultar el formulario
  toggleLoginForm() {
    this.muestraLogin = !this.muestraLogin;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
  indexActual(index: number) {
    this.selectedIndex = index;
    localStorage.setItem('selectedIndex', index.toString());
  }
  

}
