import { inject, Injectable } from "@angular/core";
import { FormulaParserService } from "../../core/helper/formula-helper";
import { Counter, KPI, MeasureObj, MeasureObjType, MeasureType } from "../../core/interfaces/measures.interfaces";

@Injectable({ providedIn: 'root' })

export class MeasurService {
    private measureObjectKey = 'hyper_measure';
    // private measureObjPrefix = 'hyper_measure_';
    private formulaParser = inject(FormulaParserService);
    private measureObject!: MeasureType;

    getMeasureObject(): MeasureType | null {
        const savedJson = localStorage.getItem(this.measureObjectKey);
        if (savedJson) {
            this.measureObject = JSON.parse(savedJson);
        }
        return this.measureObject;
    }

    getMeasureObjTypeId(measureObjType: MeasureObjType, source: MeasureObjType[]): string | null {
        if (measureObjType.measureObjTypeId) {
            return measureObjType.measureObjTypeId;
        } else {
            return this.generateMeasureObjTypeId(source);
        }
    }

    getMeasureObjId(measureObj: MeasureObj, source: MeasureObjType[]): string | null {
        if (measureObj.measureObjId) {
            return measureObj.measureObjId;
        } else {
            return this.generateMeasureObjId(source);
        }
    }

    getCounterId(counter: Counter, source: MeasureObjType[]): string | null {
        if (counter.id) {
            return counter.id;
        } else {
            return this.generateCounterId(source);
        }
    }

    getKpiId(kpi: KPI, source: MeasureObjType[]): string | null {
        if (kpi.kpiId) {
            return kpi.kpiId
        } else {
            return this.generateKpiId(source);
        }
    }

    getNewMeasureObjId(): string | null {
        const source = this.getMeasureObject()?.measureObjTypeList!
        return this.generateMeasureObjId(source);
    }

    getNewCounterId(): string | null {
        const source = this.getMeasureObject()?.measureObjTypeList!
        return this.generateCounterId(source);
    }

    getNewKpiId(): string | null {
        const source = this.getMeasureObject()?.measureObjTypeList!
        return this.generateKpiId(source);
    }

    validateNewMeasureObjTypeName(measure: MeasureObjType): string[] {
        const measureObject = this.getMeasureObject()!;
        const errors: string[] = [];
        if (!measure.measureType || measure.measureType.trim() === '') {
            errors.push("measure type is required.");
        }
        const existingNames = measureObject.measureObjTypeList.map(m => m.measureType);
        if (existingNames.some(existingName => existingName === measure.measureType)) {
            errors.push(`${measure.measureType} is already used by another measure objects. measure objects names must be unique.`);
        }
        return errors;
    }

    validateNewMeasureObjTypeId(measure: MeasureObjType): string[] {
        const measureObject = this.getMeasureObject()!;
        const errors: string[] = [];
        if (!measure.measureObjTypeId || measure.measureObjTypeId.trim() === '') {
            errors.push("measureObjType ID is required.");
        }
        const existingIds = measureObject.measureObjTypeList.map(m => m.measureObjTypeId);
        if (existingIds.some(existingId => existingId === measure.measureObjTypeId)) {
            errors.push(`${measure.measureObjTypeId} is already used by another measure objects. measure objects IDs must be unique.`);
        }
        return errors;
    }

    getAllMeasureTypeErrors(measureTypes: MeasureObjType[]): string[] {
        const errors: string[] = [];
        measureTypes.forEach(mType => {
            errors.push(...this.validateMeasureType(mType));
        });
        return errors;
    }

    getAllMeasureObjecErrors(measureObjs: MeasureObj[]): string[] {
        const errors: string[] = [];
        measureObjs.forEach(mObj => {
            errors.push(...this.validateMeasureObj(mObj));
        });
        return errors;
    }

    getAllKpiErrors(measureObjs: MeasureObj[]): string[] {
        const errors: string[] = [];
        const allKpis = measureObjs.flatMap(m => m.kpiList);
        const allCounters = measureObjs.flatMap(m => m.counterList);
        allKpis.forEach(kpi => {
            const kpiErrors = this.validateKpi(kpi);
            const formulaErrors = this.validateFormula(kpi.formula, allCounters);
            errors.push(...kpiErrors, ...formulaErrors);
        });
        return errors;
    }

