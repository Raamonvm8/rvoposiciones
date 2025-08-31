import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from "./components/principals/header/header.component";
import { FooterComponent } from "./components/principals/footer/footer.component";
import { HttpClientModule } from '@angular/common/http';

import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { HomepageComponent } from './components/homepage/homepage.component';



@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent, FooterComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'rvoposiciones';

  
}

