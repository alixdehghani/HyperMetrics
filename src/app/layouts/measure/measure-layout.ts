import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    imports: [
        CommonModule,
        RouterModule
    ],
    selector: 'measure-layout',
    templateUrl: 'measure-layout.html',
    styleUrl: 'measure-layout.scss',
})

export class MeasureLayout implements OnInit {
    constructor() { }

    ngOnInit() { }
}