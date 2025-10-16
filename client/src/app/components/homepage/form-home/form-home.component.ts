import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-form-home',
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  standalone: true,
  templateUrl: './form-home.component.html',
  styleUrl: './form-home.component.css'
})
export class FormHomeComponent {

  registroForm: FormGroup;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.registroForm = this.fb.group({
      nombre: ['', Validators.required],
      correo: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.registroForm.valid) {
      const datos = this.registroForm.value;

      this.http.post('http://localhost:3000/api/recolecta', datos).subscribe({
        next: (res) => {
          console.log('Registro enviado:', res);
          alert('¡Gracias por registrarte! Te enviaremos la información pronto.');
          this.registroForm.reset();
        },
        error: (err) => {
          console.error('Error registrando correo:', err);
          alert('Ocurrió un error al registrarte. Intenta nuevamente.');
        }
      });
    }
  }

}
