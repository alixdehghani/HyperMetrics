import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'home',
        loadChildren: () => import('./features/home/home-pages').then(m => m.homeRoutes)
    },
    {
        path: 'measurement-type-config',
        loadChildren: () => import('./features/measure/measure-pages').then(m => m.measureRoutes)
    },
    {
        path: 'config',
        loadChildren: () => import('./features/config/config-pages').then(m => m.configRoutes)
    },
    {
        path: '**',
        redirectTo: 'home'
    },
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    }
];
