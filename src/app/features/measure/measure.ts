import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MeasureObj, MeasureObjType, MeasureType } from '../../core/interfaces/measures.interfaces';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MeasurService } from './measur.service';
import { MeasureExport } from './export/export';
import { RouteService } from '../../core/services/route/route.service';

@Component({
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        ReactiveFormsModule,
        MeasureExport
    ],
    selector: 'measure',
    templateUrl: 'measure.html',
    styleUrl: 'measure.scss',
})

export class Measure implements OnInit {
    expandedSections: { [key: string]: boolean } = {};
    showRestoreBanner = false;
    measureObject!: MeasureType;
    measurementsData: MeasureObjType[] = [];
    filteredMeasurementsData: MeasureObjType[] = [];
    searchTerm: string = '';
    addingNewMeasure: boolean = false;
    newMeasureForm!: FormGroup;
    viewMode: 'ui' | 'json' = 'ui';
    measureTypeListOveralViewObject: { [key: string]: { coutersLength: number, kpisLength: number, errorsLength: number, measureObjectsLength: number } } = {};
    routeService = inject(RouteService);
    private _fb = inject(FormBuilder);
    private _measureService = inject(MeasurService);
    constructor() { }

    ngOnInit(): void {
        const savedJson = this._measureService.getMeasureObject();
        if (savedJson) {
            this.showRestoreBanner = true;
            this.restoreFromLocalStorage();
        }
    }

