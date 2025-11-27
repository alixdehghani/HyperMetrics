
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteService } from '../../core/services/route/route.service';
import { UserNavigationPanel } from '../../shared/formula-input/navigation-panel/navigation-panel';

@Component({
    imports: [
    RouterModule,
    UserNavigationPanel
],
    selector: 'config-layout',
    templateUrl: 'config-layout.html',
    styleUrl: 'config-layout.scss',
})

export class ConfigLayout {    
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