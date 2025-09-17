import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { interval } from 'rxjs';

interface measurementData {
  measureType: string,
  measureId: string,
  measureObjList: MeasureObj[]
}

interface Counter {
  name: string;
  unit: string;
  id: string;
  cumulative: boolean;
  _numericId?: string;
}

interface KPI {
  kpiId: string;
  // kpiCounterList: string;
  formula: string;
  formulaWithCountersId?: string
  name: string;
  indicator: string; // "p" or "n"
  _usedCounters: Counter[]
}

interface MeasureObj {
  measureObjId: string;
  name: string;
  counterList: Counter[];
  kpiList: KPI[];
  filteredCounterList?: Counter[];
  filteredKpiList?: KPI[];
  kpiSearchTerm?: string;
  counterSearchTerm?: string;
  _show?: boolean;
}
@Component({
  imports: [
    CommonModule,
    FormsModule
  ],
  selector: 'app-cell-measurement',
  templateUrl: './cell-measurement.html',
})
export class CellMeasurementComponent implements OnInit {
  expandedSections: { [key: string]: boolean } = {};
  viewMode: 'ui' | 'json' = 'ui';
  searchTerm: string = '';
  editingCounter: { [key: string]: boolean } = {};
  editedCounterName: { [key: string]: string } = {};
  measurementData = {
    measureType: "Cell Measurement",
    measureId: "201101",
    measureObjList: <MeasureObj[]>[
      {
        measureObjId: "2011018001",
        name: "Radio Resource Control measurements",
        counterList: [],
        kpiList: [],
        _show: true
      }
    ]
  };


