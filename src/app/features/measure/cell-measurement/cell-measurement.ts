import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FormulaInput } from '../../../shared/formula-input/formula-input';
import { UNITS } from '../../../core/interfaces/unit.types';
import { FormulaParserService } from '../../../core/helper/formula-helper';
import { Counter, CounterItem, KPI, MeasureObjType, MeasureObj, MeasureType } from '../../../core/interfaces/measures.interfaces';
import { MeasurService } from '../measur.service';
import { MeasureExport } from '../export/export';
import { RouteService } from '../../../core/services/route/route.service';


@Component({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FormulaInput,
    MeasureExport
  ],
  selector: 'app-cell-measurement',
  templateUrl: './cell-measurement.html',
})
export class CellMeasurementComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);

  expandedSections: { [key: string]: boolean } = {};
  searchTerm: string = '';
  editingCounterName: { [key: string]: boolean } = {};
  editingKpiName: { [key: string]: boolean } = {};
  editingKpiTitle: { [key: string]: boolean } = {};
  editingKpiFormula: { [key: string]: boolean } = {};
  editingMeasureId = false;
  editingMeasureObjName: { [key: string]: boolean } = {};;
  editingMeasureObjAbbreviation: { [key: string]: boolean } = {};
  addingNewCounter = false;
  addingNewMeasureObj = false;
  newCounterForm!: FormGroup;
  newMeasureObjForm!: FormGroup;
  newKpiForm!: FormGroup;
  addingNewKpi = false;
  availableCounters: CounterItem[] = [];
  private _kpiFormulaEditFc!: AbstractControl | null;
  $destroy = new Subject();
  initialFormula: string = '';
  newFormula: string = '';
  isValid: boolean = true;
  readonly measureObjTypeId!: string;
  readonly units!: string[];
  showFullscreenFormulaEditor: boolean = false;
  showFullscreenTransferCounter: boolean = false;
  showFullscreenTransferKpi: boolean = false;
  selectedCounterToTransfer!: Counter | null;
  selectedKpiToTransfer!: KPI | null;
  selectedMeasureObjForTransfer!: MeasureObj | null;
  selectedTargetMeasureObjId!: string | null;
  showSuccessMessage = false;
  measurementData: MeasureObjType = {
    measureObjTypeId: '',
    measureObjList: [],
    measureType: ''
  }

  form: FormGroup;
  getKpisUsingCounterObject: { [key: string]: KPI[] } = {};
  getCountersUsedByKpiObject: { [key: string]: Counter[] } = {};
  routeService = inject(RouteService);
  private _route = inject(ActivatedRoute);
  private _router = inject(Router);
  private formulaParser = inject(FormulaParserService);
  measurService = inject(MeasurService);
  allCounters: Counter[] = [];
  allKpis: KPI[] = [];
  allMeasureObjs: MeasureObj[] = [];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    this.measureObjTypeId = this._route.snapshot.paramMap.get('typeId') || '';
    this.units = UNITS;

    this.form = this.fb.group({
      measureType: [''],
      measureObjTypeId: [this.measureObjTypeId],
      measureObjList: [[]]
    });
  }


  ngOnInit(): void {
    const file = this.measurService.getMeasureTypeById(this.measureObjTypeId);
    if (!file) {
      alert("No saved measurement configuration found for this measurement type.");
      setTimeout(() => {
        this.goBack();
        return;
      }, 3000);
    };
    const data = file!;
    this._normalizeCountersAndKpis(data);
    this.measurementData = data;
    this._updateMeasurementObject();
    this._initForm();
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
              id: [counter.id],
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
              kpiId: [kpi.kpiId],
              title: [kpi.title],
            })
          )
        )
      })
    );

    this.form = this.fb.group({
      measureType: [this.measurementData.measureType],
      measureObjTypeId: [this.measurementData.measureObjTypeId],
      measureObjList: this.fb.array(measureObjFormGroups)
    });
    // this.form.get('measureType')?.valueChanges.pipe(takeUntil(this.$destroy)).subscribe(() => this.startEditingMeasureType());
    this.form.get('measureObjTypeId')?.valueChanges.pipe(takeUntil(this.$destroy)).subscribe(() => this.startEditingMeasureId());
    // (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
    //   const measureNameControl = (measureObjGroup.get('name') as FormControl);
    //   measureNameControl?.valueChanges
    //     .pipe(takeUntil(this.$destroy))
    //     .subscribe((newName: string) => {
    //       // this.startEditingCounterName(this.measurementData.measureObjList[objIndex].counterList[counterIndex]);
    //     });
    // });
    // (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
    //   const measureObjIdControl = (measureObjGroup.get('measureObjId') as FormControl);
    //   measureObjIdControl?.valueChanges
    //     .pipe(takeUntil(this.$destroy))
    //     .subscribe((newMeasureObjId: string) => {
    //       // this.startEditingCounterName(this.measurementData.measureObjList[objIndex].counterList[counterIndex]);
    //     });
    // });
    // (this.form.get('measureObjList') as FormArray).controls.forEach((measureObjGroup, objIndex) => {
    //   const abbreviationControl = (measureObjGroup.get('abbreviation') as FormControl);
    //   abbreviationControl?.valueChanges
    //     .pipe(takeUntil(this.$destroy))
    //     .subscribe((newAbbreviation: string) => {
    //       // this.startEditingCounterName(this.measurementData.measureObjList[objIndex].counterList[counterIndex]);
    //     });
    // });
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

  onObjectMeasureTitleEditClick(id: string): void {
    this.editingMeasureObjName[id] = true;
    this.editingMeasureObjAbbreviation[id] = true;
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

  removeMeasurementObject(index: number) {
    if (!confirm("Are you sure you want to delete this measurement object?")) {
      return;
    }
    this.measurementData.measureObjList.splice(index, 1);
    const measureObjArray = this.form.get('measureObjList') as FormArray;
    measureObjArray.removeAt(index);
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


  // Find KPIs that reference a counter
  getKpisUsingCounter(measureObj: MeasureObj, counter: Counter): KPI[] {
    return this.measurService.getKpisUsingCounter(counter);
    // if (!counter._numericId) return [];
    // return measureObj.kpiList.filter(kpi => kpi._usedCounters?.some(c => c._numericId === counter._numericId))
  }

  // Find Counters referenced by a KPI (numeric IDs → counters)
  getCountersUsedByKpi(measureObj: MeasureObj, kpi: KPI): Counter[] {
    // if (!kpi.kpiCounterList) return [];
    return this.measurService.getCountersUsedByKpi(kpi);
    // const counterIds = kpi._usedCounters?.map(counter => counter._numericId);

    // return measureObj.counterList.filter(counter =>
    //   counter._numericId ? counterIds?.includes(counter._numericId) : false
    // );
  }

  getKpiCounterList(kpi: KPI): string[] {
    return this.measurService.getKpiCounterList(kpi);
    // if (!kpi._usedCounters) {
    //   return [];
    // }
    // return kpi._usedCounters.map(counter => counter?._numericId || '') || []
  }


  getKpiFormulaForExport(kpi: KPI): string {
    if (!kpi.formulaWithCountersId) {
      return '';
    }
    return kpi.formulaWithCountersId;
  }

  goBack() {
    this._router.navigate(['/measurement-type-config']);
  }

  private _updateMeasurementObject() {
    this.saveToLocalStorage();
    this.filterMeasurementObjects(); // Update filtered view
  }

  validateCounterName(counter: Counter): string[] {
    const errors: string[] = [];
    if (!counter.name || !counter.name.trim()) {
      errors.push("Counter name is required.");
    }
    const existingNames = this.allCounters.filter(c => c.id !== counter.id).map(c => c.name);
    if (existingNames.some(existingName => existingName === counter.name)) {
      errors.push(`${counter.name} is already used by another counter. Counter names must be unique.`);
    }
    return errors;
  }

  validateMeasureObjTitle(measureObj: MeasureObj): string[] {
    const errors: string[] = [];
    if (!measureObj.name || !measureObj.abbreviation.trim()) {
      errors.push("measureObj name adn abbreviation are required.");
    }
    const existingNames = this.measurementData.measureObjList.filter(m => m.measureObjId !== measureObj.measureObjId).map(m => m.name);
    if (existingNames.some(existingName => existingName === measureObj.name)) {
      errors.push(`${measureObj.name} is already used by another measure objects. measure objects names must be unique.`);
    }
    const existingAbbr = this.measurementData.measureObjList.filter(m => m.measureObjId !== measureObj.measureObjId).map(m => m.abbreviation);
    if (existingAbbr.some(abbr => abbr === measureObj.abbreviation)) {
      errors.push(`${measureObj.abbreviation} is already used by another measure objects. measure objects abbreviation must be unique.`);
    }
    return errors;
  }

  validateKpiName(kpi: KPI): string[] {
    const errors: string[] = [];
    if (!kpi.name || !kpi.name.trim()) {
      errors.push("KPI name is required.");
    }
    const existingNames = this.allKpis.filter(k => k.kpiId !== kpi.kpiId).map(k => k.name);
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

  private _initializeVariables(): void {

    this.allCounters = this.measurService.getAllCounters();
    this.allKpis = this.measurService.getAllKpis();
    this.allMeasureObjs = this.measurService.getMeasureObject()?.measureObjTypeList.flatMap(m => m.measureObjList)!
    this.allCounters.forEach(c => {
      this.getKpisUsingCounterObject[c.id] = this.measurService.getKpisUsingCounter(c);
    });
    this.allKpis.forEach(k => {
      this.getCountersUsedByKpiObject[k.kpiId] = this.measurService.getCountersUsedByKpi(k);
    });
  }

  private _normalizeCountersAndKpis(measureObjData: MeasureObjType) {
    measureObjData.measureObjList.forEach((measureObj, measureIndex) => {
      // measureObj.measureObjId = this.measurService.getMeasureObjId(measureObj, this.measurService.getMeasureObject()?.measureObjTypeList!)!;
      measureObj._show = true;
      // 1. Assign counter IDs
      measureObj.counterList.forEach((counter, i) => {
        // counter.id = this._generateCounterId(counterIdSeq);
        counter._numericId = `${parseInt(counter.id.slice(1), 10)}`;
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
        // kpi.kpiId = this._generateKpiId(kpiIdSeq);
        kpi._show = true;

        // Normalize formula → wrap numeric IDs with $…
        if (kpi.formula) {
          kpi.formulaWithCountersId = this.measurService.convertFormula(kpi.formula)
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
    const validIds = this.allCounters.map(c => `${parseInt(c.id.slice(1), 10)}`);

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
      const kpiErrors2 = this.measurService.validateFormula(kpi.formula, this.allCounters);
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

  getAllErrors = computed<string[]>(() => {
    let allErrors: string[] = [];
    this.measurementData.measureObjList.forEach(measureObj => {
      const counterErrors = this.getAllCountersErrors(measureObj);
      const kpiErrors = this.getAllKpiErrors(measureObj);
      allErrors.push(...counterErrors, ...kpiErrors);
    });
    return allErrors;
  })

  startEditingCounterName(counter: Counter) {
    this.editingCounterName[counter.id] = true;
  }


  startEditingMeasureId(): void {
    this.editingMeasureId = true;
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

  startAddingNewMeasureObj() {
    if (this.addingNewMeasureObj) {
      return; // already adding
    }
    this.newMeasureObjForm = this.fb.group({
      name: ['', [Validators.required]],
      abbreviation: ['', [Validators.required]],
      counterList: this.fb.array([]),
      kpiList: this.fb.array([])
    });
    this.addingNewMeasureObj = true;
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

  confirmAddNewMeasureObj() {
    if (!this.newMeasureObjForm) return;
    if (this.newMeasureObjForm.invalid) {
      alert("Please fill in all required fields for the new measure object.");
      return;
    }
    const newMeasurObj: MeasureObj = {
      name: this.newMeasureObjForm.get('name')?.value,
      abbreviation: this.newMeasureObjForm.get('abbreviation')?.value,
      measureObjId: this.measurService.getNewMeasureObjId()!,
      counterList: [],
      kpiList: [],
      counterSearchTerm: '',
      kpiSearchTerm: '',
      _show: true,
    };
    // Validate name uniqueness
    const nameErrors = this.validateMeasureObjTitle(newMeasurObj);
    if (nameErrors.length > 0) {
      alert("❌ Invalid measure object name or abbreviation:\n" + nameErrors.join('\n'));
      return;
    }
    this.measurementData.measureObjList.push(newMeasurObj);
    this._normalizeCountersAndKpis(this.measurementData);
    this.$destroy.next(null); // stop any ongoing subscriptions
    this.$destroy.complete();
    this.$destroy = new Subject(); // recreate for future use
    this._initForm();
    this.addingNewMeasureObj = false;
    this.newMeasureObjForm = new FormGroup({});
    this._updateMeasurementObject();
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
      id: this.measurService.getNewCounterId()!,
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
      kpiId: this.measurService.getNewKpiId()!,
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
    const formulaErrors = this.measurService.validateFormula(newKpi.formula, this.allCounters);
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

  cancelAddNewMeasureObj() {
    this.addingNewMeasureObj = false;
    this.newMeasureObjForm = new FormGroup({});
  }

  cancelAddNewCounter() {
    this.addingNewCounter = false;
    this.newCounterForm = new FormGroup({});
  }


  confirmMeasureIdChange(): boolean | void {
    const newName = this.form.get('measureObjTypeId')?.value;
    if (newName.trim() === this.measurementData.measureObjTypeId) {
      this.cancelMeasureIdEdit();
      return;
    }

    if (!newName) {
      alert("❌ Invalid Measurment Id name:\n");
      return;
    }

    const oldName = this.measurementData.measureObjTypeId;
    // Apply change to counter after updating KPIs
    this.measurementData.measureObjTypeId = newName;
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
    this.editingMeasureId = false;
    return true;
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

  confirmMeasureObjTitleChange(measureObjFormControl: AbstractControl, measureObj: MeasureObj): boolean | void {
    const newName = measureObjFormControl.get('name')?.value;
    const newAbbr = measureObjFormControl.get('abbreviation')?.value;
    if ((newName.trim() === measureObj.name) && (newAbbr.trim() === measureObj.abbreviation)) {
      this.cancelMeasureObjTitleEdit(measureObjFormControl, measureObj);
      return;
    }

    if (this.validateMeasureObjTitle(measureObjFormControl.value).length > 0) {
      alert("❌ Invalid measure object name or abbreviation:\n" + this.validateMeasureObjTitle(measureObjFormControl.value).join('\n'));
      this.cancelMeasureObjTitleEdit(measureObjFormControl, measureObj);
      return;
    }

    // Apply change to counter after updating KPIs
    measureObj.name = newName;
    measureObj.abbreviation = newAbbr;
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
    this.editingMeasureObjName[measureObj.measureObjId] = false;
    this.editingMeasureObjAbbreviation[measureObj.measureObjId] = false;
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

    const formulaErrors = this.measurService.validateFormula(newFormula, this.allCounters);
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

  cancelMeasureObjTitleEdit(measureObjFormControl: AbstractControl, measureObj: MeasureObj) {
    // Revert name in form if needed
    const nameControl = measureObjFormControl.get('name');
    const abbrControl = measureObjFormControl.get('abbreviation');
    if (nameControl && nameControl.value !== measureObj.name) {
      nameControl.setValue(measureObj.name, { emitEvent: false });
    }
    if (abbrControl && abbrControl.value !== measureObj.abbreviation) {
      abbrControl.setValue(measureObj.abbreviation, { emitEvent: false });
    }
    this.editingMeasureObjName[measureObj.measureObjId] = false;
    this.editingMeasureObjAbbreviation[measureObj.measureObjId] = false;
  }


  cancelMeasureIdEdit(): void {
    const nameControl = this.form.get('measureObjTypeId');
    if (nameControl && nameControl.value !== this.measurementData.measureObjTypeId) {
      nameControl.setValue(this.measurementData.measureObjTypeId, { emitEvent: false });
    }
    this.editingMeasureId = false;
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

  getCounterLength = computed<number>(() => {
    return this.measurementData.measureObjList.reduce((sum, mo) => sum + mo.counterList.length, 0);

  })

  getKpiLength = computed<number>(() => {
    return this.measurementData.measureObjList.reduce((sum, mo) => sum + mo.kpiList.length, 0);
  })





  clearLocalStorage(): void {
    this.measurService.removeTypeObjFromStorageById(this.measureObjTypeId);
    // this.measurementData = null;
    // this.showRestoreBanner = false;
  }

  saveToLocalStorage(): void {
    this.routeService.isLoadingRoute.set(true);
    requestIdleCallback(() => {
      this.measurService.addTypeObjIntoLocalStorageById(this.measureObjTypeId, this.form.getRawValue());
      this._initializeVariables();
      this.routeService.isLoadingRoute.set(false);
    });
    // this.showRestoreBanner = false;
  }

  openFormulaFullscreenEdit(measureObj: MeasureObj | null, formControl: AbstractControl | null) {
    this.availableCounters = this.allCounters.map(c => ({ name: c.name, id: c.id, displayName: c.name || '' })) || [];
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

  openFormulaFullscreenTransferCounter(measureObj: MeasureObj, counter: Counter) {
    this.selectedCounterToTransfer = counter;
    this.selectedMeasureObjForTransfer = measureObj;
    this.showFullscreenTransferCounter = true;
  }

  onConfirmCounterTransfer() {
    if (!confirm("Are you sure you want to transfer this counter?")) return;
    const measureObject = this.measurService.getMeasureObject();
    if (!measureObject) {
      return;
    }
    const index = this.selectedMeasureObjForTransfer?.counterList.findIndex(c => c.id === this.selectedCounterToTransfer?.id);
    const targetMeasurObj = this.allMeasureObjs.find(mo => mo.measureObjId === this.selectedTargetMeasureObjId);

    if (typeof (index) === 'number' && this.selectedMeasureObjForTransfer && this.selectedCounterToTransfer && targetMeasurObj) {
      this.selectedMeasureObjForTransfer?.counterList.splice(index, 1);
      const measureObjArray = this.form.get('measureObjList') as FormArray;
      const measureObjGroup = measureObjArray.at(this.measurementData.measureObjList.indexOf(this.selectedMeasureObjForTransfer));
      const counterArray = measureObjGroup.get('counterList') as FormArray;
      counterArray.removeAt(index);

      const newCounter: Counter = {
        name: this.selectedCounterToTransfer?.name,
        unit: this.selectedCounterToTransfer.unit,
        cumulative: this.selectedCounterToTransfer.cumulative,
        id: this.selectedCounterToTransfer.id,
        _show: true,
      };
      targetMeasurObj.counterList.push(newCounter);
      const index1 = measureObject.measureObjTypeList.findIndex(item => item.measureObjList.some(mo => mo.measureObjId === targetMeasurObj.measureObjId));
      const index2 = measureObject.measureObjTypeList[index1].measureObjList.findIndex(item => item.measureObjId === targetMeasurObj.measureObjId);
      measureObject.measureObjTypeList[index1].measureObjList[index2] = targetMeasurObj;
      this._normalizeCountersAndKpis(this.measurementData);
      this.$destroy.next(null); // stop any ongoing subscriptions
      this.$destroy.complete();
      this.$destroy = new Subject(); // recreate for future use
      this._initForm();
      this.addingNewCounter = false;
      this.newCounterForm = new FormGroup({});
      this._updateMeasurementObject();
      this.closeFormulaFullscreenTransferCounter();
      this.showSuccessMessage = true;
      this.measurService.addTypeObjIntoLocalStorageById(measureObject.measureObjTypeList[index1].measureObjTypeId, measureObject.measureObjTypeList[index1]);
    }
  }

  closeFormulaFullscreenTransferCounter() {
    this.selectedCounterToTransfer = null;
    this.selectedMeasureObjForTransfer = null;
    this.selectedTargetMeasureObjId = null;
    this.showFullscreenTransferCounter = false;
  }

  selectTransferTarget(event: string | null) {
    if (event) {
      this.selectedTargetMeasureObjId = event;
    }

  }

  openFormulaFullscreenTransferKpi(measureObj: MeasureObj, kpi: KPI) {
    this.selectedKpiToTransfer = kpi;
    this.selectedMeasureObjForTransfer = measureObj;
    this.showFullscreenTransferKpi = true;
  }

  onConfirmKpiTransfer() {
    if (!confirm("Are you sure you want to transfer this kpi?")) return;
    const measureObject = this.measurService.getMeasureObject();
    if (!measureObject) {
      return;
    }
    const index = this.selectedMeasureObjForTransfer?.kpiList.findIndex(k => k.kpiId === this.selectedKpiToTransfer?.kpiId);
    const targetMeasurObj = this.allMeasureObjs.find(mo => mo.measureObjId === this.selectedTargetMeasureObjId);

    if (typeof (index) === 'number' && this.selectedMeasureObjForTransfer && this.selectedKpiToTransfer && targetMeasurObj) {
      this.selectedMeasureObjForTransfer?.kpiList.splice(index, 1);
      const measureObjArray = this.form.get('measureObjList') as FormArray;
      const measureObjGroup = measureObjArray.at(this.measurementData.measureObjList.indexOf(this.selectedMeasureObjForTransfer));
      const kpiArray = measureObjGroup.get('kpiList') as FormArray;
      kpiArray.removeAt(index);

      const newKpi: KPI = {
        name: this.selectedKpiToTransfer.name,
        formula: this.selectedKpiToTransfer.formula,
        indicator: this.selectedKpiToTransfer.indicator,
        unit: this.selectedKpiToTransfer.unit,
        kpiId: this.selectedKpiToTransfer.kpiId,
        title: this.selectedKpiToTransfer.title,
        _usedCounters: [],
        _show: true,
      };
      targetMeasurObj.kpiList.push(newKpi);
      const index1 = measureObject.measureObjTypeList.findIndex(item => item.measureObjList.some(mo => mo.measureObjId === targetMeasurObj.measureObjId));
      const index2 = measureObject.measureObjTypeList[index1].measureObjList.findIndex(item => item.measureObjId === targetMeasurObj.measureObjId);
      measureObject.measureObjTypeList[index1].measureObjList[index2] = targetMeasurObj;
      this._normalizeCountersAndKpis(this.measurementData);
      this.$destroy.next(null); // stop any ongoing subscriptions
      this.$destroy.complete();
      this.$destroy = new Subject(); // recreate for future use
      this._initForm();
      this._updateMeasurementObject();
      this.closeFormulaFullscreenTransferKpi();
      this.showSuccessMessage = true;
      this.measurService.addTypeObjIntoLocalStorageById(measureObject.measureObjTypeList[index1].measureObjTypeId, measureObject.measureObjTypeList[index1]);
    }
  }

  closeFormulaFullscreenTransferKpi() {
    this.selectedKpiToTransfer = null;
    this.selectedMeasureObjForTransfer = null;
    this.selectedTargetMeasureObjId = null;
    this.showFullscreenTransferKpi = false;
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

  hasVisibleMeasureObjItems(): boolean {
    const moList = this.measurementData.measureObjList
    return moList.some(mo => mo._show);
  }

  hasVisibleCounterItems(i: number): boolean {
    const counterList = this.measurementData.measureObjList[i].counterList;
    return counterList.some(counter => counter._show);
  }

  hasVisibleKpiItems(i: number): boolean {
    const kpiList = this.measurementData.measureObjList[i].kpiList;
    return kpiList.some(kpi => kpi._show);
  }
}