    getAllCounterErrors(measureObjs: MeasureObj[]): string[] {
        const errors: string[] = [];
        const allCounters = measureObjs.flatMap(m => m.counterList);
        allCounters.forEach(counter => {
            const counterErrors = this.validateCounter(counter);
            errors.push(...counterErrors);
        });
        return errors;
    }

    getAllErrors(): string[] {
        const errors: string[] = [];
        const measureObject = this.getMeasureObject();
        const measureObjs = measureObject?.measureObjTypeList.flatMap(m => m.measureObjList) || [];
        if (!measureObject) {
            errors.push("No measure object found.");
            return errors;
        }
        errors.push(...this.getAllMeasureTypeErrors(measureObject.measureObjTypeList));
        errors.push(...this.getAllMeasureObjecErrors(measureObjs));
        errors.push(...this.getAllCounterErrors(measureObjs));
        errors.push(...this.getAllKpiErrors(measureObjs));
        return errors;
    }


    convertFormula(formula: string) {
        if (formula) {
            const nameToNumericId: Record<string, string> = {};
            const allCounters = this.getAllCounters();
            allCounters.forEach(c => {
                if (c._numericId) {
                    nameToNumericId[c.name] = c._numericId!;
                } else {
                    nameToNumericId[c.name] = `${parseInt(c.id.slice(1), 10)}`
                }
            });
            let normalized = formula.replace(/\s+/g, ''); // remove all whitespace (spaces, tabs, newlines)
            Object.entries(nameToNumericId).forEach(([name, numId]) => {
                const regex = new RegExp(`\\b${name}\\b`, "g");
                normalized = normalized.replace(regex, `$${numId}$`);
            });
            return normalized;
        }
        return undefined;
    }

    getKpiCounterList(kpi: KPI): string[] {
        const measurObj = this.getMeasureObject();
        if (!measurObj) {
            return []
        }
        const counters = measurObj.measureObjTypeList.flatMap(mType => mType.measureObjList.flatMap(mObj => mObj.counterList));
        const usedCounters = this.extractCounterNamesFromFormula(kpi.formula, counters);
        if (!usedCounters) {
            return [];
        }
        return usedCounters.map(counter => `${parseInt(counter.id.slice(1), 10)}` || '') || []
    }

