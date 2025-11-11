export interface MeasureType {
  neVersion: string;
  neTypeId: string;
  neTypeName: string;
  measureObjTypeList: MeasureObjType[];
}
export interface MeasureObjType {
  measureType: string;
  measureObjTypeId: string;
  measureObjList: MeasureObj[];
}
export interface CounterItem {
  id: string;
  name: string;
  displayName?: string;
}

export interface Counter {
  name: string;
  unit: string;
  id: string;
  cumulative: boolean;
  _numericId?: string;
  _show: boolean;
}

export interface KPI {
  kpiId: string;
  // kpiCounterList: string;
  formula: string;
  formulaWithCountersId?: string
  name: string;
  title: string;
  indicator: string; // "p" or "n",
  unit: string
  _usedCounters: Counter[];
  _show: boolean;
}

export interface MeasureObj {
  measureObjId: string;
  name: string;
  abbreviation: string;
  counterList: Counter[];
  kpiList: KPI[];
  // filteredCounterList?: Counter[];
  // filteredKpiList?: KPI[];
  kpiSearchTerm?: string;
  counterSearchTerm?: string;
  _show?: boolean;
}