import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from "./components/principals/header/header.component";
import { FooterComponent } from "./components/principals/footer/footer.component";
import { HttpClientModule } from '@angular/common/http';

import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { HomepageComponent } from './components/homepage/homepage.component';
import { NgIf } from '@angular/common';



@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, FooterComponent, NgIf],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'rvoposiciones';

  cookiesDecision: 'accepted' | 'rejected' | null = null;

  ngOnInit() {
    const decision = localStorage.getItem('cookiesDecision');
    if (decision === 'accepted' || decision === 'rejected') {
      this.cookiesDecision = decision as 'accepted' | 'rejected';
    }
  }

  acceptCookies() {
    this.cookiesDecision = 'accepted';
    localStorage.setItem('cookiesDecision', 'accepted');
    // Aquí puedes inicializar scripts de terceros, como Analytics
  }

  rejectCookies() {
    this.cookiesDecision = 'rejected';
    localStorage.setItem('cookiesDecision', 'rejected');
    // Bloquear scripts de terceros si se usan
  }
  
}

