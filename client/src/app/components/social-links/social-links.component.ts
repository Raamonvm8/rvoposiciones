import { NgClass, NgIf, NgStyle } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-social-links',
    standalone: true,
    imports: [NgIf, NgClass],
    templateUrl: './social-links.component.html',
    styleUrl: './social-links.component.css'
})
export class SocialLinksComponent {
  @Input() facebook: string | undefined;
  @Input() twitter?: string;
  @Input() instagram?: string;
  @Input() youtube?: string;
  @Input() whatsapp?: string;

  @Input() colorClass: string = 'white';

  @Input() muestraWhats?: boolean = true;

}
