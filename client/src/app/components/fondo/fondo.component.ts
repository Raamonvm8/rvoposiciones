import { CommonModule, NgIf } from '@angular/common';
import { Component, Input, SimpleChanges, input } from '@angular/core';

@Component({
  selector: 'app-fondo',
  standalone: true,
  imports: [NgIf, CommonModule],
  templateUrl: './fondo.component.html',
  styleUrl: './fondo.component.css'
})
export class FondoComponent {
  @Input() section: string | undefined;

  haySection: boolean = false;

 
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['section']) {
      this.checkSection();
    }
  }

  private checkSection(): void {
    this.haySection = !!this.section && this.section.trim() !== "";
  }


}