    onJsonFileUpload(event: any) {
        if (this._measureService.getMeasureObject()) {
            if (!confirm("Are you sure you want to upload a new JSON file? This will replace the current data. Unsaved changes will be lost.")) {
                return;
            }
        }
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const data = JSON.parse(e.target.result);
                this.measureObject = data;
                this.measurementsData = [...data.measureObjTypeList];
                this._initial();
                this._normalizeData();
            } catch (err) {
                console.error("❌ Invalid JSON file", err);
                alert("The uploaded file is not a valid JSON.");
            }
        };
        reader.readAsText(file);
    }

    restoreFromLocalStorage(): void {
        const savedJson = this._measureService.getMeasureObject()
        if (savedJson) {
            this.measureObject = savedJson;
            this.measureObject.measureObjTypeList.forEach((measureObjData) => {
                const savedMeasureJson = this._measureService.getMeasureTypeById(measureObjData.measureObjTypeId)
                if (savedMeasureJson) {
                    Object.assign(measureObjData, savedMeasureJson);
                }
            });
            this.measurementsData = this.measureObject.measureObjTypeList;
            this.showRestoreBanner = false;
            this._normalizeData();
        }
    }

    clearLocalStorage(): void {
        this._measureService.clearLocalStorage();
        this.showRestoreBanner = false;
    }

    getCounterLength(measureObj: MeasureObj): number {
        return measureObj.counterList.length;
    }

    getKpiLength(measureObj: MeasureObj): number {
        return measureObj.kpiList.length;
    }

    deleteMeasure(measure: MeasureObjType) {
        const confirmed = confirm(`Are you sure you want to delete the measure "${measure.measureType}"? This action cannot be undone.`);
        if (!confirmed) return;

        // remove any per-measure localStorage entry
        this._measureService.removeTypeObjFromStorageById(measure.measureObjTypeId)
        this.measurementsData.splice(this.measurementsData.indexOf(measure), 1);
        this._normalizeData();
    }

    toggleSection(section: string) {
        this.expandedSections[section] = !this.expandedSections[section];
    }

    filterMeasurements() {
        if (!this.searchTerm) {
            this.filteredMeasurementsData = [...this.measurementsData];
        } else {
            const lowerSearchTerm = this.searchTerm.toLowerCase();
            this.filteredMeasurementsData = this.measurementsData.filter(measurement =>
                measurement.measureObjTypeId.toLowerCase().includes(lowerSearchTerm)
            );
        }
    }
    startAddingNewMeasure() {
        if (this.addingNewMeasure) {
            return; // already adding
        }
        this.newMeasureForm = this._fb.group({
            measureType: ['', [Validators.required]],
            measureObjList: this._fb.array([]),
            measureObjTypeId: ['']
        });
        this.addingNewMeasure = true;
    }

    confirmAddNewMeasure() {
        if (!this.newMeasureForm) return;
        if (this.newMeasureForm.invalid) {
            alert("Please fill in all required fields for the new measure ect.");
            return;
        }
        const newMeasur: MeasureObjType = {
            measureType: this.newMeasureForm.value.measureType,
            measureObjList: [],
            measureObjTypeId: this.newMeasureForm.value.measureObjTypeId
        };
        // Validate name uniqueness
        const nameErrors = this._measureService.validateNewMeasureObjTypeName(newMeasur);
        if (nameErrors.length > 0) {
            alert("❌ Invalid measure ect name or abbreviation:\n" + nameErrors.join('\n'));
            return;
        }
        // Validate ID uniqueness
        if (this.newMeasureForm.value.measureObjTypeId) {
            const idErrors = this._measureService.validateNewMeasureObjTypeId(newMeasur);
            if (idErrors.length > 0) {
                alert("❌ Invalid measure ect ID:\n" + idErrors.join('\n'));
                return;
            }
        }
        this.measurementsData.push(newMeasur);
        this._normalizeData();
        this.addingNewMeasure = false;
        this.newMeasureForm = new FormGroup({});
    }

    cancelAddNewMeasure() {
        this.addingNewMeasure = false;
        this.newMeasureForm = new FormGroup({});
    }

    onMeasureTitleEditClick(measure: MeasureObjType) {
        const newTitle = prompt("Enter new measure ect title:", measure.measureType);
        if (newTitle === null || newTitle.trim() === '') {
            return; // cancelled or empty
        }
        const tempMeasure = { ...measure, measureType: newTitle.trim() };
        const nameErrors = this._measureService.validateNewMeasureObjTypeName(tempMeasure);
        if (nameErrors.length > 0) {
            alert("❌ Invalid measure ect name:\n" + nameErrors.join('\n'));
            return;
        }
        measure.measureType = newTitle.trim();
        this._normalizeData();
    }

    setViewMode(mode: 'ui' | 'json') {
        this.viewMode = mode;
    }

    copyJson() {
        const jsonStr = JSON.stringify(this.measurementsData, null, 2);
        navigator.clipboard.writeText(jsonStr).then(() => {
            alert("JSON copied to clipboard!");
        }).catch(err => {
            alert("Failed to copy JSON: " + err);
        });
    }

    private _initial(): void {
        this.measureObject.measureObjTypeList.forEach(mobjt => mobjt.measureObjList.forEach(obj => {
            obj.measureObjId = this._measureService.getMeasureObjId(obj, this.measureObject.measureObjTypeList)!
            obj.counterList.forEach(counter => {
                counter.id = this._measureService.getCounterId(counter, this.measureObject.measureObjTypeList)!
            });
            obj.kpiList.forEach(kpi => {
                kpi.kpiId = this._measureService.getKpiId(kpi, this.measureObject.measureObjTypeList)!;
            })
        }))
    }

    private _normalizeData() {
        this.measurementsData.forEach(measureObjData => {
            measureObjData.measureObjTypeId = this._measureService.getMeasureObjTypeId(measureObjData, this.measurementsData)!;
            this.measureTypeListOveralViewObject[measureObjData.measureObjTypeId] = {
                coutersLength: measureObjData.measureObjList.flatMap(mol => mol.counterList).length,
                kpisLength: measureObjData.measureObjList.flatMap(mol => mol.kpiList).length,
                measureObjectsLength: measureObjData.measureObjList.length,
                errorsLength: this._measureService.getAllMeasureObjecErrors(measureObjData.measureObjList).length
            }
        });
        this.filteredMeasurementsData = [...this.measurementsData];
        this._saveToLocalStorage();

    }

    private _saveToLocalStorage() {
        this.routeService.isLoadingRoute.set(true);
        requestIdleCallback(() => {
            this.measurementsData.forEach((measureObjData) => {
                this._measureService.addTypeObjIntoLocalStorageById(measureObjData.measureObjTypeId, measureObjData);
            });
            this._measureService.saveMainObjectIntoLocalStorage(this.measureObject);
            this.routeService.isLoadingRoute.set(false);
        });
    }


}