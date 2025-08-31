import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';

@Component({
    selector: 'app-preguntas',
    standalone: true,
    imports: [NgFor, NgIf],
    templateUrl: './preguntas.component.html',
    styleUrl: './preguntas.component.css'
})
export class PreguntasComponent {
  preguntas = [
    { titulo: '¿Se puede descargar el material?', respuesta: 'Todo el material que proporciono tanto para los miembros del curso como para los que lo adquieren de forma individual, es completamente descargable, lo que les permite acceder a él en cualquier momento y desde cualquier dispositivo. Es importante destacar que, aunque se pueden descargar estos archivos para su uso personal, no está permitido compartirlos ni redistribuirlos.', isOpen: false },
    { titulo: '¿La legislación que se da en el curso a qué comunidad autónoma pertenece?', respuesta: 'Está centrada en la normativa educativa de la Comunidad Autónoma de Canarias. Cada comunidad autónoma en España tiene ciertas competencias en materia educativa, y por tanto puede haber diferencias en cuanto a los decretos, órdenes y normativas específicas que regulan aspectos como el currículo, la organización escolar y los procedimientos administrativos de las oposiciones. Sin embargo, aunque el curso tiene como base la legislación canaria, el conocimiento y los principios que se adquieren son fácilmente transferibles y adaptables a otras comunidades autónomas.', isOpen: false },
    { titulo: '¿Dónde se pueden conseguir tus libros?', respuesta: 'Respuesta a la pregunta 3.', isOpen: false },
    { titulo: '¿Qué duración tienen los cursos y los talleres?', respuesta: 'Los cursos tienen una duración de 8 meses (de ... a ...), una vez que finalice se abrirán las plazas para inscribirse al siguiente curso de nuevo. Los talleres son de 3 horas cada uno.', isOpen: false },
    { titulo: '¿Cual sería el horario y los días?', respuesta: 'Depende de los grupos. Se impartirá 1 sesión a la semana de 3 horas de duración. En caso de no poder asistir al día y la hora, serán grabadas para poderlas ver cuando mejor les venga, y ésta grabación estará habilitada durante solo 1 mes.', isOpen: false },
  ];

  toggleAnswer(index: number) {
    this.preguntas[index].isOpen = !this.preguntas[index].isOpen;
  }

}
