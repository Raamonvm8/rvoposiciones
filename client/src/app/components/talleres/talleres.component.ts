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
            this.cd.detectChanges();
  
            // Cargar recursos una vez que userData está listo
            this.loadRecursos();
          });
        } else {
          this.loadRecursos();
        }
        this.http.get('http://localhost:3000/api/talleres').subscribe((res: any) => {
          this.planes = res.map((p: any) => ({
            ...p,
            visible: p.visible ?? false 
          }));
        });
  
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
  
    onRegisterSuccess() {
      this.modalRegisterLogin.closeRegister();
  
      setTimeout(() => {
        this.modalRegisterLogin.pendingBuy$.subscribe(topic => {
          if ((topic === 'primaria' || topic === 'PT') && this.isLogged) {
            this.redirectToCompra(topic);
            this.modalRegisterLogin.clearPendingBuy();
          }
        });
      }, 100); 
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
      recurso.name = recurso.originalName; // Restaurar el nombre original
      recurso.isEditing = false;
    }
  
    onUpload(recurso: Recurso) {
      if (!recurso.selectedFile) return;
  
      const formData = new FormData();
      formData.append('file', recurso.selectedFile, recurso.selectedFile.name);
      formData.append('title', this.moduleTitle || '');

      console.log('📌 FormData preparado:', formData);
  
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
          return 'assets/icons/pdf-icon.png';  // Ruta a tu icono de PDF
        case '.mp4':
        case '.mov':
          return 'assets/icons/video-icon.png';  // Ruta a tu icono de MP4
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.heic':
          return 'assets/icons/imagen-icon.png';  // Icono para imágenes
        case '.doc':
        case '.docx':
          return 'assets/icons/word-icon.png';  // Icono de Word
        case '.xlsx':
        case '.xls':
          return 'assets/icons/microsoft-excel-icon.png';
        case '.ppt':
        case '.pptx':
          return 'assets/icons/ppt-icon.png';  // Icono de PowerPoint
        // Agrega más extensiones según lo que necesites
        default:
          return 'assets/icons/default-icon.png';  // Icono genérico para otros tipos
      }
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
      const payload = {
        titulo: plan.titulo,
        descripcion: plan.descripcion,
        price: plan.price,
        // visible: plan.visible 
      };
  
      this.http.put(`http://localhost:3000/api/talleres/${plan.id}`, payload)
        .subscribe({
          next: () => console.log('Taller actualizado'),
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

    deletePlan(index: number) {
      const plan = this.planes[index];
      if (!confirm('¿Seguro que quieres eliminar este taller?')) return;
  
      this.http.delete(`http://localhost:3000/api/talleres/${plan.id}`).subscribe(() => {
        this.planes.splice(index, 1);
      });
    } 


    addToCartTaller(plan: any) {
      if (!plan.uuid) plan.uuid = plan.id || crypto.randomUUID();

      const item = {
        uuid: plan.uuid,
        titulo: plan.titulo,
        price: plan.price,
        img: plan.img,
        descripcion: plan.descripcion
      };

      this.cartService.addToCart(item);
    }

}
