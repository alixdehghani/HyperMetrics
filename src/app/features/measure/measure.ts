import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    imports: [
        CommonModule,
        RouterModule
    ],
    selector: 'measure',
    templateUrl: 'measure.html',
    styleUrl: 'measure.scss',
})

export class Measure implements OnInit {
    constructor() { }

    ngOnInit() { }
}