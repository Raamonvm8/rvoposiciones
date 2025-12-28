import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { Router } from '@angular/router';
import { ModalRegisterLoginService } from '../../services/modal-register-login.service';
import { CartService } from '../../services/cart.service';

interface UploadedFile {
  id?: number;
  title: string;
  fileNameOriginal: string;
  filename: string;
  url: string; 
  extension: string;
  isEditing?: boolean;     
  newFileName?: string;
  publicId?: string;
}

interface Recurso {
  id: number;
  name: string;
  originalName: string;
  isEditing: boolean;
  isExpanded: boolean;
  archivos: UploadedFile[];
  material_type: string | null;
  selectedFile?: File;
  selectedFileName?: string;
}

@Component({
  selector: 'app-talleres',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, NgClass],
  templateUrl: './talleres.component.html',
  styleUrl: './talleres.component.css'
})
export class TalleresComponent implements OnInit{

    selectedFile: File | null = null; 
    moduleTitle: string = '';
    selectedFileName?: string;
  
    user: User | null = null;
    isAdmin: boolean = false;
    loadingUser: boolean = true;
  
    recursos: Recurso[] = [];
    planes: any[] = [];
  
    showCreateRecursoModal: boolean = false;
    newRecursoPlanUuid: string = '';
    newRecursoName: string = '';
    ModalRegisterLoginService: any;

    notifyEmailValue: string = '';
    notifyMessage: string = '';
    notifySuccess: boolean = false;

    talleresLoaded = false;
  
    constructor(private http: HttpClient, private modalRegisterLogin: ModalRegisterLoginService, private router: Router, private cd: ChangeDetectorRef, private cartService: CartService) {
    }
    userData: any = null;
  
    ngOnInit() {
      const auth = getAuth();
      onAuthStateChanged(auth, async (user) => {
        this.user = user;
        this.loadingUser = false;

        if (user) {
          this.http.get(`http://localhost:3000/api/users/${user.uid}`).subscribe((res: any) => {
            this.userData = res;
            this.isAdmin = !!res.isAdmin;  

            // Parsear talleres si viene como string
            if (this.userData?.talleres && typeof this.userData.talleres === 'string') {
              try {
                this.userData.talleres = JSON.parse(this.userData.talleres);
              } catch {
                this.userData.talleres = [];
              }
            }

            this.loadRecursos();
            this.loadTalleres(); 
          });
        } else {
          // Usuario no logueado
          this.loadRecursos();
          this.loadTalleres();
        }
      });
    }

    // Nueva función para cargar talleres
    loadTalleres() {
      this.http.get('http://localhost:3000/api/talleres').subscribe((res: any) => {
        this.planes = res.map((p: any) => {
          let fechaDate = '';
          let fechaTime = '';

          if (p.fecha) {
            const d = new Date(p.fecha); // tu fecha del backend
            fechaDate = d.toISOString().slice(0, 10); // YYYY-MM-DD
            fechaTime = d.toTimeString().slice(0, 5); // HH:MM
          }

          return {
            ...p,
            visible: p.visible ?? false,
            fechaCountdown: p.fecha ? this.getCountdown(p.fecha) : 'sin fecha',
            fechaDate,
            fechaTime
          };
        });

        this.planes.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        
        this.startCountdowns();
        this.updateEnrolledTalleres(); 
        this.talleresLoaded = false;
      });
    }

