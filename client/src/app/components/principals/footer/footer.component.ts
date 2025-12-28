import { Component } from '@angular/core';
import { SocialLinksComponent } from '../../social-links/social-links.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [SocialLinksComponent, RouterLink],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.css'
})
export class FooterComponent {
  facebook: string = 'https://www.facebook.com/share/2VMVmo2kRLVvjdfE/?mibextid=K35XfP';
  //twitter: string = 'https://x.com/ludenatura?s=11&t=53afhvyRV-eK66mFMst6vA';
  instagram: string = 'https://www.instagram.com/oposiciones_docentes_sos/';
  youtube: string = 'https://www.youtube.com/@oposicionaeducacionramonva3718/videos';
  //tiktok: string = 'https://www.tiktok.com/@ludenatura?is_from_webapp=1&sender_device=pc';
  //whatsapp: string = 'https://wa.me/34600420871';
}