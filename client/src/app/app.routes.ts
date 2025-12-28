import { Routes } from '@angular/router';
import { HomepageComponent } from './components/homepage/homepage.component';
import { QuienSoyComponent } from './components/quien-soy/quien-soy.component';
import { LibrosComponent } from './components/libros/libros.component';
import { materialize } from 'rxjs';
import { MaterialesComponent } from './components/materiales/materiales.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { CompraMaterialComponent } from './components/compras/compra-material/compra-material.component';
import { TalleresComponent } from './components/talleres/talleres.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' }, //defectous
    { path: 'home', component: HomepageComponent },
    { path: 'quiénsoy', component: QuienSoyComponent},
    { path: 'libros', component: LibrosComponent},
    { path: 'materiales', component: MaterialesComponent},
    { path: 'talleres', component: TalleresComponent},
    { path: '6278ed5s43sf23fevsn82-rdyrw5ym-ad112q-w334r-w2jshgfq2uei8dygw-dshbvacwujfnbwt5', component: AdminPanelComponent},
    { path: 'compra/:topic', component: CompraMaterialComponent },


];