    loadRecursos() {
      this.http.get('http://localhost:3000/api/recursos/talleres').subscribe((res: any) => {
        let userTalleres = this.userData?.talleres;
  
        if (typeof userTalleres === 'string') {
          try {
            userTalleres = JSON.parse(userTalleres);
          } catch (e) {
            console.warn('No se pudo parsear talleres:', e);
            userTalleres = [];
          }
        }
  
        this.recursos = res
          .filter((r: any) => {
            const userTalleres = Array.isArray(this.userData?.talleres)
              ? this.userData.talleres
              : [];
  
            const tallerType = (r.material_type || '').trim();
            const match = userTalleres.some((m: string) => m.trim() === tallerType);
  
            return this.isAdmin || !r.material_type || match;
          })
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            material_type: r.material_type,
            isEditing: false,
            originalName: r.name,
            isExpanded: true,
            archivos: (r.archivos || []).map((f: any) => ({
              id: f.id,
              title: f.title,
              fileNameOriginal: f.original_name,
              filename: f.file_name,
              url: f.url,
              extension: f.extension
            }))
          }));
  
      }, error => console.error('Error cargando recursos:', error));
    }
  
    get isLogged(): boolean {
      return !!this.user;
    }
  
    handleBuyTaller(plan: any) {
      if (!this.isLogged) {
        this.modalRegisterLogin.setPendingBuy(plan.uuid || plan.id);
        this.modalRegisterLogin.openLogin();
      } else {
        this.addToCartTaller(plan);
        this.router.navigate(['/compra', plan.uuid || plan.id]);
      }
    }
  
    redirectToRegister(materialUuid: string) {
      this.modalRegisterLogin.setPendingBuy(materialUuid);
      this.modalRegisterLogin.openLogin();
    }
  
    redirectToCompra(materialUuid: string) {
      const path = `/compra/${materialUuid}`;
      this.router.navigate([path]);
    }
  
    onFileSelected(event: any, recurso: Recurso) {
      const file = event.target.files[0];
      if (file) {
        recurso.selectedFile = file;
        recurso.selectedFileName = file.name; 
      }
    }

    editFileName(file: UploadedFile) {
      file.isEditing = true;
      file.newFileName = file.fileNameOriginal; // Inicializa el nuevo nombre con el nombre original
    }
  
    // Función para guardar el nuevo nombre del archivo
    saveFileName(file: any) {
      const newName = file.newFileName || file.fileNameOriginal;
  
      this.http.put(`http://localhost:3000/api/archivo/talleres/${file.id}`, { newName })
        .subscribe(() => {
          file.fileNameOriginal = newName;
          file.newFileName = undefined;
          file.isEditing = false;
        }, error => console.error('Error actualizando archivo:', error));
    }
  
    addRecurso() {
      if (!this.planes.length) {
        alert("No hay talleres disponibles para asociar.");
        return;
      }
      this.newRecursoPlanUuid = '';
      this.showCreateRecursoModal = true;
    }
  
    cancelCreateRecurso() {
      this.showCreateRecursoModal = false;
    }
  
    confirmCreateRecurso() {
      if (!this.newRecursoName.trim()) {
        alert("Debes poner un nombre al recurso.");
        return;
      }
      if (!this.newRecursoPlanUuid) {
        alert("Debes seleccionar un material antes de crear el recurso.");
        return;
      }
  
      const newRecurso = {
        name: this.newRecursoName.trim(),
        material_type: this.newRecursoPlanUuid
      };
  
      this.http.post('http://localhost:3000/api/recurso/talleres', newRecurso)
        .subscribe({
          next: (res: any) => {
            this.recursos.push(res.recurso);
            this.showCreateRecursoModal = false;
            this.newRecursoName = '';
            this.newRecursoPlanUuid = '';
          },
          error: (err) => {
            console.error('Error al crear el recurso:', err);
            alert("No se pudo crear el recurso.");
          }
        });
    }
  
    deleteRecurso(recurso: any) {
      if (!confirm('¿Seguro que quieres eliminar este apartado?')) return;
  
      this.http.delete(`http://localhost:3000/api/recurso/talleres/${recurso.id}`)
        .subscribe(() => {
          this.recursos = this.recursos.filter(r => r.id !== recurso.id);
        }, error => console.error('Error al eliminar recurso:', error));
    }

    // Cambiar a modo edición
    editRecurso(recurso: { name: string, isEditing: boolean }) {
      recurso.isEditing = true;
    }
  
    // Guardar el título editado
    saveRecurso(recurso: Recurso) {
      if (!recurso.isEditing) return; 
  
      const payload = { 
        name: recurso.name,
        material_type: recurso.material_type || null
      };
  
      this.http.put(`http://localhost:3000/api/recurso/talleres/${recurso.id}`, payload)
        .subscribe({
          next: (res: any) => {
            recurso.isEditing = false;
            recurso.originalName = recurso.name;
          },
          error: (err) => {
            console.error('Error actualizando recurso:', err);
            recurso.name = recurso.originalName;
            recurso.isEditing = false;
          }
        });
    }
  
    cancelEdit(recurso: { name: string, isEditing: boolean, originalName: string }) {
      recurso.name = recurso.originalName; 
      recurso.isEditing = false;
    }
  
    onUpload(recurso: Recurso) {
      if (!recurso.selectedFile) return;
  
      const formData = new FormData();
      formData.append('file', recurso.selectedFile, recurso.selectedFile.name);
      formData.append('title', this.moduleTitle || '');
  
      this.http.post(`http://localhost:3000/api/upload/taller/${recurso.id}`, formData)
        .subscribe({
          next: (response: any) => {
            if (!recurso.archivos) recurso.archivos = [];
            recurso.archivos.push({
              id: response.file.id,
              title: this.moduleTitle,
              fileNameOriginal: response.file.original_name || response.file.originalName,
              filename: response.file.file_name,
              url: response.file.url,
              extension: response.file.extension,
              publicId: response.file.publicId 
            });
  
            recurso.selectedFile = undefined;
            recurso.selectedFileName = undefined;
            this.moduleTitle = '';
          },
          error: err => {
            console.error('❌ Error al subir archivo:', err);
            if (err.error) console.error('Detalle del error:', err.error);
          }
        });
    }
  
    // Define los iconos según el formato del archivo
    getIconForFile(extension: string): string {
      switch (extension) {
        case '.pdf':
          return 'assets/icons/pdf-icon.png'; 
        case '.mp4':
        case '.mov':
          return 'assets/icons/video-icon.png'; 
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.heic':
          return 'assets/icons/imagen-icon.png'; 
        case '.doc':
        case '.docx':
          return 'assets/icons/word-icon.png';
        case '.xlsx':
        case '.xls':
          return 'assets/icons/microsoft-excel-icon.png';
        case '.ppt':
        case '.pptx':
          return 'assets/icons/ppt-icon.png'; 
        default:
          return 'assets/icons/default-icon.png';
      }
    }

    sidebarOpen: boolean = false;

    toggleSidebar() {
      this.sidebarOpen = !this.sidebarOpen;
    }

  
    toggleRecurso(recurso: any) {
      recurso.isExpanded = !recurso.isExpanded; 
    }
  
    deleteFile(recurso: Recurso, file: any) {
      this.http.delete(`http://localhost:3000/api/archivo/talleres/${file.id}`)
        .subscribe(() => {
          recurso.archivos = recurso.archivos.filter((f: any) => f.id !== file.id);
        }, error => console.error('Error eliminando archivo:', error));
    }
  
    guardarPlan(plan: any) {
      const fecha = plan.fechaDate || new Date().toISOString().slice(0,10);
      const hora = plan.fechaTime || "00:00";

      const localDate = new Date(`${fecha}T${hora}:00`);

      const fechaUTC = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000)
      const fechaSQL = fechaUTC.toISOString().slice(0, 19).replace('T', ' ');

      const payload = {
        titulo: plan.titulo,
        descripcion: plan.descripcion,
        price: plan.price,
        fecha: fechaSQL
      };

      this.http.put(`http://localhost:3000/api/talleres/${plan.id}`, payload)
        .subscribe({
          next: () => console.log('Taller actualizado con fecha y hora:', fechaSQL),
          error: err => console.error('Error actualizando taller:', err)
        });
    }
  
    toggleVisible(plan: any) {
      plan.visible = !plan.visible;
  
      // Llama al backend para guardarlo
      this.http.put(`http://localhost:3000/api/talleres/${plan.id}`, {
        titulo: plan.titulo,
        descripcion: plan.descripcion,
        img: plan.img,
        price: plan.price,
        visible: plan.visible 
      }).subscribe({
        next: () => {
          console.log(`Visibilidad de ${plan.titulo} actualizada a: ${plan.visible}`);
          plan.cssClass = plan.visible ? '' : 'hidden';
        },
        error: (err) => {
          console.error('Error al actualizar visibilidad:', err);
          // revertir en caso de error
          plan.visible = !plan.visible;
        }
      });
    }
  
    agregarPlan() {
      const nuevo = {
        titulo: 'Nuevo taller',
        descripcion: 'Descripción del nuevo taller...',
        img: 'assets/icons/default-icon.png',
        price: 50,
        visible: false
      };
  
      this.http.post('http://localhost:3000/api/talleres', nuevo).subscribe((res: any) => {
          this.planes.push({ ...res, uuid: res.uuid || crypto.randomUUID(), visible: false });
      });
    }

    onImageSelectedTaller(event: any, plan: any) {
      const file: File = event.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);

      this.http.post(`http://localhost:3000/api/talleres/upload/${plan.id}`, formData)
        .subscribe({
          next: (res: any) => {
            plan.img = res.url;
            console.log('✅ Imagen subida correctamente a talleres:', res.url);
          },
          error: (err) => {
            console.error('❌ Error subiendo imagen a talleres:', err);
          }
        });
    }

    enrolledTalleres: any[] = [];

    updateEnrolledTalleres() {
      if (!this.userData?.talleres || !this.planes.length) {
        this.enrolledTalleres = [];
        return;
      }
      this.enrolledTalleres = this.planes.filter(plan => 
        this.userData.talleres.includes(plan.uuid || plan.id)
      );
      this.cd.detectChanges();
    }

    deletePlan(index: number) {
      const plan = this.planes[index];
      if (!confirm('¿Seguro que quieres eliminar este taller?')) return;
  
      this.http.delete(`http://localhost:3000/api/talleres/${plan.id}`).subscribe(() => {
        this.planes.splice(index, 1);
      });
    } 

    addToCartTaller(plan: any) {
      this.cartService.addToCart({
        uuid: plan.uuid,
        titulo: plan.titulo,
        price: plan.price,
        img: plan.img,
        descripcion: plan.descripcion,
        type: 'taller'
      });
    }

    startCountdowns() {
      setInterval(() => {
        this.planes.forEach(plan => {
          if (plan.fecha) {
            const countdown = this.getCountdown(plan.fecha);
            plan.fechaCountdown = countdown.texto;
            plan.diasRestantes = countdown.diasRestantes;
            plan.mesesRestantes = countdown.mesesRestantes;
          }
        });
        this.cd.detectChanges();
      }, 1000);
    }

    getCountdown(fechaInput: string | Date): { texto: string, diasRestantes: number, mesesRestantes: number } {
      if (!fechaInput) return { texto: 'Sin fecha', diasRestantes: 999, mesesRestantes: 12 };

      let fechaSQL: string;

      // Convertir Date a string si llega como Date
      if (fechaInput instanceof Date) {
        fechaSQL = fechaInput.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        fechaSQL = fechaInput.toString().trim();
      }

      // Aceptar tanto "2026-02-23 18:00:00" como "2026-02-23T18:00:00"
      fechaSQL = fechaSQL.replace('T', ' ').split('.')[0]; 

      const [datePart, timePart] = fechaSQL.split(' ');
      if (!datePart || !timePart) return { texto: 'Fecha inválida', diasRestantes: 999, mesesRestantes: 12 };

      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute, second] = timePart.split(':').map(Number);

      if ([year, month, day, hour, minute, second].some(isNaN)) return { texto: 'Fecha inválida', diasRestantes: 999, mesesRestantes: 12 };

      const endTime = Date.UTC(year, month - 1, day, hour, minute, second);
      const now = Date.now();
      let diff = endTime - now;

      if (diff <= 0) return { texto: '¡Ya comenzó!', diasRestantes: 0, mesesRestantes: 0 };

      const meses = Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
      diff -= meses * (30 * 24 * 60 * 60 * 1000);

      const dias = Math.floor(diff / (24 * 60 * 60 * 1000));
      diff -= dias * (24 * 60 * 60 * 1000);

      const horas = Math.floor(diff / (60 * 60 * 1000));
      diff -= horas * (60 * 60 * 1000);

      const minutos = Math.floor(diff / (60 * 1000));
      diff -= minutos * (60 * 1000);

      const segundos = Math.floor(diff / 1000);

      const textoSinMesesH = `Quedan ${dias} días ${horas}:${minutos}:${segundos} horas`;
      const textoSinDiasH = `Quedan ${horas}:${minutos}:${segundos} horas`;
      const textoH = `Quedan ${meses} meses ${dias} días ${horas}:${minutos}:${segundos} horas`;

      const textoSinMeses = `Quedan ${dias} días ${minutos}:${segundos} minutos`;
      const textoSinDias = `Quedan ${minutos}:${segundos} minutos`;
      const texto = `Quedan ${meses} meses ${dias} días ${minutos}:${segundos} minutos`;

      if(horas>0){
        if (meses > 0) {
          return { texto: textoH, diasRestantes: dias, mesesRestantes: meses };
        } else if (dias > 0) {
          return { texto: textoSinMesesH, diasRestantes: dias, mesesRestantes: meses };
        } 
        return { texto: textoSinDiasH, diasRestantes: 0, mesesRestantes: meses };
      }else{
        if (meses > 0) {
          return { texto, diasRestantes: dias, mesesRestantes: meses };
        } else if (dias > 0) {
          return { texto: textoSinMeses, diasRestantes: dias, mesesRestantes: meses };
        } 
        return { texto: textoSinDias, diasRestantes: 0, mesesRestantes: meses };
      }
      
    }

    hasTalleresActivos(): boolean {
      return this.planes?.some(p => p.visible);
    }

    notifyEmail() {
      const correo = this.notifyEmailValue?.trim().toLowerCase();
      if (!correo) return;

      this.http.post('http://localhost:3000/api/recolecta', {
        correo
      }).subscribe({
        next: (res: any) => {
          if (res.message?.includes('ya registrado')) {
            this.notifySuccess = false;
            this.notifyMessage = 'ℹ️ Este correo ya estaba registrado.';
          } else {
            this.notifySuccess = true;
            this.notifyMessage = '✅ Te avisaremos cuando haya nuevos talleres.';
            this.notifyEmailValue = '';
          }
        },
        error: () => {
          this.notifySuccess = false;
          this.notifyMessage = '❌ Error guardando el correo. Inténtalo más tarde.';
        }
      });
    }
}