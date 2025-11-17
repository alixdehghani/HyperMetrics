import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteService } from '../../core/services/route/route.service';
import { UserNavigationPanel } from '../../shared/formula-input/navigation-panel/navigation-panel';

@Component({
    imports: [
        CommonModule,
        RouterModule,
        UserNavigationPanel
    ],
    selector: 'home-layout',
    templateUrl: 'home-layout.html',
    styleUrl: 'home-layout.scss',
})

export class HomeLayout {    
    routeService = inject(RouteService);
    navItems = signal([
        {
            name: 'Home',
            url: '/home',
            image: 'house-fill.png'
        },
        {
            name: 'Hyper Measure',
            url: '/measurement-type-config',
            image: 'measure.png'
        },
        {
            name: 'Hyper Config',
            url: '/config',
            image: 'config.png'
        }
    ])
}