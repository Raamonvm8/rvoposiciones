import { NgClass, NgFor, NgStyle } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';

@Component({
  selector: 'app-testimonios',
  imports: [NgFor, NgStyle],
  templateUrl: './testimonios.component.html',
  styleUrl: './testimonios.component.css'
})

export class TestimoniosComponent implements OnInit, OnDestroy {
  @ViewChild('carousel', { static: true }) carouselRef!: ElementRef<HTMLDivElement>;

  testimonios = [
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7382.PNG', alt: 'Testimonio 1' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7383.PNG', alt: 'Testimonio 2' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7384.PNG', alt: 'Testimonio 3' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7385.PNG', alt: 'Testimonio 4' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7386.PNG', alt: 'Testimonio 5' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7387.PNG', alt: 'Testimonio 6' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7388.PNG', alt: 'Testimonio 7' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7390.PNG', alt: 'Testimonio 9' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7391.PNG', alt: 'Testimonio 10' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7392.PNG', alt: 'Testimonio 11' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7393.PNG', alt: 'Testimonio 12' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7394.PNG', alt: 'Testimonio 13' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7395.PNG', alt: 'Testimonio 14' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7396.PNG', alt: 'Testimonio 15' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7398.PNG', alt: 'Testimonio 17' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7400.PNG', alt: 'Testimonio 19' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7401.PNG', alt: 'Testimonio 20' },
    { img: '../../../../assets/homepage/capturas-whatsapp/IMG_7402.PNG', alt: 'Testimonio 21' },
  ];

  // Estado
  currentIndex = 0;
  private intervalId: any = null;

  // Geometría del carrusel 3D
  get stepDeg(): number {
    return 360 / this.testimonios.length;
  }
  private readonly radius = 520;   
  private readonly pxToDeg = 0.25; 

  // Rotación
  private baseRotation = 0;  
  private dragRotation = 0;            
  isDragging = false;
  private startX = 0;
  private animating = false;

  ngOnInit() {
    this.snapToIndex(false);
    this.startAuto();
  }

  ngOnDestroy() {
    this.stopAuto();
  }

  private startAuto() {
    this.stopAuto();
    this.intervalId = setInterval(() => this.next(), 5000);
  }
  private stopAuto() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.testimonios.length;
    this.snapToIndex(true);
  }
  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.testimonios.length) % this.testimonios.length;
    this.snapToIndex(true);
  }

  private snapToIndex(animate: boolean) {
    this.animating = animate;
    this.baseRotation = -this.currentIndex * this.stepDeg;
    this.dragRotation = 0;
    // Desactiva animación en el próximo frame si era temporal
    if (animate) setTimeout(() => (this.animating = false), 1000);

  }

  // ---- Drag (ratón/touch) ----
  onDragStart(e: MouseEvent | TouchEvent) {
    this.stopAuto();
    this.isDragging = true;
    this.animating = false;
    this.startX = this.getX(e);
    this.dragRotation = 0;
  }
  onDragMove(e: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;
    const dx = this.getX(e) - this.startX;
    this.dragRotation = dx * this.pxToDeg; 
  }
  onDragEnd() {
    if (!this.isDragging) return;
    this.isDragging = false;

    // Rotación total tras el drag
    const total = this.baseRotation + this.dragRotation;

    // Cálculo del índice más cercano
    const rawIndex = -total / this.stepDeg;
    const nearestIndex = Math.round(rawIndex);

    // Aseguramos que esté dentro del rango [0, testimonios.length)
    this.currentIndex =
      ((nearestIndex % this.testimonios.length) + this.testimonios.length) %
      this.testimonios.length;

    this.snapToIndex(true);

    // reanuda autoplay
    if (!this.intervalId) this.startAuto();
  }


  private getX(e: MouseEvent | TouchEvent) {
    return e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
  }

  private get totalRotation(): number {
    return this.baseRotation + this.dragRotation;
  }

  // Normaliza ángulos a [-180, 180] para decidir visibilidad/estado
  private normalize180(a: number) {
    let x = ((a + 180) % 360 + 360) % 360 - 180;
    return x;
  }

  // Devuelve estilos por slide: solo 3 visibles (centro, izq, dcha)
  getSlideStyle(index: number) {
    const angle = index * this.stepDeg + this.totalRotation; 
    const delta = this.normalize180(angle);

    const close = this.stepDeg * 0.6;
    let style: any = {
      transition: this.isDragging 
        ? 'none' 
        : 'transform 1s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.5s ease'

    };

    if (Math.abs(delta) < 180) {
      // slide central
      const scale = 1 - Math.abs(delta) / 180 * 0.3; 
      const offsetZ = this.radius - Math.abs(delta) * 2; 
      const offsetX = Math.sin((delta * Math.PI) / 180) * 100; 
      style.transform = `rotateY(${angle}deg) translateX(${offsetX}px) translateZ(${offsetZ}px) scale(${scale})`;
      style.opacity = Math.max(0, 1 - Math.abs(delta)/90); // fade progresivo
      style.zIndex = 3 - Math.floor(Math.abs(delta)/60);
      style.pointerEvents = 'auto';
      style.display = 'block';
    } else if (Math.abs(delta - this.stepDeg) < close) {
      // slide derecha
      const scale = 1 - Math.abs(delta) / 180 * 0.3; 
      const offsetZ = this.radius - Math.abs(delta) * 2;  
      const offsetX = Math.sin((delta * Math.PI) / 180) * 100; 
      style.transform = `rotateY(${angle}deg) translateX(${offsetX}px) translateZ(${offsetZ}px) scale(${scale})`;
      style.opacity = Math.max(0, 1 - Math.abs(delta)/90); 
      style.zIndex = 3 - Math.floor(Math.abs(delta)/60);
      style.pointerEvents = 'auto';
      style.display = 'block';
    } else if (Math.abs(delta + this.stepDeg) < close) {
      // slide izquierda
      const scale = 1 - Math.abs(delta) / 180 * 0.3; 
      const offsetZ = this.radius - Math.abs(delta) * 2;  
      const offsetX = Math.sin((delta * Math.PI) / 180) * 100;
      style.transform = `rotateY(${angle}deg) translateX(${offsetX}px) translateZ(${offsetZ}px) scale(${scale})`;
      style.opacity = Math.max(0, 1 - Math.abs(delta)/90); 
      style.zIndex = 3 - Math.floor(Math.abs(delta)/60);
      style.pointerEvents = 'auto';
      style.display = 'block';
    } else {
      style.opacity = 0;
      style.pointerEvents = 'none';
      style.display = 'none';
    }

    return style;
  }

}