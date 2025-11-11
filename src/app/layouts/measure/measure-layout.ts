import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouteService } from '../../core/services/route/route.service';

@Component({
    imports: [
        CommonModule,
        RouterModule
    ],
    selector: 'measure-layout',
    templateUrl: 'measure-layout.html',
    styleUrl: 'measure-layout.scss',
})

export class MeasureLayout {    
    routeService = inject(RouteService);
}