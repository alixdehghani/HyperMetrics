import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouteService } from '../../core/services/route/route.service';

@Component({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    selector: 'config',
    templateUrl: 'config.html',
    styleUrl: 'config.scss',
})

export class Config implements OnInit {
    expandedSections: { [key: string]: boolean } = {};
    showRestoreBanner = false;
    searchTerm: string = '';
    viewMode: 'ui' | 'json' = 'ui';
    routeService = inject(RouteService);
    private _fb = inject(FormBuilder);
    constructor() { }

    ngOnInit(): void {

    }

    onJsonFileUpload(event: any) {

    }

    restoreFromLocalStorage(): void {

    }

    clearLocalStorage(): void {

    }


    toggleSection(section: string) {
        this.expandedSections[section] = !this.expandedSections[section];
    }

    

    setViewMode(mode: 'ui' | 'json') {
        this.viewMode = mode;
    }

    copyJson() {
        const jsonStr = JSON.stringify({}, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            alert("JSON copied to clipboard!");
        }).catch(err => {
            alert("Failed to copy JSON: " + err);
        });
    }

    private _initial(): void {

    }

    private _normalizeData() {


    }

    private _saveToLocalStorage() {

    }


}