import { NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule, NgModel } from '@angular/forms';

interface UploadedFile {
  title: string;
  fileNameOriginal: string;
  filename: string;
  url: string; 
  extension: string;
  isEditing?: boolean;     
  newFileName?: string;
}

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [FormsModule, NgFor, NgIf],
  templateUrl: './materiales.component.html',
  styleUrl: './materiales.component.css'
})
export class MaterialesComponent {
  selectedFile: File | null = null; 
  moduleTitle: string = '';
  uploadedFiles: { [recurso: string]: UploadedFile[] } = {};

  recursos: { id: number, name: string, isEditing: boolean, originalName: string, isExpanded: boolean }[] = [
    { id: 1, name: 'Recurso 1', isEditing: false, originalName: 'Recurso 1', isExpanded: true }
  ];

  constructor(private http: HttpClient) {}


  onFileSelected(event: Event, recurso: { id: number }) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
  
      // Aquí puedes manejar el recurso si es necesario
      console.log('Recurso seleccionado:', recurso.id);
    }
  }
  
  editFileName(file: UploadedFile) {
    file.isEditing = true;
    file.newFileName = file.fileNameOriginal; // Inicializa el nuevo nombre con el nombre original
  }

  // Función para guardar el nuevo nombre del archivo
  saveFileName(file: UploadedFile, recursoName: string) {
    const oldFileName = file.filename;  // Aquí usamos el nombre generado en el backend
    const newFileName = file.newFileName || file.fileNameOriginal;  // Nuevo nombre o el nombre original
    
    this.http.post('http://localhost:3000/api/update', {
      recursoName,
      oldFileName,
      newFileName
    }).subscribe(response => {
      console.log('Nombre del archivo actualizado:', response);
      file.fileNameOriginal = newFileName;  // Actualiza el nombre visible
      file.newFileName = undefined;
      //file.url = `http://localhost:3000/uploads/${oldFileName}`;  // Actualiza la URL con el nuevo nombre
      file.isEditing = false;
    }, error => {
      console.error('Error al actualizar el nombre del archivo:', error);
    });
  }
  
  

  addRecurso() {
    const newRecurso = { 
      id: this.recursos.length + 1,  // Generar un ID único
      name: `Recurso ${this.recursos.length + 1}`, 
      isEditing: false, 
      originalName: `Recurso ${this.recursos.length + 1}`, 
      isExpanded: true 
    };
    this.recursos.push(newRecurso);
  }
  

  deleteRecurso(recurso: any) {
    const confirmDelete = confirm("¿Seguro que quieres eliminar este apartado?");

    if(confirmDelete){
      this.http.delete(`http://localhost:3000/api/delete/recurso/${recurso.id}`).subscribe (
        response => {
          console.log("recurso eliminado");

          //eliminar en frontend
          this.recursos = this.recursos.filter(r => r !== recurso);

          //eliminar los archivos del recurso
          for(let uploaded of this.uploadedFiles[recurso.id]){
            console.log(recurso.recursoName);
            this.deleteFile(recurso.id, uploaded);
          }
          delete this.uploadedFiles[recurso.id];
        },
        error => {
          console.error("Error al eliminar el recurso:", error);
        }
      )
    }
  }

  // Cambiar a modo edición
  editRecurso(recurso: { name: string, isEditing: boolean }) {
    recurso.isEditing = true;
  }

  // Guardar el título editado
  saveRecurso(recurso: { name: string, isEditing: boolean }) {
    recurso.isEditing = false;
  }

  cancelEdit(recurso: { name: string, isEditing: boolean, originalName: string }) {
    recurso.name = recurso.originalName; // Restaurar el nombre original
    recurso.isEditing = false;
  }

  onUpload(recurso: { id: number }) {
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('file', this.selectedFile, this.selectedFile.name);
      formData.append('title', this.moduleTitle);
  
      this.http.post('http://localhost:3000/api/upload', formData)
        .subscribe((response: any) => {
          console.log('Archivo subido:', response);
  
          // Asegurarse de que el recurso tiene su array de archivos
          if (!this.uploadedFiles[recurso.id]) {
            this.uploadedFiles[recurso.id] = [];
          }
  
          // Agregar archivo subido al recurso correspondiente con la URL y el nuevo nombre
          this.uploadedFiles[recurso.id].push({
            title: this.moduleTitle,
            fileNameOriginal: response.file.originalName, // Aquí usamos el nuevo nombre del archivo
            url: response.file.url, // Aquí seguimos usando la URL
            filename: response.file.name,
            extension: response.file.extension
          });
  
          // Limpiar formulario
          this.moduleTitle = '';
          this.selectedFile = null;
        }, error => {
          console.error('Error al subir el archivo:', error);
        });
    } else {
      console.error('No se ha seleccionado ningún archivo.');
    }
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

  deleteFile(recursoId: number, file: UploadedFile) {
    const filename = file.filename; // Aquí usamos el nombre del archivo generado
    this.http.delete(`http://localhost:3000/api/delete/${filename}`)
      .subscribe(() => {
        console.log('Archivo eliminado exitosamente');
  
        // Eliminar el archivo de uploadedFiles
        this.uploadedFiles[recursoId] = this.uploadedFiles[recursoId].filter(f => f.filename !== file.filename);
      }, error => {
        console.error('Error al eliminar el archivo:', error);
      });
  }

}
