import { AfterViewInit, Component } from '@angular/core';
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

}


