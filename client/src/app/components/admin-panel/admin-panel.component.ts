import { NgFor } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { DatePipe } from '@angular/common';

import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { auth, DB } from '../../../environments/environment';

@Component({
  selector: 'app-admin-panel',
  imports: [NgFor, DatePipe],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.css'
})
export class AdminPanelComponent {
  users: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>('http://localhost:3000/admin/users')
      .subscribe(data => this.users = data);
    
    
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


}
