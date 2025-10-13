import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormulaInput } from '../../../shared/formula-input/formula-input';
import { UNITS } from '../../../core/interfaces/unit.types';
import { FormulaParserService } from '../../../core/helper/formula-helper';

interface measurementData {
  measureType: string,
  measureId: string,
  measureObjList: MeasureObj[]
}
interface CounterItem {
  id: string;
  name: string;
  displayName?: string;
}

interface Counter {
  name: string;
  unit: string;
  id: string;
  cumulative: boolean;
  _numericId?: string;
  _show: boolean;
}

interface KPI {
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

interface MeasureObj {
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
@Component({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormulaInput
  ],
  selector: 'app-cell-measurement',
  templateUrl: './cell-measurement.html',
})
export class CellMeasurementComponent implements OnInit, OnDestroy {
  expandedSections: { [key: string]: boolean } = {};
  viewMode: 'ui' | 'json' = 'ui';
  searchTerm: string = '';
  editingCounterName: { [key: string]: boolean } = {};
  editingKpiName: { [key: string]: boolean } = {};
  editingKpiTitle: { [key: string]: boolean } = {};
  editingKpiFormula: { [key: string]: boolean } = {};
  addingNewCounter = false;
  newCounterForm!: FormGroup;
  newKpiForm!: FormGroup;
  addingNewKpi = false;
  showRestoreBanner = false;
  availableCounters: CounterItem[] = [];
  private _kpiFormulaEditFc!: AbstractControl | null;
  $destroy = new Subject();
  initialFormula: string = '';
  newFormula: string = '';
  isValid: boolean = true;
  readonly neVersion!: string;
  readonly neTypeId!: string;
  readonly neTypeName!: string;
  readonly units!: string[];
  showFullscreenFormulaEditor: boolean = false;
  measurementData = {
    measureType: "Cell Measurement",
    measureId: "201101",
    measureObjList: <MeasureObj[]>[
      {
        measureObjId: "2011018001",
        name: "Radio Resource Control measurements",
        counterList: [],
        kpiList: [],
        _show: true,
        abbreviation: ''
      }
    ]
  };

  form: FormGroup;
  private _route = inject(ActivatedRoute);
  private formulaParser = inject(FormulaParserService);
  constructor(private fb: FormBuilder) {
    this.neTypeId = this._route.snapshot.paramMap.get('typeId') || '';
    this.neVersion = this._route.snapshot.data['neVersion'] || '';
    this.neTypeName = this._route.snapshot.data['neTypeName'] || '';
    this.units = UNITS;

    this.form = this.fb.group({
      measureType: [''],
      measureId: [''],
      measureObjList: [[]]
    });
  }


  ngOnInit(): void {
    const savedJson = localStorage.getItem('hyper_config');
    if (savedJson) {
      this.showRestoreBanner = true;
    }
  }

  ngOnDestroy(): void {
    this.$destroy.next(null);
    this.$destroy.complete();
  }

  // Helper methods for accessing form controls
  getMeasureObjControls() {
    return (this.form.get('measureObjList') as FormArray).controls;
  }

  getCounterControls(measureObjIndex: number) {
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    const measureObjGroup = measureObjArray.at(measureObjIndex);
    return (measureObjGroup.get('counterList') as FormArray).controls;
  }

  getKpiControls(measureObjIndex: number) {
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    const measureObjGroup = measureObjArray.at(measureObjIndex);
    return (measureObjGroup.get('kpiList') as FormArray).controls;
  }

