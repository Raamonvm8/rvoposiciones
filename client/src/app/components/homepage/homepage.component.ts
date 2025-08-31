import { Component } from '@angular/core';
import { CabeceraComponent } from "./cabecera/cabecera.component";
import { Cuerpo1Component } from "./cuerpo1/cuerpo1.component";
import { FondoComponent } from "../fondo/fondo.component";
import { PreguntasComponent } from "./preguntas/preguntas.component";
import { TestimoniosComponent } from './testimonios/testimonios.component';

@Component({
    selector: 'app-homepage',
    standalone: true,
    imports: [CabeceraComponent, Cuerpo1Component, FondoComponent, PreguntasComponent, TestimoniosComponent],
    templateUrl: './homepage.component.html',
    styleUrl: './homepage.component.css'
})
export class HomepageComponent {

  constructor() {
    console.log('HomepageComponent loaded');
  }
}
