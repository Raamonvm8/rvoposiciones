import { NgFor } from '@angular/common';
import { Component, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';

@Component({
    selector: 'app-cuerpo1',
    standalone: true,
    imports: [NgFor],
    templateUrl: './cuerpo1.component.html',
    styleUrl: './cuerpo1.component.css'
})

export class Cuerpo1Component implements AfterViewInit{

    constructor(private el: ElementRef, private renderer: Renderer2) {}

    ngAfterViewInit() {
        const title = this.el.nativeElement.querySelector('.hero-content h1');
        const highlight = this.el.nativeElement.querySelector('.highlight');
        const button = this.el.nativeElement.querySelector('.cta-button');
        const cards = this.el.nativeElement.querySelectorAll('.feature-card');

        const observer = new IntersectionObserver(
            (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                this.renderer.addClass(entry.target, 'visible');
                } else {
                this.renderer.removeClass(entry.target, 'visible');
                }
            });
            },
            { threshold: 0.2 }
        );

        if (title) observer.observe(title);
        if (highlight) observer.observe(highlight);
        if (button) observer.observe(button);
        cards.forEach((card: Element) => observer.observe(card));
    }

    cards = [
    {
      img: '../../../../assets/homepage/pqyo.png',
      alt: 'Clase Presencial',
      title: '¿POR QUÉ CONMIGO?',
      text: 'Grupos reducidos, asesoramiento personalizado e individual además de clases colectivas. Exigencia, motivación y compromiso con tu éxito. Infinidad de aprobados con plaza.'
    },
    {
      img: '../../../../assets/homepage/iconoOnline.png',
      alt: 'Material de Estudio',
      title: 'MODALIDAD DE LAS CLASES',
      text: 'Modalidad 100% online disponible para todas las comunidades autónomas. Ninguna cuarentena más podrá con tu plaza.'
    },
    {
      img: '../../../../assets/homepage/iconoMateriales.png',
      alt: 'Simulacros de Examen',
      title: 'MATERIALES',
      text: 'Se pueden adquirir sin acceso al curso, en la sección de materiales. Se ofrecen temarios actualizados y recursos opcionales: programación, situaciones de aprendizaje, supuestos prácticos y más.'
    },
    {
      img: '../../../../assets/homepage/iconoTalleres.png',
      alt: 'Asesoramiento Personalizado',
      title: 'TALLERES',
      text: 'Puedes asistir a ellos sin estar inscrito en el curso. Talleres prácticos sobre programación, PEP, planes de trabajo y supuestos prácticos.'
    }
  ];

}
