import { Component } from '@angular/core';

@Component({
    selector: 'app-quien-soy',
    imports: [],
    templateUrl: './quien-soy.component.html',
    styleUrl: './quien-soy.component.css'
})
export class QuienSoyComponent {

    ngOnInit() {
        window.addEventListener("scroll", () => {
            const img = document.querySelector(".quien-soy.intro .image img") as HTMLElement;
            if (!img) return;

            const offset = window.scrollY * 0.05; // multiplica más o menos para intensidad
            img.style.transform = `translateY(${offset}px) scale(1.02)`; // 👈 se mueve + leve zoom
        });
    }


}
