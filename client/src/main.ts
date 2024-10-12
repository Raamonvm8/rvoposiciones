import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { HeaderComponent } from './app/components/principals/header/header.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));


