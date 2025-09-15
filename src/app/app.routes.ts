import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'measure',
        loadChildren: () => import('./features/measure/measure-pages').then(m => m.measureRoutes)
    },
    {
        path: '**',
        redirectTo: 'measure'
    },
    {
        path: '',
        redirectTo: 'measure',
        pathMatch: 'full'
    }
];
