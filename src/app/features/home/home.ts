
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteService } from '../../core/services/route/route.service';

@Component({
    imports: [
    RouterModule
],
    selector: 'home',
    templateUrl: 'home.html',
    styleUrl: 'home.scss',
})

export class Home implements OnInit {
    routeService = inject(RouteService);
    projects = signal([
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
    constructor() { }

    ngOnInit(): void {

    }
}