import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auth, DB } from '../../../environments/environment';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [NgFor, DatePipe, NgIf, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent {
  users: any[] = [];
  talleres: any[] = [];
  newAccessEmail: { [tallerId: string]: string } = {};

  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  searchName: string = '';
  isAdmin: boolean = false;
  user: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Revisar si el usuario está logueado
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      this.user = user;
      if (user) {
        // Obtener info del usuario
        this.http.get(`http://localhost:3000/api/users/${user.uid}`)
          .subscribe((res: any) => {
            this.isAdmin = !!res.isAdmin;
          });
      }
    });

    // Aquí puedes mantener tus llamadas actuales a loadData()
    this.loadData();
  }

  loadData() {
    this.http.get<any[]>('http://localhost:3000/admin/users')
      .subscribe(users => {
        this.users = users.map(u => ({
          ...u,
          talleres: Array.isArray(u.talleres) ? u.talleres : JSON.parse(u.talleres || '[]')
        }));

        this.http.get<any[]>('http://localhost:3000/admin/talleres')
          .subscribe(talleres => {
            this.talleres = talleres.map(t => ({
              ...t,
              usuarios: this.users
                .filter(u => u.talleres.includes(t.uuid))
                .map(u => ({
                  email: u.email,
                  fullName: u.fullName,
                  hasAccess: true
                }))
            }));
          });
      });
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.users.sort((a, b) => {
      let valA = a[column] || '';
      let valB = b[column] || '';

      if (column === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get filteredUsers() {
    let filtered = this.users;

    if (this.searchName) {
      filtered = filtered.filter(u =>
        (u.fullName || '').toLowerCase().includes(this.searchName.toLowerCase())
      );
    }

    if (this.sortColumn) {
      filtered = filtered.sort((a, b) => {
        let valA = a[this.sortColumn] || '';
        let valB = b[this.sortColumn] || '';

        if (this.sortColumn === 'createdAt') {
          valA = new Date(valA).getTime();
          valB = new Date(valB).getTime();
        }

        if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }


  verifyUser(uid: string) {
    this.http.post(`http://localhost:3000/admin/users/${uid}/verify`, {})
    .subscribe({
      next: () => {
        alert('Usuario verificado');
        this.ngOnInit();
      },
      error: (err) => {
        console.error('Error al verificar:', err);
        alert('Error al verificar usuario');
      }
    });

  }

  deleteUser(uid: string) {
    if (confirm('¿Seguro que quieres eliminar este usuario?')) {
      this.http.delete(`http://localhost:3000/admin/users/${uid}`)
        .subscribe(async () => {
          alert('Usuario eliminado');
          this.users = this.users.filter(u => u.uid !== uid);
          
        });
    }
  }

  revokeAccess(tallerUuid: string, email: string) {
    if (!confirm(`Quitar acceso de ${email}?`)) return;

    this.http.post(
      `http://localhost:3000/admin/talleres/${tallerUuid}/revoke`,
      { email }
    ).subscribe(() => {
      const taller = this.talleres.find(t => t.uuid === tallerUuid);
      if (!taller) return;

      taller.usuarios = taller.usuarios.filter(
        (u: any) => u.email !== email
      );
    });
  }

  grantAccess(tallerUuid: string, email: string) {
    if (!email) return alert('Introduce un correo válido');

    this.http.post<{ message: string; talleres: string[] }>(
      `http://localhost:3000/admin/talleres/${tallerUuid}/grant`,
      { email }
    ).subscribe(res => {

      // 🔹 Usuario global
      let usuario = this.users.find(u => u.email === email);
      if (!usuario) {
        usuario = {
          email,
          fullName: '',
          talleres: res.talleres
        };
        this.users.push(usuario);
      } else {
        usuario.talleres = res.talleres;
      }

      // 🔹 Usuario dentro del taller
      const taller = this.talleres.find(t => t.uuid === tallerUuid);
      if (!taller) return;

      let usuarioTaller = taller.usuarios.find((u: any) => u.email === email);
      if (!usuarioTaller) {
        taller.usuarios.push({
          email,
          fullName: usuario.fullName,
          hasAccess: true
        });
      } else {
        usuarioTaller.hasAccess = true;
      }

      this.newAccessEmail[tallerUuid] = '';
    });
  }



}
