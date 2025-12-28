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
    { titulo: '¿Se puede descargar el material?', respuesta: 'Todo el material que proporciono es completamente descargable, lo que les permite acceder a él en cualquier momento y desde cualquier dispositivo. Es importante destacar que, aunque se pueden descargar estos archivos para su uso personal, no está permitido compartirlos ni redistribuirlos. También, los que adquieran el material, tendrán su sección habilitada en Materiales, donde podrán ver siempre los archivos subidos del material correspondiente.', isOpen: false },
    { titulo: '¿La legislación que se da en el curso a qué comunidad autónoma pertenece?', respuesta: 'Está centrada en la normativa educativa de la Comunidad Autónoma de Canarias. Cada comunidad autónoma en España tiene ciertas competencias en materia educativa, y por tanto puede haber diferencias en cuanto a los decretos, órdenes y normativas específicas que regulan aspectos como el currículo, la organización escolar y los procedimientos administrativos de las oposiciones. Sin embargo, aunque el curso tiene como base la legislación canaria, el conocimiento y los principios que se adquieren son fácilmente transferibles y adaptables a otras comunidades autónomas.', isOpen: false },
    { titulo: '¿Dónde se pueden conseguir tus libros?', respuesta: 'Si eres de Gran Canaria, puedes pedirlo de forma presencial contactando con nosotros, y sino, en el apartado Mis Libros, encontrarás todos mis libros con sus respectivos enlaces a las diferentes tiendas en las que se encuentran disponibles.', isOpen: false },
    { titulo: '¿Cómo accedo a los talleres?', respuesta: 'Una vez que se abone la cantidad que corresponde para un taller, le aparecerá automáticamente una sección con el nombre del taller, donde se subirá el enlace a la videoconferencia, y, en caso de haber documentación relacionada con el taller (grabación del taller, materiales...), también aparecerá ahí', isOpen: false },
    { titulo: '¿Cual sería el horario y los días de los talleres?', respuesta: 'Depende de los grupos. Se impartirá 1 sesión a la semana de 4 horas de duración. En caso de no poder asistir al día y la hora, serán grabadas para poderlas ver cuando mejor les venga, y ésta grabación estará habilitada durante solo 1 mes.', isOpen: false },
  ];

  toggleAnswer(index: number) {
    this.preguntas[index].isOpen = !this.preguntas[index].isOpen;
  }

}