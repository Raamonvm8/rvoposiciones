import { Routes } from '@angular/router';
import { HomepageComponent } from './components/homepage/homepage.component';
import { QuienSoyComponent } from './components/quien-soy/quien-soy.component';
import { LibrosComponent } from './components/libros/libros.component';
import { materialize } from 'rxjs';
import { MaterialesComponent } from './components/materiales/materiales.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' }, //defectous
    { path: 'home', component: HomepageComponent },
    { path: 'quiénsoy', component: QuienSoyComponent},
    { path: 'libros', component: LibrosComponent},
    { path: 'materiales', component: MaterialesComponent},
    { path: 'admin-panel', component: AdminPanelComponent},


];
