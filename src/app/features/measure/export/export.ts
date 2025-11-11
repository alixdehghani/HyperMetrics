import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MeasureObj, MeasureType } from '../../../core/interfaces/measures.interfaces';
import { MeasurService } from '../measur.service';

@Component({
    imports: [
        CommonModule
    ],
    selector: 'measure-export',
    templateUrl: 'export.html'
})

export class MeasureExport {
    private measureObject!: MeasureType;
    private measureService = inject(MeasurService);
    showFullscreen = false;
    allErrors: string[] = [];

    close() {
        this.showFullscreen = false;
    }

    open() {
        this.showFullscreen = true;
        const savedJson = this.measureService.getMeasureObject();
        if (savedJson) {
            this.measureObject = savedJson;
            this.allErrors = this.measureService.getAllErrors();
        }
    }

    downloadHyperConfigFiles() {
        const blob = new Blob([JSON.stringify(this.measureObject, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hyper-counter-kpi.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadPropertiesFile(filename = 'counters_kpi_list.properties') {
        const propertiesContent = this._exportToProperties();

        // Create blob and download
        const blob = new Blob([propertiesContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadENodeB() {
        const blob = new Blob([JSON.stringify(this.generateENodeB(), null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'eNodeB_No_Realtime.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadKpiSettingFile() {
        const blob = new Blob([JSON.stringify(this._convertHyperCounterKpiToKpiSetting(), null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kpi_setting.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadDefaultFormulaFile() {
        const blob = new Blob([JSON.stringify(this._convertHyperCounterKpiToDefaultFormulas(), null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'default_kpi_formulas.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    downloadOssE2eTestingFile() {
        const obj: any = {};
        const measureObjList = this.measureObject.measureObjTypeList.flatMap(mType => mType.measureObjList);
        measureObjList.forEach((measureObj: MeasureObj) => {
            obj[measureObj.name] = {
                counters: measureObj.counterList.map(c => ({ name: c.name, isActive: false })),
                kpis: measureObj.kpiList.map(k => ({ name: k.name, isActive: false })),
            }
        });
        obj["timeMode"] = [
            {
                "name": "Continuous",
                "isActive": false,
                "options": null
            },
            {
                "name": "Section Time",
                "isActive": true,
                "options": {
                    "startTime": "12:34",
                    "endTime": "13:30"
                }
            }
        ];
        obj["dateRange"] = [
            {
                "name": "Custom",
                "isActivce": true,
                "startDate": "2025-10-01",
                "endDate": "2025-10-13"
            }
        ];
        const blob = new Blob([JSON.stringify(obj, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'oss-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    private _exportToProperties(): string {

        let propertiesContent = '';
        this.measureObject.measureObjTypeList.forEach(measurObj => {
            // Add measure type
            propertiesContent += `pm.measure.object.type.${this.measureObject.neTypeId}${measurObj.measureObjTypeId}=${measurObj.measureType}\n`;

            // Add all measure object definitions first
            measurObj.measureObjList.forEach(measureObj => {
                propertiesContent += `pm.measure.object.${this.measureObject.neTypeId}${measurObj.measureObjTypeId}${measureObj.measureObjId}=${measureObj.abbreviation.toUpperCase()}\n`;
            });
        });

        this.measureObject.measureObjTypeList.forEach(measurObj => {
            // Process counters
            measurObj.measureObjList.forEach(measureObj => {
                measureObj.counterList.forEach(counter => {
                    const counterId = counter.id
                    propertiesContent += `${counterId}=${counter.name} (${counter.unit})\n`;
                });
            });
        });
        this.measureObject.measureObjTypeList.forEach(measurObj => {
            // Process KPIs
            measurObj.measureObjList.forEach(measureObj => {
                measureObj.kpiList.forEach(kpi => {
                    const kpiId = `K${kpi.kpiId.padStart(10, '0')}`;
                    propertiesContent += `${kpiId}=${kpi.name} (${kpi.unit})\n`;
                });
            });

        });
        return propertiesContent;
    }

    private generateENodeB() {
        const eNodeBStructure = {
            "neVersion": this.measureObject.neVersion,
            "neTypeId": this.measureObject.neTypeId,
            "neTypeName": this.measureObject.neTypeName,
            "measureObjTypeList": this.measureObject.measureObjTypeList.map(mType => ({
                "measureObjTypeId": `${this.measureObject.neTypeId}${mType.measureObjTypeId}`,
                "name": mType.measureType,
                "commAttributes": ["cellId"],
                "commAttributeVals": ["U8"],
                "measureObj": mType.measureObjList.map(mObj => ({
                    "measureObjId": `${this.measureObject.neTypeId}${mType.measureObjTypeId}${mObj.measureObjId}`,
                    "name": mObj.name.trim(),
                    "dataUpPeriodMod": "0",
                    "counterList": mObj.counterList.map(c => c.id),
                    "kpiList": mObj.kpiList.map(k => ({
                        "kpiId": parseInt(k.kpiId),
                        "kpiCounterList": this.measureService.getKpiCounterList(k),
                        "formula": this.measureService.convertFormula(k.formula)
                    }))
                }))
            }))
        };
        return eNodeBStructure;
    }
    private _convertHyperCounterKpiToKpiSetting() {
        // Initialize the result object
        const kpiSetting = {} as any;

        // Process each measureObj in the hyperCounterKpi
        const measureObjList = this.measureObject.measureObjTypeList.flatMap(mType => mType.measureObjList);
        measureObjList.forEach((measureObj: MeasureObj) => {
            const abbreviation = measureObj.abbreviation.replace('-', '');
            const targetKey = abbreviation.toLocaleLowerCase();

            if (targetKey) {
                // Initialize array for this category if it doesn't exist
                kpiSetting[targetKey] = [];

                // Process each counter in the counterList
                measureObj.counterList.forEach(counter => {
                    kpiSetting[targetKey].push({
                        counter_name: counter.name,
                        cumulative: counter.cumulative
                    });
                });
            }
        });

        return kpiSetting;
    }

    private _convertHyperCounterKpiToDefaultFormulas() {
        const defaultFormulas = [] as any[];
        let idCounter = 1;
        // Helper function to parse formula string and convert to array format
        function parseFormulaToArray(formulaString: string): string[] {
            let normalized = formulaString.replace(/\s+/g, ''); // remove all whitespace (spaces, tabs, newlines)
            const tokens = normalized.split(/(\+|\-|\*|\/|\(|\))/g).filter(token => token.trim() !== '');
            return tokens.map(token => token.trim());
        }

        const measureObjList = this.measureObject.measureObjTypeList.flatMap(mType => mType.measureObjList);
        measureObjList.forEach((measureObj: MeasureObj) => {
            const abbreviation = measureObj.abbreviation;
            const subCategory = abbreviation.toUpperCase();

            if (measureObj.kpiList && measureObj.kpiList.length > 0) {
                measureObj.kpiList.forEach(kpi => {
                    const formulaArray = parseFormulaToArray(kpi.formula);
                    const indicator = kpi.indicator.toUpperCase();

                    const defaultKpiFormula = {
                        id: idCounter.toString(),
                        name: kpi.name,
                        title: kpi.title,
                        formula: formulaArray,
                        sub_category: subCategory,
                        type: kpi.unit,
                        unit: kpi.unit === "percent" ? "%" : '',
                        switch_on: true,
                        indicator: indicator
                    };

                    defaultFormulas.push(defaultKpiFormula);
                    idCounter++;
                });
            }
        });

        return defaultFormulas;
    }
}