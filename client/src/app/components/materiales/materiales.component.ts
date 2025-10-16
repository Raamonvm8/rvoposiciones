import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, Firestore, getDoc } from 'firebase/firestore';
import { use } from 'video.js/dist/types/tech/middleware';
import { DB } from '../../../environments/environment';
import { Route, Router } from '@angular/router';
import { ModalRegisterLoginService } from '../../services/modal-register-login.service';
import { combineLatest } from 'rxjs';


interface UploadedFile {
  id?: number;
  title: string;
  fileNameOriginal: string;
  filename: string;
  url: string; 
  extension: string;
  isEditing?: boolean;     
  newFileName?: string;
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
    selector: 'app-materiales',
    standalone: true,
    imports: [FormsModule, NgFor, NgIf, NgClass],
    templateUrl: './materiales.component.html',
    styleUrl: './materiales.component.css'
})
export class MaterialesComponent implements OnInit{
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

  constructor(private http: HttpClient, private modalRegisterLogin: ModalRegisterLoginService, private router: Router, private cd: ChangeDetectorRef) {
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
        // Si no hay usuario, cargar recursos genéricos
        this.loadRecursos();
      }
      this.http.get('http://localhost:3000/api/materiales').subscribe((res: any) => {
        this.planes = res.map((p: any) => ({
          ...p,
          visible: p.visible ?? false 
        }));
      });

    });
  }



  loadRecursos() {
    this.http.get('http://localhost:3000/api/recursos').subscribe((res: any) => {
      let userMateriales = this.userData?.materiales;
      console.log('✅ Datos del usuario antes de filtrar:', this.userData);
      console.log('Materiales del usuario:', this.userData?.materiales);
      console.log('Tipo de materiales:', typeof this.userData?.materiales);

      if (typeof userMateriales === 'string') {
        try {
          userMateriales = JSON.parse(userMateriales);
        } catch (e) {
          console.warn('No se pudo parsear materiales:', e);
          userMateriales = [];
        }
      }

      this.recursos = res
        .filter((r: any) => {
          const userMateriales = Array.isArray(this.userData?.materiales)
            ? this.userData.materiales
            : [];

          // Normalizamos ambas partes para evitar errores por espacios o mayúsculas
          const materialType = (r.material_type || '').trim();
          const match = userMateriales.some((m: string) => m.trim() === materialType);

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


  get userHasPrimaria(): boolean {
    return this.userData?.materiales?.includes('Primaria') ?? false;
  }

  get userHasPT(): boolean {
    return this.userData?.materiales?.includes('PT') ?? false;
  }

  get isLogged(): boolean {
    return !!this.user;
  }

  handleBuy(materialUuid: string) {
    if (!this.isLogged) {
      this.redirectToRegister(materialUuid);
    } else {
      this.redirectToCompra(materialUuid);
    }
  }

  redirectToRegister(materialUuid: string) {
    this.modalRegisterLogin.setPendingBuy(materialUuid);
    this.modalRegisterLogin.openLogin();
  }

  onRegisterSuccess() {
    this.modalRegisterLogin.closeRegister();

    // Esperar un tick para que Firebase actualice el estado del usuario
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

  onFileSelected(event: any, recurso: any) {
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

    this.http.put(`http://localhost:3000/api/archivo/${file.id}`, { newName })
      .subscribe(() => {
        file.fileNameOriginal = newName;
        file.newFileName = undefined;
        file.isEditing = false;
      }, error => console.error('Error actualizando archivo:', error));
  }


  addRecurso() {
    if (!this.planes.length) {
      alert("No hay materiales disponibles para asociar.");
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

    this.http.post('http://localhost:3000/api/recurso', newRecurso)
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

    this.http.delete(`http://localhost:3000/api/recurso/${recurso.id}`)
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

    this.http.put(`http://localhost:3000/api/recurso/${recurso.id}`, payload)
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
    formData.append('title', this.moduleTitle);

    this.http.post(`http://localhost:3000/api/upload/${recurso.id}`, formData)
      .subscribe({
        next: (response: any) => {
          if (!recurso.archivos) recurso.archivos = [];
          recurso.archivos.push({
            id: response.file.id,
            title: this.moduleTitle,
            fileNameOriginal: response.file.original_name || response.file.originalName,
            filename: response.file.file_name,
            url: response.file.url,
            extension: response.file.extension
          });

          recurso.selectedFile = undefined;
          recurso.selectedFileName = undefined;
          this.moduleTitle = '';
        },
        error: err => console.error('Error al subir archivo:', err)
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
      case '.ppt':
      case '.pptx':
        return 'assets/icons/ppt-icon.png';  // Icono de PowerPoint
      // Agrega más extensiones según lo que necesites
      default:
        return 'assets/icons/default-icon.png';  // Icono genérico para otros tipos
    }
  }

  toggleRecurso(recurso: any) {
    recurso.isExpanded = !recurso.isExpanded; // Alterna el estado de expansión
  }

  deleteFile(recurso: Recurso, file: any) {
    this.http.delete(`http://localhost:3000/api/archivo/${file.id}`)
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

    this.http.put(`http://localhost:3000/api/materiales/${plan.id}`, payload)
      .subscribe({
        next: () => console.log('Material actualizado'),
        error: err => console.error('Error actualizando material:', err)
      });
  }


  toggleVisible(plan: any) {
    plan.visible = !plan.visible;

    // Llama al backend para guardarlo
    this.http.put(`http://localhost:3000/api/materiales/${plan.id}`, {
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
      titulo: 'Nuevo material',
      descripcion: 'Descripción del nuevo material...',
      img: 'assets/icons/default-icon.png',
      price: 50
    };

    this.http.post('http://localhost:3000/api/materiales', nuevo).subscribe((res: any) => {
        this.planes.push({ ...res, uuid: res.uuid || crypto.randomUUID(), visible: false });
    });

  }


  onImageSelected(event: any, plan: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    this.http.post(`http://localhost:3000/api/materiales/upload/${plan.id}`, formData)
      .subscribe({
        next: (res: any) => {
          plan.img = res.url; // ✅ URL completa
        },
        error: (err) => console.error('Error subiendo imagen:', err)
      });
  }



  deletePlan(index: number) {
    const plan = this.planes[index];
    if (!confirm('¿Seguro que quieres eliminar este material?')) return;

    this.http.delete(`http://localhost:3000/api/materiales/${plan.id}`).subscribe(() => {
      this.planes.splice(index, 1);
    });
  }



}
