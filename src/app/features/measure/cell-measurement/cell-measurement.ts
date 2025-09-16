import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Counter {
  name: string;
  unit: string;
  id: string;
  cumulative: boolean;
}

interface KPI {
  kpiId: string;
  kpiCounterList: string;
  formula: string;
  name: string;
  indicator: string; // "p" or "n"
}

interface MeasureObj {
  measureObjId: string;
  name: string;
  counterList: Counter[];
  kpiList: KPI[];
}

interface SearchMeasureObj {
  measureObjId: string;
  name: string;
  counterList: Counter[];
  kpiList: KPI[];
  counterSearchTerm?: string;
  kpiSearchTerm?: string;
  filteredCounterList?: Counter[];
  filteredKpiList?: KPI[];
}

@Component({
  imports: [
    CommonModule,
    FormsModule
  ],
  selector: 'app-cell-measurement',
  templateUrl: './cell-measurement.html',
})
export class CellMeasurementComponent {
  expandedSections: { [key: string]: boolean } = {};
  viewMode: 'ui' | 'json' = 'ui';
  searchTerm: string = '';
  measurementData = {
    measureType: "Cell Measurement",
    measureId: "201101",
    measureObjList: <MeasureObj[]>[
      {
        measureObjId: "2011018001",
        name: "Radio Resource Control measurements",
        counterList: [
          { name: "S1 measurements", unit: "percent", id: "C0000000031", cumulative: true },
          { name: "X2 handover measurements", unit: "count", id: "C0000000032", cumulative: false },
        ],
        kpiList: [
          { kpiId: '11001', kpiCounterList: "31,32", formula: "(($32$/$31$)*100)", name: "MAC measurements", indicator: "p" }
        ]
      }
    ]
  };
  filteredMeasurementObjects: SearchMeasureObj[] = [...this.measurementData.measureObjList];


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
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          // Basic validation
          if (json.measureType && json.measureId && Array.isArray(json.measureObjList)) {
            // Map counters to add generated IDs
            let counterIdSeq = 1;
            let kpiIdSeq = 1;
            json.measureObjList.forEach((obj: any) => {
              obj.counterList.forEach((counter: any) => {
                counter.id = `C${counterIdSeq.toString().padStart(8, '0')}`;
                counterIdSeq++;
              });
              obj.kpiList.forEach((kpi: any, kpiIdx: number) => {
                kpi.kpiId = `${110}${kpiIdSeq.toString()}`;
                kpiIdSeq++;
              });
              // Update kpiCounterList in KPIs to use generated counter IDs
              // obj.kpiList.forEach((kpi: any) => {
              //   if (kpi.kpiCounterList) {
              //     // kpiCounterList is comma-separated counter names
              //     const counterNames = kpi.kpiCounterList.split(',').map((n: string) => n.trim());
              //     const counterIds = counterNames.map((name: string) => {
              //       const found = obj.counterList.find((ctr: any) => ctr.name === name);
              //       return found ? found.id : name; // fallback to name if not found
              //     });
              //     kpi.kpiCounterList = counterIds.map((id: string) => id.replace(/^C0+/, '')).join(',');
              //   }
              // });
            });
            this.measurementData = json;
            this.filterMeasurementObjects(); // Update filtered view
            this.viewMode = 'ui'; // Switch to UI view after upload

          } else {
            alert("Invalid JSON structure.");
          }
        } catch (err) {
          alert("Error parsing JSON file.");
        }
      };
      reader.readAsText(file);
    }
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
        kpiList: obj.kpiList.map(kpi => ({
          kpiId: kpi.kpiId,
          kpiCounterList: kpi.kpiCounterList,
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
      this.filteredMeasurementObjects = this.measurementData.measureObjList.map(obj => ({ ...obj, filteredCounterList: obj.counterList, filteredKpiList: obj.kpiList }));
      return;
    }

    this.filteredMeasurementObjects = this.measurementData.measureObjList
      .map(obj => {
        const filteredCounters = obj.counterList.filter(counter =>
          counter.name.toLowerCase().includes(term) || counter.id.toLowerCase().includes(term)
        );
        const filteredKpis = obj.kpiList.filter(kpi =>
          kpi.name.toLowerCase().includes(term) || kpi.kpiId.toString().includes(term)
        );
        return { ...obj, filteredCounterList: filteredCounters, filteredKpiList: filteredKpis };
      })
      .filter(obj =>
        obj.name.toLowerCase().includes(term) ||
        obj.measureObjId.toLowerCase().includes(term) ||
        (obj.filteredCounterList && obj.filteredCounterList.length > 0) ||
        (obj.filteredKpiList && obj.filteredKpiList.length > 0)
      );

    // If no results found, reset to show all
    if (this.filteredMeasurementObjects.length === 0) {
      this.filteredMeasurementObjects = this.measurementData.measureObjList.map(obj => ({ ...obj, filteredCounterList: obj.counterList, filteredKpiList: obj.kpiList }));
      return;
    }

  }
  filterCounters(measureObj: SearchMeasureObj) {
    const term = measureObj.counterSearchTerm?.toLowerCase().trim() || '';
    if (!term) {
      measureObj.filteredCounterList = measureObj.counterList;
      return;
    }
    measureObj.filteredCounterList = measureObj.counterList.filter(counter =>
      counter.name.toLowerCase().includes(term) || counter.id.toLowerCase().includes(term)
    );
  }

  filterKpis(measureObj: SearchMeasureObj) {
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
    this.filterMeasurementObjects(); // Update filtered view
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
    this._updateMeasurementObject();
  }

  removeCounter(measureObj: MeasureObj, index: number) {
    if (!confirm("Are you sure you want to delete this counter?")) {
      return;
    }
    measureObj.counterList.splice(index, 1);
    this._updateMeasurementObject();
  }

  // -------------------------------
  // CRUD operations for KPIs
  // -------------------------------
  addKpi(measureObj: MeasureObj) {
    measureObj.kpiList.push({
      kpiId: '0',
      kpiCounterList: "",
      formula: "",
      name: "New KPI",
      indicator: "p"
    });
    this._updateMeasurementObject();
  }

  removeKpi(measureObj: MeasureObj, index: number) {
    if (!confirm("Are you sure you want to delete this KPI?")) {
      return;
    }
    measureObj.kpiList.splice(index, 1);
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

  private _updateMeasurementObject() {
    let counterIdSeq = 1;
    let kpiIdSeq = 1;
    this.measurementData.measureObjList.forEach((obj: any) => {
      obj.counterList.forEach((counter: any) => {
        counter.id = `C${counterIdSeq.toString().padStart(8, '0')}`;
        counterIdSeq++;
      });
      obj.kpiList.forEach((kpi: any, kpiIdx: number) => {
        kpi.kpiId = `${110}${kpiIdSeq.toString()}`;
        kpiIdSeq++;
      });
      // Update kpiCounterList in KPIs to use generated counter IDs
      // obj.kpiList.forEach((kpi: any) => {
      //   if (kpi.kpiCounterList) {
      //     // kpiCounterList is comma-separated counter names
      //     const counterNames = kpi.kpiCounterList.split(',').map((n: string) => n.trim());
      //     const counterIds = counterNames.map((name: string) => {
      //       const found = obj.counterList.find((ctr: any) => ctr.name === name);
      //       return found ? found.id : name; // fallback to name if not found
      //     });
      //     kpi.kpiCounterList = counterIds.map((id: string) => id.replace(/^C0+/, '')).join(',');
      //   }
      // });
    });
    this.filterMeasurementObjects(); // Update filtered view
  }
}