  private _initForm() {
    const measureObjFormGroups = this.measurementData.measureObjList.map(obj =>
      this.fb.group({
        measureObjId: [obj.measureObjId],
        name: [obj.name],
        abbreviation: [obj.abbreviation],
        counterList: this.fb.array(
          obj.counterList.map(counter =>
            this.fb.group({
              name: [counter.name],
              unit: [counter.unit],
              cumulative: [counter.cumulative],
            })
          )
        ),
        kpiList: this.fb.array(
          obj.kpiList.map(kpi =>
            this.fb.group({
              formula: [kpi.formula],
              name: [kpi.name],
              indicator: [kpi.indicator],
              unit: [kpi.unit],
              title: [kpi.title],
            })
          )
        )
      })
    );

    this.form = this.fb.group({
      measureType: [this.measurementData.measureType],
      measureId: [this.measurementData.measureId],
      measureObjList: this.fb.array(measureObjFormGroups)
    });

    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const counterArray = (measureObjGroup.get('counterList') as FormArray);
      counterArray.controls.forEach((counterGroup, counterIndex) => {
        counterGroup.get('name')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newName: string) => {
            this.startEditingCounterName(this.measurementData.measureObjList[objIndex].counterList[counterIndex]);
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const counterArray = (measureObjGroup.get('counterList') as FormArray);
      counterArray.controls.forEach((counterGroup, counterIndex) => {
        counterGroup.get('cumulative')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newCumulative: boolean) => {
            const counter = this.measurementData.measureObjList[objIndex].counterList[counterIndex];
            counter.cumulative = newCumulative;
            this._normalizeCountersAndKpis(this.measurementData);
            this._updateMeasurementObject();
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const counterArray = (measureObjGroup.get('counterList') as FormArray);
      counterArray.controls.forEach((counterGroup, counterIndex) => {
        counterGroup.get('unit')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newunit: string) => {
            const counter = this.measurementData.measureObjList[objIndex].counterList[counterIndex];
            counter.unit = newunit;
            this._normalizeCountersAndKpis(this.measurementData);
            this._updateMeasurementObject();
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const kpiArray = (measureObjGroup.get('kpiList') as FormArray);
      kpiArray.controls.forEach((kpiGroup, kpiIndex) => {
        kpiGroup.get('name')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newname: string) => {
            this.startEditingKpiName(this.measurementData.measureObjList[objIndex].kpiList[kpiIndex]);
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const kpiArray = (measureObjGroup.get('kpiList') as FormArray);
      kpiArray.controls.forEach((kpiGroup, kpiIndex) => {
        kpiGroup.get('title')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newTitle: string) => {
            this.startEditingKpiTitle(this.measurementData.measureObjList[objIndex].kpiList[kpiIndex]);
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const kpiArray = (measureObjGroup.get('kpiList') as FormArray);
      kpiArray.controls.forEach((kpiGroup, kpiIndex) => {
        kpiGroup.get('formula')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newformula: string) => {
            this.startEditingKpiFormula(this.measurementData.measureObjList[objIndex].kpiList[kpiIndex]);
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const kpiArray = (measureObjGroup.get('kpiList') as FormArray);
      kpiArray.controls.forEach((kpiGroup, kpiIndex) => {
        kpiGroup.get('unit')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newunit: string) => {
            const kpi = this.measurementData.measureObjList[objIndex].kpiList[kpiIndex];
            kpi.unit = newunit;
            this._normalizeCountersAndKpis(this.measurementData);
            this._updateMeasurementObject();
          });
      });
    });
    (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
      const kpiArray = (measureObjGroup.get('kpiList') as FormArray);
      kpiArray.controls.forEach((kpiGroup, kpiIndex) => {
        kpiGroup.get('indicator')?.valueChanges
          .pipe(takeUntil(this.$destroy))
          .subscribe((newindicator: string) => {
            const kpi = this.measurementData.measureObjList[objIndex].kpiList[kpiIndex];
            kpi.indicator = newindicator;
            this._normalizeCountersAndKpis(this.measurementData);
            this._updateMeasurementObject();
          });
      });
    });
  }

  toggleSection(section: string) {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  setViewMode(mode: 'ui' | 'json') {
    this.viewMode = mode;
  }

  // -------------------------------
  // JSON File Upload Handling
  // -------------------------------
  onJsonFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        this._normalizeCountersAndKpis(data);
        this.measurementData = data;
        this._updateMeasurementObject();
        // this._startUpdateLocalstorageTimerInterval();
        this._initForm();
        this.saveToLocalStorage();
      } catch (err) {
        console.error("❌ Invalid JSON file", err);
        alert("The uploaded file is not a valid JSON.");
      }
    };
    reader.readAsText(file);
  }

  // private _startUpdateLocalstorageTimerInterval(): void {
  //   interval(1500).pipe(takeUntil(this.$destroy)).subscribe({
  //     next: () => localStorage.setItem('hyper_config', JSON.stringify(this.measurementData))
  //   });
  // }

  convertHyperMeasure() {
    const data = this.measurementData;
    // --- 1. Generate eNodeB_No_Realtime.json ---
    const eNodeB_output = {
      neVersion: "faraabeen_default",
      neTypeId: "201",
      neTypeName: "eNodeB",
      measureObjTypeList: [{
        measureObjTypeId: data.measureId,
        name: data.measureType,
        commAttributes: ["cellId"],
        commAttributeVals: ["U8"],
        measureObj: [] as any[],
      },],
    };

    const allCounters = new Map();
    const allKpis = new Map();

    data.measureObjList.forEach(obj => {
      // Map to eNodeB format
      const measureObj = {
        measureObjId: obj.measureObjId,
        name: obj.name,
        dataUpPeriodMod: "0",
        counterList: obj.counterList.map(counter => counter.id),
        kpiList: obj.kpiList.map((kpi: KPI) => ({
          kpiId: kpi.kpiId,
          kpiCounterList: kpi._usedCounters?.map(item => item._numericId).join(','),
          formula: kpi.formula,
          // Add optional fields if they exist
          ...(kpi.name && { name: kpi.name }),
          ...(kpi.indicator && { indicator: kpi.indicator }),
        })),
      };
      eNodeB_output.measureObjTypeList[0].measureObj.push(measureObj);

      // Collect all counters and KPIs for the properties file
      obj.counterList.forEach(counter => {
        if (!allCounters.has(counter.id)) {
          allCounters.set(counter.id, counter);
        }
      });

      obj.kpiList.forEach(kpi => {
        if (!allKpis.has(kpi.kpiId)) {
          allKpis.set(kpi.kpiId, kpi);
        }
      });
    });


    // --- 2. Generate counters_kpi_list.properties ---
    let properties_lines = [];

    // Add measure object names
    properties_lines.push(`pm.measure.object.type.${data.measureId}=${data.measureType}`);
    data.measureObjList.forEach((obj: any) => {
      // Note: The original file had short names (e.g., RRC). We use the full name from the input JSON.
      properties_lines.push(`pm.measure.object.${obj.measureObjId}=${obj.name}`);
    });
    properties_lines.push(''); // separator

    // Add counters
    allCounters.forEach(counter => {
      properties_lines.push(`${counter.id}=${counter.name} (${counter.unit || 'number'})`);
    });
    properties_lines.push(''); // separator

    // Add KPIs
    allKpis.forEach(kpi => {
      // Format KPI ID: e.g., 11001 -> K0000011001
      const kpiKey = `K${String(kpi.kpiId).padStart(7, '0')}`;
      const kpiUnit = kpi.indicator === 'p' ? 'percent' : 'number';
      properties_lines.push(`${kpiKey}=${kpi.name} (${kpiUnit})`);
    });

    const eNodeBBlob = new Blob([JSON.stringify(eNodeB_output, null, 2)], { type: 'application/json' });
    const propertiesBlob = new Blob([properties_lines.join('\n')], { type: 'text/plain' });

    const eNodeBUrl = URL.createObjectURL(eNodeBBlob);
    const propertiesUrl = URL.createObjectURL(propertiesBlob);

    // Download eNodeB_No_Realtime.json
    const eNodeBLink = document.createElement('a');
    eNodeBLink.href = eNodeBUrl;
    eNodeBLink.download = 'eNodeB_No_Realtime.json';
    document.body.appendChild(eNodeBLink);
    eNodeBLink.click();
    document.body.removeChild(eNodeBLink);

    // Download counters_kpi_list.properties
    const propertiesLink = document.createElement('a');
    propertiesLink.href = propertiesUrl;
    propertiesLink.download = 'counters_kpi_list.properties';
    document.body.appendChild(propertiesLink);
    propertiesLink.click();
    document.body.removeChild(propertiesLink);

    // Clean up object URLs
    setTimeout(() => {
      URL.revokeObjectURL(eNodeBUrl);
      URL.revokeObjectURL(propertiesUrl);
    }, 1000);
    // return {
    //   eNodeB: JSON.stringify(eNodeB_output, null, 2),
    //   properties: properties_lines.join('\n'),
    // };
  }
  filterMeasurementObjects() {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) {
      this.measurementData.measureObjList.forEach(obj => {
        obj._show = true;
        obj.counterList.forEach(counter => counter._show = true);
        obj.kpiList.forEach(kpi => kpi._show = true);
        obj.counterSearchTerm = '';
        obj.kpiSearchTerm = '';
        this.filterCounters(obj);
        this.filterKpis(obj);
      })
      return;
    }
    this.measurementData.measureObjList.forEach(obj => {
      const filteredCounterList = obj.counterList.filter(counter =>
        counter.name.toLowerCase().includes(term) || counter.id.toLowerCase().includes(term)
      );
      const filteredKpiList = obj.kpiList.filter(kpi =>
        kpi.name.toLowerCase().includes(term) || kpi.kpiId.toString().includes(term)
      );
      if (
        obj.name.toLowerCase().includes(term) ||
        obj.measureObjId.toLowerCase().includes(term) ||
        (filteredCounterList && filteredCounterList.length > 0) ||
        (filteredKpiList && filteredKpiList.length > 0)
      ) {
        obj._show = true;
        if (filteredCounterList.length > 0) {
          obj.counterSearchTerm = term;
          this.filterCounters(obj)
        }
        if (filteredKpiList.length > 0) {
          obj.kpiSearchTerm = term;
          this.filterKpis(obj)
        }
      } else {
        obj._show = false
      }
    });
  }
  filterCounters(measureObj: MeasureObj) {
    const term = measureObj.counterSearchTerm?.toLowerCase().trim() || '';
    if (!term) {
      measureObj.counterList.forEach(counter => counter._show = true);
      // measureObj.filteredCounterList = measureObj.counterList;
      return;
    }
    // measureObj.filteredCounterList = measureObj.counterList.filter(counter =>
    //   counter.name.toLowerCase().includes(term) || counter.id.toLowerCase().includes(term)
    // );
    measureObj.counterList.forEach(counter => {
      counter._show = counter.name.toLowerCase().includes(term) || counter.id.toLowerCase().includes(term);
    });
  }
  filterKpis(measureObj: MeasureObj) {
    const term = measureObj.kpiSearchTerm?.toLowerCase() || '';
    if (!term) {
      measureObj.kpiList.forEach(kpi => kpi._show = true);
      // measureObj.filteredKpiList = measureObj.kpiList;
      return;
    }
    measureObj.kpiList.forEach(kpi => {
      kpi._show = kpi.name.toLowerCase().includes(term) || kpi.kpiId.toString().includes(term);
    });
  }

  // -------------------------------
  // CRUD operations for Measurement Objects
  // -------------------------------
  addMeasurementObject() {
    this.measurementData.measureObjList.push({
      measureObjId: "201101" + (8000 + this.measurementData.measureObjList.length + 1).toString().padStart(4, '0'),
      name: "New Measurement Object",
      counterList: [],
      kpiList: [],
      abbreviation: ''
    });
    this.filterMeasurementObjects();
  }

  removeMeasurementObject(index: number) {
    if (!confirm("Are you sure you want to delete this measurement object?")) {
      return;
    }
    this.measurementData.measureObjList.splice(index, 1);
    this.filterMeasurementObjects(); // Update filtered view
  }

  // -------------------------------
  // CRUD operations for Counters
  // -------------------------------
  // Updated add/remove methods to work with FormArrays
  addCounter(measureObj: MeasureObj) {
    const measureObjIndex = this.measurementData.measureObjList.indexOf(measureObj);

    // Add to data model
    measureObj.counterList.push({
      name: "New Counter",
      unit: "unit",
      id: '',
      cumulative: false,
      _show: true,
    });

    // Add to form
    // const counterArray = this.getCounterControls(measureObjIndex)as FormArray;
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    const measureObjGroup = measureObjArray.at(measureObjIndex);
    const counterArray = measureObjGroup.get('counterList') as FormArray;
    const newCounterGroup = this.fb.group({
      name: ['New Counter'],
      unit: ['unit'],
      id: [{ value: '', disabled: true }],
      cumulative: [false],
      _numericId: [''],
    });

    counterArray.push(newCounterGroup);

    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
  }

  removeCounter(measureObj: MeasureObj, index: number) {
    const counter = measureObj.counterList[index];
    const usedIn = this.getKpisUsingCounter(measureObj, counter);
    if (usedIn.length > 0) {
      alert(`This counter is used in KPIs: ${usedIn.map(k => k.kpiId).join(', ')}. Remove it from those KPIs first.`);
      return;
    }
    if (!confirm("Are you sure you want to delete this counter?")) return;
    measureObj.counterList.splice(index, 1);
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    const measureObjGroup = measureObjArray.at(this.measurementData.measureObjList.indexOf(measureObj));
    const counterArray = measureObjGroup.get('counterList') as FormArray;
    counterArray.removeAt(index);
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
  }

  // -------------------------------
  // CRUD operations for KPIs
  // -------------------------------
  addKpi(measureObj: MeasureObj) {
    const measureObjIndex = this.measurementData.measureObjList.indexOf(measureObj);

    // Add to data model
    measureObj.kpiList.push({
      kpiId: '0',
      formula: "",
      title: '',
      name: "New KPI",
      indicator: "p",
      unit: 'percent',
      _usedCounters: [],
      _show: true,
    });

    // Add to form
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    const measureObjGroup = measureObjArray.at(measureObjIndex);
    const kpiArray = measureObjGroup.get('kpiList') as FormArray;

    const newKpiGroup = this.fb.group({
      kpiId: [{ value: '0', disabled: true }],
      formula: [''],
      formulaWithCountersId: [''],
      name: ['New KPI'],
      indicator: ['p'],
      unit: ['percent'],
      _usedCounters: [[]]
    });

    kpiArray.push(newKpiGroup);

    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
  }

  removeKpi(measureObj: MeasureObj, index: number) {
    const kpi = measureObj.kpiList[index];
    const usedCounters = this.getCountersUsedByKpi(measureObj, kpi);
    if (usedCounters.length > 0) {
      alert(`This KPI depends on counters: ${usedCounters.map(c => c.name).join(', ')}.`);
    }
    if (!confirm("Are you sure you want to delete this KPI?")) return;
    measureObj.kpiList.splice(index, 1);
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    const measureObjGroup = measureObjArray.at(this.measurementData.measureObjList.indexOf(measureObj));
    const kpiArray = measureObjGroup.get('kpiList') as FormArray;
    kpiArray.removeAt(index);
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
  }

  copyJson() {
    const jsonStr = JSON.stringify(this.measurementData, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      alert("JSON copied to clipboard!");
    }).catch(err => {
      alert("Failed to copy JSON: " + err);
    });
  }
  // Find KPIs that reference a counter
  getKpisUsingCounter(measureObj: MeasureObj, counter: Counter): KPI[] {
    if (!counter._numericId) return [];
    return measureObj.kpiList.filter(kpi => kpi._usedCounters?.some(c => c._numericId === counter._numericId))
  }

  // Find Counters referenced by a KPI (numeric IDs → counters)
  getCountersUsedByKpi(measureObj: MeasureObj, kpi: KPI): Counter[] {
    // if (!kpi.kpiCounterList) return [];

    const counterIds = kpi._usedCounters?.map(counter => counter._numericId);

    return measureObj.counterList.filter(counter =>
      counter._numericId ? counterIds?.includes(counter._numericId) : false
    );
  }

  getKpiCounterList(kpi: KPI): string[] {
    if (!kpi._usedCounters) {
      return [];
    }
    return kpi._usedCounters.map(counter => counter?._numericId || '') || []
  }


  getKpiCounterListForExport(kpi: KPI): string {
    if (!kpi._usedCounters) {
      return [].join(',');
    }
    return (kpi._usedCounters.map(counter => counter?._numericId || '') || []).join(',')
  }

  getKpiFormulaForExport(kpi: KPI): string {
    if (!kpi.formulaWithCountersId) {
      return '';
    }
    return kpi.formulaWithCountersId;
  }


  private _generateCounterId(index: number): string {
    // index starts from 1
    const counterId = `C${String(index).padStart(10, '0')}`;
    return counterId;
  }

  private _generateKpiId(index: number): string {
    // index starts from 1
    const kpiId = `${String(11000 + index).toString()}`;
    return kpiId;
  }


  private _updateMeasurementObject() {
    this.saveToLocalStorage();
    this.filterMeasurementObjects(); // Update filtered view
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

  validateCounterName(counter: Counter): string[] {
    const errors: string[] = [];
    if (!counter.name || !counter.name.trim()) {
      errors.push("Counter name is required.");
    }
    const existingNames = this.measurementData.measureObjList.flatMap(m => m.counterList.filter(c => c.id !== counter.id).map(c => c.name));
    if (existingNames.some(existingName => existingName === counter.name)) {
      errors.push(`${counter.name} is already used by another counter. Counter names must be unique.`);
    }
    return errors;
  }

  validateKpiName(kpi: KPI): string[] {
    const errors: string[] = [];
    if (!kpi.name || !kpi.name.trim()) {
      errors.push("KPI name is required.");
    }
    const existingNames = this.measurementData.measureObjList.flatMap(m => m.kpiList.filter(k => k.kpiId !== kpi.kpiId).map(k => k.name));
    if (existingNames.some(existingName => existingName === kpi.name)) {
      errors.push(`${kpi.name} is already used by another KPI. KPI names must be unique.`);
    }
    return errors;
  }

  validateKpiTitle(kpi: KPI): string[] {
    return []
    const errors: string[] = [];
    if (!kpi.title || !kpi.title.trim()) {
      errors.push("KPI title is required.");
    }
    const existingTitles = this.measurementData.measureObjList.flatMap(m => m.kpiList.filter(k => k.kpiId !== kpi.kpiId).map(k => k.title));
    if (existingTitles.some(existingTitle => existingTitle === kpi.title)) {
      errors.push(`${kpi.title} is already used by another KPI. KPI titles must be unique.`);
    }
    return errors;
  }

  private _normalizeCountersAndKpis(measureObjData: measurementData) {
    let counterIdSeq = 1;
    let kpiIdSeq = 1;
    measureObjData.measureObjList.forEach(measureObj => {
      measureObj._show = true;
      // 1. Assign counter IDs
      measureObj.counterList.forEach((counter, i) => {
        counter.id = this._generateCounterId(counterIdSeq);
        counter._numericId = counterIdSeq.toString();
        counterIdSeq++;
        counter._show = true;
      });

      // Build lookup: counterName → numericId
      const nameToNumericId: Record<string, string> = {};
      measureObj.counterList.forEach(c => {
        nameToNumericId[c.name] = c._numericId!;
      });

      // 2. Update KPI references
      measureObj.kpiList.forEach(kpi => {
        const usedCounters = this.extractCounterNamesFromFormula(kpi.formula, measureObj.counterList);
        kpi.kpiId = this._generateKpiId(kpiIdSeq);
        kpiIdSeq++;
        kpi._show = true;

        // Normalize formula → wrap numeric IDs with $…
        if (kpi.formula) {
          kpi.formulaWithCountersId = this._convertFormula(kpi.formula, measureObj)
        }

        kpi._usedCounters = usedCounters;
        // kpi._usedCounters = measureObj.counterList.filter(counter =>
        //   counter._numericId ? kpi.kpiCounterList.split(',').includes(counter._numericId) : false
        // );


      });
    });
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

  validateKpiCounters(measureObj: MeasureObj, kpi: KPI): string[] {
    const errors: string[] = [];

    // Collect valid counter numeric IDs
    const validIds = measureObj.counterList.map(c => c._numericId);

    // --- Check kpiCounterList
    const kpiCounterIds = this.getKpiCounterList(kpi);
    // ? kpi.kpiCounterList.split(",").map(id => id.trim()).filter(id => !!id)
    // : [];

    kpiCounterIds.forEach(id => {
      if (!validIds.includes(id)) {
        errors.push(`Counter ID ${id} in KPI ${kpi.kpiId} is missing from counter list.`);
      }
    });

    // --- Check formula
    const formulaCounterIds = (kpi.formula.match(/\$(\d+)\$/g) || [])
      .map(m => m.replace(/\$/g, ""));

    formulaCounterIds.forEach(id => {
      if (!validIds.includes(id)) {
        errors.push(`Counter ID ${id} in formula of KPI ${kpi.kpiId} is missing from counter list.`);
      }
    });

    return errors;
  }

  getAllKpiErrors(measureObj: any): string[] {
    if (!measureObj?.kpiList) return [];
    let errors: string[] = [];
    for (let kpi of measureObj.kpiList) {
      const kpiErrors1 = this.validateKpiCounters(measureObj, kpi);
      if (kpiErrors1 && kpiErrors1.length > 0) {
        errors.push(...kpiErrors1.map(err => `KPI ${kpi.kpiId} – ${kpi.name}: ${err}`));
      }
      const kpiErrors2 = this.validateFormula(kpi.formula, kpi._usedCounters);
      if (kpiErrors2 && kpiErrors2.length > 0) {
        errors.push(...kpiErrors2.map(err => `KPI ${kpi.kpiId} – ${kpi.name}: ${err}`));
      }
      const kpiErrors3 = this.validateKpiName(kpi);
      if (kpiErrors3 && kpiErrors3.length > 0) {
        errors.push(...kpiErrors3.map(err => `KPI ${kpi.kpiId} – ${kpi.name}: ${err}`));
      }
      const kpiErrors4 = this.validateKpiTitle(kpi);
      if (kpiErrors4 && kpiErrors4.length > 0) {
        errors.push(...kpiErrors4.map(err => `KPI ${kpi.kpiId} – ${kpi.name}: ${err}`));
      }
    }
    return errors;
  }

  getAllCountersErrors(measureObj: any): string[] {
    if (!measureObj?.counterList) return [];
    let errors: string[] = [];
    for (let counter of measureObj.counterList) {
      const counterErrors = this.validateCounterName(counter);
      if (counterErrors && counterErrors.length > 0) {
        errors.push(...counterErrors.map(err => `Counter ${counter.id} – ${counter.name}: ${err}`));
      }
    }

    return errors;
  }

  getAllErrors(): string[] {
    let allErrors: string[] = [];
    this.measurementData.measureObjList.forEach(measureObj => {
      const counterErrors = this.getAllCountersErrors(measureObj);
      const kpiErrors = this.getAllKpiErrors(measureObj);
      allErrors.push(...counterErrors, ...kpiErrors);
    });
    return allErrors;
  }

  startEditingCounterName(counter: Counter) {
    this.editingCounterName[counter.id] = true;
  }

  startEditingKpiName(kpi: KPI) {
    this.editingKpiName[kpi.kpiId] = true;
  }

  startEditingKpiTitle(kpi: KPI) {
    this.editingKpiTitle[kpi.kpiId] = true;
  }

  startEditingKpiFormula(kpi: KPI) {
    this.editingKpiFormula[kpi.kpiId] = true;
  }

  startAddingNewCounter() {
    if (this.addingNewCounter) {
      return; // already adding
    }
    this.newCounterForm = this.fb.group({
      name: ['', [Validators.required]],
      unit: ['unit', [Validators.required]],
      cumulative: [false],
      id: [{ value: 'will be generated', disabled: true }],
    });
    this.addingNewCounter = true;
  }

  startAddingNewKpi() {
    if (this.addingNewKpi) {
      return; // already adding
    }
    this.newKpiForm = this.fb.group({
      name: ['', [Validators.required]],
      title: ['',],
      formula: ['', [Validators.required]],
      indicator: ['p', [Validators.required]],
      unit: ['percent', [Validators.required]],
      kpiId: [{ value: 'will be generated', disabled: true }],
    });
    this.addingNewKpi = true;
  }

  confirmAddNewCounter(measureObj: MeasureObj) {
    if (!this.newCounterForm) return;
    if (this.newCounterForm.invalid) {
      alert("Please fill in all required fields for the new counter.");
      return;
    }
    const newCounter: Counter = {
      name: this.newCounterForm.get('name')?.value,
      unit: this.newCounterForm.get('unit')?.value,
      cumulative: this.newCounterForm.get('cumulative')?.value,
      id: '',
      _show: true,
    };
    // Validate name uniqueness
    const nameErrors = this.validateCounterName(newCounter);
    if (nameErrors.length > 0) {
      alert("❌ Invalid counter name:\n" + nameErrors.join('\n'));
      return;
    }
    measureObj.counterList.push(newCounter);
    this._normalizeCountersAndKpis(this.measurementData);
    this.$destroy.next(null); // stop any ongoing subscriptions
    this.$destroy.complete();
    this.$destroy = new Subject(); // recreate for future use
    this._initForm();
    this.addingNewCounter = false;
    this.newCounterForm = new FormGroup({});
    this._updateMeasurementObject();
  }

  confirmAddNewKpi(measureObj: MeasureObj) {
    if (!this.newKpiForm) return;
    if (this.newKpiForm.invalid) {
      alert("Please fill in all required fields for the new KPI.");
      return;
    }
    const newKpi: KPI = {
      name: this.newKpiForm.get('name')?.value,
      formula: this.newKpiForm.get('formula')?.value,
      indicator: this.newKpiForm.get('indicator')?.value,
      unit: this.newKpiForm.get('unit')?.value,
      kpiId: '0',
      title: this.newKpiForm.get('title')?.value,
      _usedCounters: [],
      _show: true,
    };
    // Validate name uniqueness
    const nameErrors = this.validateKpiName(newKpi);
    if (nameErrors.length > 0) {
      alert("❌ Invalid KPI name:\n" + nameErrors.join('\n'));
      return;
    }

    // const titleErrors = this.validateKpiTitle(newKpi);
    // if (titleErrors.length > 0) {
    //   alert("❌ Invalid KPI title:\n" + titleErrors.join('\n'));
    //   return;
    // }
    // Validate formula
    const formulaErrors = this.validateFormula(newKpi.formula, measureObj.counterList);
    if (formulaErrors.length > 0) {
      alert("❌ Formula errors:\n" + formulaErrors.join('\n'));
      return;
    }
    measureObj.kpiList.push(newKpi);
    this._normalizeCountersAndKpis(this.measurementData);
    this.$destroy.next(null); // stop any ongoing subscriptions
    this.$destroy.complete();
    this.$destroy = new Subject(); // recreate for future use
    this._initForm();
    this.addingNewKpi = false;
    this.newKpiForm = new FormGroup({});
    this._updateMeasurementObject();
  }

  cancelAddNewKpi() {
    this.addingNewKpi = false;
    this.newKpiForm = new FormGroup({});
  }

  cancelAddNewCounter() {
    this.addingNewCounter = false;
    this.newCounterForm = new FormGroup({});
  }

  confirmCounterNameChange(counterFormControl: AbstractControl, counter: Counter): boolean | void {
    const newName = counterFormControl.get('name')?.value;
    if (!newName || newName.trim() === counter.name) {
      this.cancelCounterEdit(counterFormControl, counter);
      return;
    }

    if (this.validateCounterName(counterFormControl.value).length > 0) {
      alert("❌ Invalid counter name:\n" + this.validateCounterName(counterFormControl.value).join('\n'));
      this.cancelCounterEdit(counterFormControl, counter);
      return;
    }

    const oldName = counter.name; // ✅ keep old name before changing

    // Find all KPIs that use this counter
    const affectedKpis = this.measurementData.measureObjList
      .flatMap((mo: any) => mo.kpiList || [])
      .filter((kpi: KPI) =>
        (kpi._usedCounters?.map(c => c._numericId) || "").includes(counter?._numericId || '') ||
        (kpi.formula || "").includes(`$${counter?._numericId}$`)
      );

    if (affectedKpis.length > 0) {
      const confirmMsg = `⚠️ Warning: The counter "${oldName}" is used in ${affectedKpis.length} KPI(s).\n\n` +
        `Do you want to update all affected KPIs with the new counter name "${newName}"?`;
      if (!confirm(confirmMsg)) {
        this.cancelCounterEdit(counterFormControl, counter);
        return; // user cancelled
      }
    }

    // Update KPIs that use this counter
    const measureObjListFormArray = this.form.get('measureObjList') as FormArray;
    for (let kpi of affectedKpis) {
      if (kpi.formula) {
        kpi.formula = kpi.formula.replace(
          new RegExp(`\\b${oldName}\\b`, 'g'), // ✅ use old name here
          newName
        );
      }
      measureObjListFormArray.controls.forEach(measureObjGroup => {
        const kpiArray = measureObjGroup.get('kpiList') as FormArray;
        kpiArray.controls.forEach(kpiGroup => {
          if (kpiGroup.get('name')?.value === kpi.name) {
            kpiGroup.get('formula')?.setValue(kpi.formula, { emitEvent: false });
          }
        });
      });
    }

    // Apply change to counter after updating KPIs
    counter.name = newName;
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
    this.editingCounterName[counter.id] = false;
    return true;
  }

  confirmKpiFormulaChange(kpiFormControl: AbstractControl, kpi: KPI): boolean | void {
    const newFormula = kpiFormControl.get('formula')?.value;
    if (newFormula === kpi.formula) {
      this.cancelKpiFormulaEdit(kpiFormControl, kpi);
      return;
    }
    const measureObj = this.measurementData.measureObjList.find(mo =>
      mo.kpiList.some(kpiItem => kpiItem.kpiId === kpi.kpiId)
    );
    if (!measureObj) {
      alert("Error: Could not find parent measurement object for this KPI.");
      this.cancelKpiFormulaEdit(kpiFormControl, kpi);
      return;
    }

    const formulaErrors = this.validateFormula(newFormula, measureObj.counterList);
    if (formulaErrors.length > 0) {
      alert("❌ Formula errors:\n" + formulaErrors.join('\n'));
      return;
    }

    // All good, apply change
    kpi.formula = newFormula;
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
    this.editingKpiFormula[kpi.kpiId] = false;
    return true;
  }

  confirmKpiNameChange(kpiFormControl: AbstractControl, kpi: KPI): boolean | void {
    const newName = kpiFormControl.get('name')?.value;
    if (!newName || newName.trim() === kpi.name) {
      this.cancelKpiNameEdit(kpiFormControl, kpi);
      return;
    }
    if (this.validateKpiName(kpiFormControl.value).length > 0) {
      alert("❌ Invalid KPI name:\n" + this.validateKpiName(kpiFormControl.value).join('\n'));
      this.cancelKpiNameEdit(kpiFormControl, kpi);
      return;
    }

    // Apply change to KPI
    kpi.name = newName;
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
    this.editingKpiName[kpi.kpiId] = false;
    return true;
  }

  confirmKpiTitleChange(kpiFormControl: AbstractControl, kpi: KPI): boolean | void {
    const newTitle = kpiFormControl.get('title')?.value;
    if (!newTitle || newTitle.trim() === kpi.title) {
      this.cancelKpiTitleEdit(kpiFormControl, kpi);
      return;
    }
    // if (this.validateKpiTitle(kpiFormControl.value).length > 0) {
    //   alert("❌ Invalid KPI Title:\n" + this.validateKpiTitle(kpiFormControl.value).join('\n'));
    //   this.cancelKpiTitleEdit(kpiFormControl, kpi);
    //   return;
    // }

    // Apply change to KPI
    kpi.title = newTitle;
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
    this.editingKpiTitle[kpi.kpiId] = false;
    return true;
  }

  cancelCounterEdit(counterFormControl: AbstractControl, counter: Counter) {
    // Revert name in form if needed
    const nameControl = counterFormControl.get('name');
    if (nameControl && nameControl.value !== counter.name) {
      nameControl.setValue(counter.name, { emitEvent: false });
    }
    this.editingCounterName[counter.id] = false;
  }

  cancelKpiFormulaEdit(kpiFormControl: AbstractControl, kpi: KPI) {
    // Revert formula in form if needed
    const formulaControl = kpiFormControl.get('formula');
    if (formulaControl && formulaControl.value !== kpi.formula) {
      formulaControl.setValue(kpi.formula, { emitEvent: false });
    }
    this.editingKpiFormula[kpi.kpiId] = false;
  }

  cancelKpiNameEdit(kpiFormControl: AbstractControl, kpi: KPI) {
    // Revert name in form if needed
    const nameControl = kpiFormControl.get('name');
    if (nameControl && nameControl.value !== kpi.name) {
      nameControl.setValue(kpi.name, { emitEvent: false });
    }
    this.editingKpiName[kpi.kpiId] = false;
  }

  cancelKpiTitleEdit(kpiFormControl: AbstractControl, kpi: KPI) {
    // Revert Title in form if needed
    const TitleControl = kpiFormControl.get('title');
    if (TitleControl && TitleControl.value !== kpi.title) {
      TitleControl.setValue(kpi.title, { emitEvent: false });
    }
    this.editingKpiTitle[kpi.kpiId] = false;
  }

  getCounterLength(): number {
    return this.measurementData.measureObjList.reduce((sum, mo) => sum + mo.counterList.length, 0);
  }

  getKpiLength(): number {
    return this.measurementData.measureObjList.reduce((sum, mo) => sum + mo.kpiList.length, 0);
  }

  private _exportToProperties() {
    let propertiesContent = '';
    let counterIndex = 1;
    let kpiIndex = 1;

    // Add measure type
    propertiesContent += `pm.measure.object.type.${this.neTypeId}${this.measurementData.measureId}=${this.measurementData.measureType}\n`;

    // Add all measure object definitions first
    this.measurementData.measureObjList.forEach(measureObj => {
      propertiesContent += `pm.measure.object.${this.neTypeId}${this.measurementData.measureId}${measureObj.measureObjId}=${measureObj.abbreviation.toUpperCase()}\n`;
    });

    // Process counters
    this.measurementData.measureObjList.forEach(measureObj => {
      measureObj.counterList.forEach(counter => {
        const counterId = this._generateCounterId(counterIndex);
        propertiesContent += `${counterId}=${counter.name} (${counter.unit})\n`;
        counterIndex++;
      });
    });

    // Process KPIs
    this.measurementData.measureObjList.forEach(measureObj => {
      measureObj.kpiList.forEach(kpi => {
        const kpiId = `K${this._generateKpiId(kpiIndex).padStart(10, '0')}`;
        propertiesContent += `${kpiId}=${kpi.name} (${kpi.unit})\n`;
        kpiIndex++;
      });
    });

    return propertiesContent;
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

  private _convertFormula(formula: string, measureObj: MeasureObj) {
    if (formula) {
      const nameToNumericId: Record<string, string> = {};
      measureObj.counterList.forEach(c => {
        nameToNumericId[c.name] = c._numericId!;
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

  private _generateENodeB() {
    const eNodeBStructure = {
      "neVersion": this.neVersion,
      "neTypeId": this.neTypeId,
      "neTypeName": this.neTypeName,
      "measureObjTypeList": [
        {
          "measureObjTypeId": `${this.neTypeId}${this.measurementData.measureId}`,
          "name": this.measurementData.measureType,
          "commAttributes": ["cellId"],
          "commAttributeVals": ["U8"],
          "measureObj": []
        }
      ] as any[]
    };

    this.measurementData.measureObjList.forEach(measureObj => {
      const measureObjStructure = {
        "measureObjId": `${this.neTypeId}${this.measurementData.measureId}${measureObj.measureObjId}`,
        "name": measureObj.name.trim(),
        "dataUpPeriodMod": "0",
        "counterList": [] as string[],
        "kpiList": [] as any[]
      } as any;

      measureObj.counterList.forEach(counter => {
        measureObjStructure.counterList.push(counter.id);
      });

      measureObj.kpiList.forEach(kpi => {
        const kpiId = kpi.kpiId
        if (kpiId) {
          const kpiNumId = parseInt(kpi.kpiId);
          const convertedFormula = this._convertFormula(kpi.formula, measureObj);
          const kpiCounterList = this.getKpiCounterList(kpi).join(',');

          measureObjStructure.kpiList.push({
            "kpiId": kpiNumId,
            "kpiCounterList": kpiCounterList,
            "formula": convertedFormula
          });
        }
      });

      eNodeBStructure.measureObjTypeList[0].measureObj.push(measureObjStructure);
    });
    return eNodeBStructure;
  }

  downloadENodeB() {
    const blob = new Blob([JSON.stringify(this._generateENodeB(), null, 2)], {
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

  restoreFromLocalStorage(): void {
    const savedJson = localStorage.getItem('hyper_config');
    if (savedJson) {
      this.measurementData = JSON.parse(savedJson);
      this.showRestoreBanner = false;
      this._normalizeCountersAndKpis(this.measurementData);
      // this._startUpdateLocalstorageTimerInterval();
      this._initForm();
    }
  }

  clearLocalStorage(): void {
    localStorage.removeItem('hyper_config');
    // this.measurementData = null;
    this.showRestoreBanner = false;
  }

  saveToLocalStorage(): void {
    localStorage.setItem('hyper_config', JSON.stringify(this.form.getRawValue()));
    this.showRestoreBanner = false;
  }

  downloadHyperConfigFiles() {
    const blob = new Blob([JSON.stringify(this.form.getRawValue(), null, 2)], {
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

  private _convertHyperCounterKpiToKpiSetting() {
    // Initialize the result object
    const kpiSetting = {} as any;

    // Process each measureObj in the hyperCounterKpi
    this.form.getRawValue().measureObjList.forEach((measureObj: MeasureObj) => {
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

  private _convertHyperCounterKpiToDefaultFormulas() {
    const defaultFormulas = [] as any[];
    let idCounter = 1;

    // Sub-category mapping from abbreviations
    // const subCategoryMapping = {
    //   'RRC': 'RRC',
    //   'DL': 'DL',
    //   'UL': 'UL',
    //   'E-RAB': 'E-RAB',
    //   'MAC': 'MAC',
    //   'S1': 'S1AP' // Note: S1 maps to S1AP in the default format
    // };

    // Helper function to parse formula string and convert to array format
    function parseFormulaToArray(formulaString: string): string[] {
      let normalized = formulaString.replace(/\s+/g, ''); // remove all whitespace (spaces, tabs, newlines)
      // Do not remove parentheses from the start/end
      // Split by operators and parentheses, keeping the delimiters
      const tokens = normalized.split(/(\+|\-|\*|\/|\(|\))/g).filter(token => token.trim() !== '');

      // Clean up tokens and return array
      return tokens.map(token => token.trim());
    }

    // Helper function to determine indicator based on KPI name/title
    // function getIndicator(name: string, title: string): string {
    //   const lowerName = name.toLowerCase();
    //   const lowerTitle = title.toLowerCase();

    //   // Negative indicators (failure rates, discard rates, etc.)
    //   if (lowerName.includes('failure') || lowerName.includes('discard') ||
    //     lowerTitle.includes('failure') || lowerTitle.includes('discard') ||
    //     lowerName.includes('reject')) {
    //     return 'N';
    //   }

    //   // Default to positive indicator
    //   return 'P';
    // }

    // Process each measureObj in the hyperCounterKpi
    this.form.getRawValue().measureObjList.forEach((measureObj: MeasureObj) => {
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
    this.form.getRawValue().measureObjList.forEach((measureObj: MeasureObj) => {
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

  openFormulaFullscreenEdit(measureObj: MeasureObj | null, formControl: AbstractControl | null) {
    this.availableCounters = measureObj?.counterList.map(c => ({ name: c.name, id: c.id, displayName: c.name || '' })) || [];
    this.initialFormula = formControl?.value || '';
    this.showFullscreenFormulaEditor = true;
    this._kpiFormulaEditFc = formControl;
  }

  closeFormulaFullscreenEdit() {
    this.showFullscreenFormulaEditor = false;
    this.availableCounters = [];
    this.initialFormula = '';
    this.newFormula = '';
    this.isValid = false;
    this._kpiFormulaEditFc = null;
  }



  onFormulaChange(formula: string) {
    this.newFormula = formula;
  }

  onValidationChange(isValid: boolean) {
    this.isValid = isValid;
  }

  saveFormula(): void {
    if (this.isValid) {
      if (this._kpiFormulaEditFc) {
        this._kpiFormulaEditFc.setValue(this.newFormula, { emitEvent: true });
        this._kpiFormulaEditFc.markAsDirty();
        this._kpiFormulaEditFc.updateValueAndValidity();
      }
      this.closeFormulaFullscreenEdit();
    }
  }
}