    getKpisUsingCounter(counter: Counter): KPI[] {
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return []
        }
        const allKpis = measureObj?.measureObjTypeList.flatMap(mType => mType.measureObjList.flatMap(mObj => mObj.kpiList));
        const allCounters = measureObj?.measureObjTypeList.flatMap(mType => mType.measureObjList.flatMap(mObj => mObj.counterList));
        const usedKpis = allKpis.filter(k => this.extractCounterNamesFromFormula(k.formula, allCounters).some(c => c.id === counter.id))
        return usedKpis;
    }

    getCountersUsedByKpi(kpi: KPI): Counter[] {
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return []
        }
        const allCounters = measureObj?.measureObjTypeList.flatMap(mType => mType.measureObjList.flatMap(mObj => mObj.counterList));
        const usedCounters = this.extractCounterNamesFromFormula(kpi.formula, allCounters).map(c => `${parseInt(c.id.slice(1), 10)}` || '');

        return allCounters.filter(counter =>
            usedCounters?.includes(`${parseInt(counter.id.slice(1), 10)}`)
        );
    }

    clearLocalStorage(): void {
        localStorage.removeItem(this.measureObjectKey);
    }

    saveMainObjectIntoLocalStorage(mainObject: MeasureType): void {
        const data = JSON.stringify(mainObject);
        localStorage.setItem(this.measureObjectKey, data);
    }

    addTypeObjIntoLocalStorageById(measureObjTypeId: string, measureObjData: MeasureObjType): void {
        // const data = JSON.stringify(measureObjData);
        // localStorage.setItem(`${this.measureObjPrefix}${measureObjTypeId}`, data);
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return
        }
        const index = measureObj.measureObjTypeList.findIndex(m => m.measureObjTypeId === measureObjData.measureObjTypeId);
        if (index >= 0) {
            measureObj.measureObjTypeList[index] = measureObjData;
        } else {
            measureObj.measureObjTypeList.push(measureObjData);
        }
        this.saveMainObjectIntoLocalStorage(measureObj);

    }

    removeTypeObjFromStorageById(measureObjTypeId: string): void {
        // localStorage.removeItem(`${this.measureObjPrefix}${measureObjTypeId}`);
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return
        }
        const index = measureObj.measureObjTypeList.findIndex(m => m.measureObjTypeId === measureObjTypeId);
        if (index >= 0) {
            measureObj.measureObjTypeList = measureObj.measureObjTypeList.filter(m => m.measureObjTypeId != measureObjTypeId);
        }

        this.saveMainObjectIntoLocalStorage(measureObj);
    }

    getMeasureTypeById(measureObjTypeId: string): MeasureObjType | undefined {
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return undefined;
        }
        return measureObj.measureObjTypeList.find(m => m.measureObjTypeId === measureObjTypeId);
    }

    getAllCounters(): Counter[] {
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return []
        }
        return measureObj?.measureObjTypeList.flatMap(mType => mType.measureObjList.flatMap(mObj => mObj.counterList));
    }

    getAllKpis(): KPI[] {
        const measureObj = this.getMeasureObject();
        if (!measureObj) {
            return []
        }
        return measureObj?.measureObjTypeList.flatMap(mType => mType.measureObjList.flatMap(mObj => mObj.kpiList));
    }

    validateFormula(formula: string, availableCounters: Counter[]): string[] {
        if (!formula || !formula.trim()) {
            return ["Formula is empty."];
        }
        const errors = [];
        const scope = availableCounters.reduce((acc, c) => {
            acc[c.name] = 1;
            return acc;
        }, {} as Record<string, number>);

        const result = this.formulaParser.parseFormula(formula, scope);
        const validationMathjs = result.validationMathjs;
        const validationCustom = result.validationCustom;
        if (validationCustom.error) {
            errors.push(validationCustom.error)
        }
        if (validationMathjs.error) {
            errors.push(validationMathjs.error)
        }
        const counterNames = availableCounters.map(c => c.name);
        for (const token of result.tokens.filter(t => t.type === 'identifier').map(t => t.token)) {
            if (!counterNames.includes(token)) {
                errors.push(`Invalid token "${token}" in formula`);
            }
        }
        return errors;
    }

    private generateMeasureObjTypeId(source: MeasureObjType[]): string | null {
        const existingIds = source.map(m => parseInt(m.measureObjTypeId)).filter(id => !isNaN(id));
        if (existingIds.length > 0) {
            let id = Math.max(...existingIds) + 1;
            while (!this.isMeasureObjTypeIdUniq(`${id}`, source)) {
                id++;
            }
            return `${id}`
        } else {
            return `101`;
        }
    }

    private generateMeasureObjId(source: MeasureObjType[]): string | null {
        if (!source) return null;
        const existingIds = source.flatMap(m => m.measureObjList).map(m => parseInt(m.measureObjId)).filter(id => !isNaN(id));
        if (existingIds.length > 0) {
            let id = Math.max(...existingIds) + 1;
            while (!this.isMeasureObjIdUniq(`${id}`, source.flatMap(m => m.measureObjList))) {
                id++;
            }
            return `${id}`
        } else {
            return `1001`;
        }
    }

    private generateCounterId(source: MeasureObjType[]): string | null {
        if (!source) return null;
        const existingIds = source.flatMap(m => m.measureObjList).flatMap(o => o.counterList).filter(id => id.id).map(c => parseInt(c.id.slice(1), 10)).filter(id => !isNaN(id));
        if (existingIds.length > 0) {
            let id = Math.max(...existingIds) + 1;
            while (!this.isCounterIdUniq(`${id}`, source.flatMap(m => m.measureObjList))) {
                id++;
            }
            return `C${String(id).padStart(10, '0')}`;
        } else {
            return `C0000000001`;
        }
    }

    private generateKpiId(source: MeasureObjType[]): string | null {
        if (!source) return null;
        const existingIds = source.flatMap(m => m.measureObjList).flatMap(o => o.kpiList).filter(id => id.kpiId).map(c => parseInt(c.kpiId)).filter(id => !isNaN(id));
        if (existingIds.length > 0) {
            let id = Math.max(...existingIds) + 1;
            while (!this.isKpiIdUniq(`${id}`, source.flatMap(m => m.measureObjList))) {
                id++;
            }
            return `${id}`;
        } else {
            return `110001`;
        }
    }

    private isMeasureObjTypeIdUniq(id: string, source: MeasureObjType[]): boolean {
        return !source.some(s => s.measureObjTypeId == id)
    }

    private isMeasureObjIdUniq(id: string, source: MeasureObj[]): boolean {
        return !source.some(s => s.measureObjId == id)
    }

    private isCounterIdUniq(id: string, source: MeasureObj[]): boolean {
        return !source.some(s => s.counterList.some(c => c.id == `C${id.padStart(10, '0')}`))
    }

    private isKpiIdUniq(id: string, source: MeasureObj[]): boolean {
        return !source.some(s => s.kpiList.some(k => k.kpiId == id));
    }

    private validateMeasureType(mType: MeasureObjType): string[] {
        const errors: string[] = [];
        const existingNames = [mType.measureType];
        const existingIds = [mType.measureObjTypeId];
        if (!mType.measureType || mType.measureType.trim() === '') {
            errors.push(`Measure Type ${mType.measureObjTypeId}: name is required.`);
        } else if (existingNames.filter(name => name === mType.measureType).length > 1) {
            errors.push(`Measure Type ${mType.measureObjTypeId} – ${mType.measureType}: name must be unique.`);
        }
        if (!mType.measureObjTypeId || mType.measureObjTypeId.trim() === '') {
            errors.push(`Measure Type ${mType.measureType}: Measure Type ID is required.`);
        } else if (existingIds.filter(id => id === mType.measureObjTypeId).length > 1) {
            errors.push(`Measure Type ${mType.measureObjTypeId} – ${mType.measureType}: Measure Type ID must be unique.`);
        }
        return errors;
    }

    private validateMeasureObj(mObj: MeasureObj): string[] {
        const errors: string[] = [];
        const existingNames = [mObj.name];
        const existingIds = [mObj.measureObjId];
        if (!mObj.name || mObj.name.trim() === '') {
            errors.push(`Measure Object ${mObj.measureObjId}: name is required.`);
        } else if (existingNames.filter(name => name === mObj.name).length > 1) {
            errors.push(`Measure Object ${mObj.measureObjId} – ${mObj.name}: name must be unique.`);
        }
        if (!mObj.measureObjId || mObj.measureObjId.trim() === '') {
            errors.push(`Measure Object ${mObj.name}: Measure Object ID is required.`);
        } else if (existingIds.filter(id => id === mObj.measureObjId).length > 1) {
            errors.push(`Measure Object ${mObj.measureObjId} – ${mObj.name}: Measure Object ID must be unique.`);
        }
        return errors;
    }

    private validateKpi(kpis: KPI): string[] {
        const errors: string[] = [];
        const existingNames = [kpis.name];
        const existingIds = [kpis.kpiId];
        if (!kpis.name || kpis.name.trim() === '') {
            errors.push(`KPI ${kpis.kpiId}: name is required.`);
        } else if (existingNames.filter(name => name === kpis.name).length > 1) {
            errors.push(`KPI ${kpis.kpiId} – ${kpis.name}: name must be unique.`);
        }
        if (!kpis.kpiId || kpis.kpiId.trim() === '') {
            errors.push(`KPI ${kpis.name}: KPI ID is required.`);
        } else if (existingIds.filter(id => id === kpis.kpiId).length > 1) {
            errors.push(`KPI ${kpis.kpiId} – ${kpis.name}: KPI ID must be unique.`);
        }
        return errors;
    }

    private validateCounter(counter: Counter): string[] {
        const errors: string[] = [];
        const existingNames = [counter.name];
        const existingIds = [counter.id];
        if (!counter.name || counter.name.trim() === '') {
            errors.push(`Counter ${counter.id}: name is required.`);
        } else if (existingNames.filter(name => name === counter.name).length > 1) {
            errors.push(`Counter ${counter.id} – ${counter.name}: name must be unique.`);
        }
        if (!counter.id || counter.id.trim() === '') {
            errors.push(`Counter ${counter.name}: Counter ID is required.`);
        } else if (existingIds.filter(id => id === counter.id).length > 1) {
            errors.push(`Counter ${counter.id} – ${counter.name}: Counter ID must be unique.`);
        }
        return errors;
    }

    private extractCounterNamesFromFormula(formula: string, availableCounters: Counter[]): Counter[] {
        if (!formula) return [];
        if (!availableCounters || availableCounters.length === 0) return [];

        const counterNames = availableCounters.map(c => c.name);
        const found: Counter[] = [];

        for (const name of counterNames) {
            const regex = new RegExp(`\\b${name}\\b`, 'g'); // whole word match
            if (regex.test(formula)) {
                const item = availableCounters.find(item => item.name === name);
                if (item) {
                    found.push(item);
                }
            }
        }

        return found;
    }

}