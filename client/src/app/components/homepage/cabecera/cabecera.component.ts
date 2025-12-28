import { AfterViewInit, Component, HostListener } from '@angular/core';
import videojs from 'video.js';

@Component({
    selector: 'app-cabecera',
    standalone: true,
    imports: [],
    templateUrl: './cabecera.component.html',
    styleUrl: './cabecera.component.css'
})
export class CabeceraComponent implements AfterViewInit{
  videoPlayer: any;

    ngAfterViewInit() {
        this.videoPlayer = videojs('bgVideo', {
            controls: false,
            autoplay: true,
            muted: true,
            loop: true,
        });
    }

    ngOnDestroy() {
        if (this.videoPlayer) {
            this.videoPlayer.dispose();
        }
    }

    @HostListener('window:scroll', [])
    onWindowScroll() {
        const scrollY = window.scrollY;
        const image = document.querySelector('.image img') as HTMLElement;

        if (image) {
        // Calcula desplazamiento sutil (ej: máx. 20px)
        const offset = Math.min(scrollY * 0.3, 20);
        image.style.transform = `translateY(${offset}px)`;
        }
    }

}


