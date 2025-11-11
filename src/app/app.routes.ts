import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'measurement-type-config',
        loadChildren: () => import('./features/measure/measure-pages').then(m => m.measureRoutes)
    },
    {
        path: '**',
        redirectTo: 'measurement-type-config'
    },
    {
        path: '',
        redirectTo: 'measurement-type-config',
        pathMatch: 'full'
    }
];