  ngOnInit(): void {
    // interval(1000).subscribe(() => {
    //   this._normalizeCountersAndKpis(this.measurementData);
    //   this._updateMeasurementObject();
    // })
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
        this._updateMeasurementObject(); // trigger UI update
      } catch (err) {
        console.error("❌ Invalid JSON file", err);
        alert("The uploaded file is not a valid JSON.");
      }
    };
    reader.readAsText(file);
  }

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
        obj.filteredCounterList = obj.counterList;
        obj.filteredKpiList = obj.kpiList;
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
        obj._show = true
      } else {
        obj._show = false
      }
    });
  }
  filterCounters(measureObj: MeasureObj) {
    const term = measureObj.counterSearchTerm?.toLowerCase().trim() || '';
    if (!term) {
      measureObj.filteredCounterList = measureObj.counterList;
      return;
    }
    measureObj.filteredCounterList = measureObj.counterList.filter(counter =>
      counter.name.toLowerCase().includes(term) || counter.id.toLowerCase().includes(term)
    );
  }
  filterKpis(measureObj: MeasureObj) {
    const term = measureObj.kpiSearchTerm?.toLowerCase() || '';
    if (!term) {
      measureObj.filteredKpiList = measureObj.kpiList;
      return;
    }
    measureObj.filteredKpiList = measureObj.kpiList.filter(kpi =>
      kpi.name.toLowerCase().includes(term) || kpi.kpiId.toString().includes(term)
    );
  }

  // -------------------------------
  // CRUD operations for Measurement Objects
  // -------------------------------
  addMeasurementObject() {
    this.measurementData.measureObjList.push({
      measureObjId: "201101" + (8000 + this.measurementData.measureObjList.length + 1).toString().padStart(4, '0'),
      name: "New Measurement Object",
      counterList: [],
      kpiList: []
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
  addCounter(measureObj: MeasureObj) {
    measureObj.counterList.push({
      name: "New Counter",
      unit: "unit",
      id: '',
      cumulative: false
    });
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
    this._normalizeCountersAndKpis(this.measurementData);
    this._updateMeasurementObject();
  }

  // -------------------------------
  // CRUD operations for KPIs
  // -------------------------------
  addKpi(measureObj: MeasureObj) {
    measureObj.kpiList.push({
      kpiId: '0',
      formula: "",
      name: "New KPI",
      indicator: "p",
      _usedCounters: []
    });
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

    // return measureObj.kpiList.filter(kpi => {
    //   const ids = kpi.kpiCounterList
    //     ? kpi.kpiCounterList.split(",").map(id => id.trim())
    //     : [];
    //   return ids.includes(counter._numericId || '');
    // });

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
    return `C00000000${index.toString()}`;
  }

  private _generateKpiId(index: number): string {
    // index starts from 1
    return `110${index.toString()}`;
  }


  private _updateMeasurementObject() {
    this.filterMeasurementObjects(); // Update filtered view
  }

  validateFormula(formula: string, availableCounters: Counter[]): string[] {
    if (!formula || !formula.trim()) {
      return ["Formula is empty."];
    }

    const errors: string[] = [];

    // Allowed tokens: numbers, operators, parentheses, counter names
    const allowedOperators = /^[+\-*/()]+$/;

    // Split by whitespace and operators, but keep numbers and words
    const tokens = formula
      .split(/([^a-zA-Z0-9_]+)/) // split but keep delimiters
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const counterNames = availableCounters.map(c => c.name);

    for (const token of tokens) {
      if (!isNaN(Number(token))) {
        // ✅ number
        continue;
      } else if (allowedOperators.test(token)) {
        // ✅ operator
        continue;
      } else if (counterNames.includes(token)) {
        // ✅ counter name
        continue;
      } else {
        // ❌ invalid
        errors.push(`Invalid token "${token}" in formula`);
      }
    }

    return errors;
  }

  private _normalizeCountersAndKpis(measureObjData: measurementData) {
    let counterIdSeq = 1;
    let kpiIdSeq = 1;
    measureObjData.measureObjList.forEach(measureObj => {

      // 1. Assign counter IDs
      measureObj.counterList.forEach((counter, i) => {
        counter.id = this._generateCounterId(counterIdSeq);
        counter._numericId = counterIdSeq.toString();
        counterIdSeq++;
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

        // Normalize formula → wrap numeric IDs with $…
        if (kpi.formula) {
          let normalized = kpi.formula;  // start with original
          Object.entries(nameToNumericId).forEach(([name, numId]) => {
            const regex = new RegExp(`\\b${name}\\b`, "g");
            normalized = normalized.replace(regex, `$${numId}`);
          });
          kpi.formulaWithCountersId = normalized;
        }

        kpi._usedCounters = usedCounters;
        // kpi._usedCounters = measureObj.counterList.filter(counter =>
        //   counter._numericId ? kpi.kpiCounterList.split(',').includes(counter._numericId) : false
        // );


      });
    })
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

  // onKpiFormulaChange(measureObj: MeasureObj, kpi: KPI) {
  //   if (!kpi.formula) {
  //     kpi._usedCounters = [];
  //     return;
  //   }

  //   // Find all $<number>$ patterns in the formula
  //   const counterIds = (kpi.formula.match(/\$(\d+)\$/g) || [])
  //     .map(match => match.replace(/\$/g, "")); // remove $ → "31", "32"

  //   // Map numeric IDs to counters
  //   kpi._usedCounters = measureObj.counterList.filter(counter =>
  //     counter._numericId ? counterIds.includes(counter._numericId) : false
  //   );
  // }

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
    }
    return errors;
  }

  // Existing methods here (extractCounterNamesFromFormula, extractCounterIdsFromFormula, etc.)

  startEditingCounter(counter: any) {
    this.editingCounter[counter.id] = true;
    this.editedCounterName[counter.id] = counter.name;
  }

  // // Called whenever counter name is changed
  // onCounterNameChange(measureObj: MeasureObj, counter: Counter) {
  //   // Update all KPIs in this measureObj that use this counter
  //   measureObj.kpiList.forEach(kpi => {
  //     // Update counter names in counterList
  //     kpi._usedCounters = kpi._usedCounters?.map(c =>
  //       c.id === counter.id ? { ...c, name: counter.name } : c
  //     );

  //     // Update formula strings: replace old counter name with new one
  //     if (kpi.formula) {
  //       kpi.formula = this.updateFormulaCounterName(kpi.formula, counter.id, counter.name);
  //     }
  //   });
  // }


  // // Replace counter name in formula string safely
  // updateFormulaCounterName(formula: string, counterId: string, newName: string): string {
  //   const counterIds = this.extractCounterIdsFromFormula(formula);
  //   const counterNames = this.extractCounterNamesFromFormula(formula);

  //   // Build mapping of counterId -> name
  //   const mapIdToName: Record<string, string> = {};
  //   counterIds.forEach((id, i) => mapIdToName[id] = id === counterId ? newName : counterNames[i]);

  //   // Rebuild formula with updated names
  //   let updatedFormula = formula;
  //   for (const id of Object.keys(mapIdToName)) {
  //     const oldName = counterNames[counterIds.indexOf(id)];
  //     updatedFormula = updatedFormula.replace(new RegExp(`\\b${oldName}\\b`, 'g'), mapIdToName[id]);
  //   }
  //   return updatedFormula;
  // }

  // // Get dependencies for display & updates
  // getCounterDependencies(measureObj: MeasureObj, counterId: string) {
  //   return measureObj.kpiList
  //     .filter(kpi =>
  //       kpi._usedCounters?.some(c => c.id === counterId) ||
  //       this.extractCounterIdsFromFormula(kpi.formula).includes(counterId)
  //     )
  //     .map(kpi => ({
  //       kpiName: kpi.name,
  //       usedInCounterList: kpi._usedCounters?.some(c => c.id === counterId),
  //       usedInFormula: this.extractCounterIdsFromFormula(kpi.formula).includes(counterId)
  //     }));
  // }

  confirmCounterNameChange(counter: Counter) {
    const newName = this.editedCounterName[counter.id];
    if (!newName || newName.trim() === counter.name) {
      this.cancelCounterEdit(counter);
      return;
    }

    const oldName = counter.name; // ✅ keep old name before changing

    // Find all KPIs that use this counter
    const affectedKpis = this.measurementData.measureObjList
      .flatMap((mo: any) => mo.kpiList || [])
      .filter((kpi: KPI) =>
        (kpi._usedCounters?.map(c => c._numericId) || "").includes(counter?._numericId || '') ||
        (kpi.formula || "").includes(`$${counter?._numericId}`)
      );

    if (affectedKpis.length > 0) {
      const confirmMsg = `⚠️ Warning: The counter "${oldName}" is used in ${affectedKpis.length} KPI(s).\n\n` +
        `Do you want to update all affected KPIs with the new counter name "${newName}"?`;
      if (!confirm(confirmMsg)) {
        return; // user cancelled
      }
    }

    // Update KPIs that use this counter
    for (let kpi of affectedKpis) {
      if (kpi.formula) {
        kpi.formula = kpi.formula.replace(
          new RegExp(`\\b${oldName}\\b`, 'g'), // ✅ use old name here
          newName
        );
      }
    }

    // Apply change to counter after updating KPIs
    counter.name = newName;

    this._normalizeCountersAndKpis(this.measurementData);
    this.editingCounter[counter.id] = false;
  }

  cancelCounterEdit(counter: any) {
    this.editingCounter[counter.id] = false;
  }
  // // Extract counter IDs from a formula string
  // extractCounterIdsFromFormula(formula: string, measureObj?: { counterList: Counter[] }): string[] {
  //   if (!formula || !measureObj) return [];
  //   const ids: string[] = [];
  //   measureObj.counterList.forEach(counter => {
  //     const regex = new RegExp(`\\b${counter.name}\\b`, 'g');
  //     if (regex.test(formula)) {
  //       ids.push(counter.id);
  //     }
  //   });
  //   return ids;
  // }

  // // Extract counter NAMES from a formula string
  // extractCounterNamesFromFormula(formula: string, measureObj?: { counterList: Counter[] }): string[] {
  //   if (!formula || !measureObj) return [];
  //   const names: string[] = [];
  //   measureObj.counterList.forEach(counter => {
  //     const regex = new RegExp(`\\b${counter.name}\\b`, 'g');
  //     if (regex.test(formula)) {
  //       names.push(counter.name);
  //     }
  //   });
  //   return names;
  // }
}
