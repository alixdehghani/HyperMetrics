import { Injectable } from '@angular/core';

export interface Counter { id: string; name: string; }
export interface Kpi { id: string; name: string; }
export interface MeasureObj {
  measureObjId: string;
  name: string;
  counterList: Counter[];
  kpiList: Kpi[];
}
export interface Measure {
  measureType: string;
  measureId: string;
  measureObjList: MeasureObj[];
}

@Injectable({ providedIn: 'root' })
export class MeasureService {
  measure: Measure = {
    measureType: 'Cell Measurement',
    measureId: '201101',
    measureObjList: []
  };

  addMeasureObj(obj: MeasureObj) {
    this.measure.measureObjList.push(obj);
  }

  removeMeasureObj(id: string) {
    this.measure.measureObjList = this.measure.measureObjList.filter(o => o.measureObjId !== id);
  }

  editMeasureObj(updatedObj: MeasureObj) {
    const index = this.measure.measureObjList.findIndex(o => o.measureObjId === updatedObj.measureObjId);
    if (index > -1) this.measure.measureObjList[index] = updatedObj;
  }

  addCounter(objId: string, counter: Counter) {
    const obj = this.measure.measureObjList.find(o => o.measureObjId === objId);
    if (obj) obj.counterList.push(counter);
  }

  removeCounter(objId: string, counterId: string) {
    const obj = this.measure.measureObjList.find(o => o.measureObjId === objId);
    if (obj) obj.counterList = obj.counterList.filter(c => c.id !== counterId);
  }

  addKpi(objId: string, kpi: Kpi) {
    const obj = this.measure.measureObjList.find(o => o.measureObjId === objId);
    if (obj) obj.kpiList.push(kpi);
  }

  removeKpi(objId: string, kpiId: string) {
    const obj = this.measure.measureObjList.find(o => o.measureObjId === objId);
    if (obj) obj.kpiList = obj.kpiList.filter(k => k.id !== kpiId);
  }
}
