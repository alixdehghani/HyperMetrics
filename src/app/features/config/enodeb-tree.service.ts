// services/enodeb-tree.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ENodeBConfig, RatType, ConfigObjType, ConfigObj, OperationType, Parameter } from './enodeb-config.model';

@Injectable({
  providedIn: 'root'
})
export class ENodeBTreeService {
  private readonly STORAGE_KEY = 'enodeb_config';
  private configSubject = new BehaviorSubject<ENodeBConfig | null>(null);
  public config$: Observable<ENodeBConfig | null> = this.configSubject.asObservable();

  constructor() {
    this._loadFromStorage(); 
  }

  private _loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        this.configSubject.next(JSON.parse(raw));
      }
    } catch {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  private _saveToStorage(config: ENodeBConfig | null): void {
    if (config) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  setConfig(config: ENodeBConfig): void {
    this.configSubject.next(config);
    this._saveToStorage(config);
  } 

  getConfig(): ENodeBConfig | null {
    return this.configSubject.value;
  }

    private _update(config: ENodeBConfig): void {
    this.configSubject.next({ ...config });
    this._saveToStorage(config);
  }
  // Helper: get configObjTypeList for a given ratTypeIndex
  private getConfigObjTypeList(ratTypeIndex: number): ConfigObjType[] | null {
    const config = this.getConfig();
    if (!config || !config.ratTypeList[ratTypeIndex]) return null;
    return config.ratTypeList[ratTypeIndex].configObjTypeList;
  }

  // Header Operations
  updateHeader(neVersion: string, neTypeId: string, neTypeName: string): void {
    const config = this.getConfig();
    if (config) {
      config.neVersion = neVersion;
      config.neTypeId = neTypeId;
      config.neTypeName = neTypeName;
      this._update(config)
    }
  }

  // RatType CRUD
  addRatType(ratType: RatType): void {
    const config = this.getConfig();
    if (config) {
      config.ratTypeList.push(ratType);
      this._update(config)
    }
  }

  updateRatType(index: number, ratType: RatType): void {
    const config = this.getConfig();
    if (config && config.ratTypeList[index]) {
      config.ratTypeList[index] = ratType;
      this._update(config)
    }
  }

  deleteRatType(index: number): void {
    const config = this.getConfig();
    if (config) {
      config.ratTypeList.splice(index, 1);
      this._update(config)
    }
  }

  // ConfigObjType CRUD
  // path[0] = ratTypeIndex, path[1] = configObjTypeIndex
  addConfigType(ratTypeIndex: number, configType: ConfigObjType): void {
    const config = this.getConfig();
    if (config && config.ratTypeList[ratTypeIndex]) {
      config.ratTypeList[ratTypeIndex].configObjTypeList.push(configType);
      this._update(config)
    }
  }

  updateConfigType(ratTypeIndex: number, index: number, configType: ConfigObjType): void {
    const config = this.getConfig();
    const list = this.getConfigObjTypeList(ratTypeIndex);
    if (config && list && list[index]) {
      list[index] = configType;
      this._update(config)
    }
  }

  deleteConfigType(ratTypeIndex: number, index: number): void {
    const config = this.getConfig();
    const list = this.getConfigObjTypeList(ratTypeIndex);
    if (config && list) {
      list.splice(index, 1);
      this._update(config)
    }
  }

  generateNewIdForConfigType(ratTypeIndex: number): string {
    const list = this.getConfigObjTypeList(ratTypeIndex);
    if (!list || list.length === 0) return '101';

    let maxId = 0;
    for (const ct of list) {
      const raw = (ct as any).id ?? (ct as any).configTypeId ?? (ct as any).typeId ?? (ct as any).name;
      if (raw == null) continue;
      let num = 0;
      if (typeof raw === 'number') {
        num = raw;
      } else if (typeof raw === 'string') {
        const m = raw.match(/(\d+)/g);
        if (m) {
          const parsed = parseInt(m[m.length - 1], 10);
          if (!isNaN(parsed)) num = parsed;
        }
      }
      if (num > maxId) maxId = num;
    }
    return String(maxId + 1);
  }

  // ConfigObj CRUD
  // path[0] = ratTypeIndex, path[1] = configObjTypeIndex, path[2+] = nested configObjList indices
  addConfigObj(path: number[], configObj: ConfigObj): void {
    const config = this.getConfig();
    if (!config || path.length < 2) return;

    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return;

    if (path.length === 2) {
      list[path[1]].configObjList.push(configObj);
      this._update(config)
      return;
    }

    let parent: any = list[path[1]].configObjList[path[2]];
    for (let i = 3; i < path.length; i++) {
      if (!parent || !parent.configObjList) return;
      parent = parent.configObjList[path[i]];
    }
    if (parent) {
      parent.configObjList = parent.configObjList || [];
      parent.configObjList.push(configObj);
    }
    this._update(config)
  }

  updateConfigObj(path: number[], configObj: ConfigObj): void {
    const config = this.getConfig();
    if (!config || path.length < 3) return;

    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return;

    if (path.length === 3) {
      list[path[1]].configObjList[path[2]] = configObj;
    } else {
      let parent: any = list[path[1]].configObjList[path[2]];
      for (let i = 3; i < path.length - 1; i++) {
        if (!parent || !parent.configObjList) return;
        parent = parent.configObjList[path[i]];
      }
      const lastIdx = path[path.length - 1];
      if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
        parent.configObjList[lastIdx] = configObj;
      }
    }
    this._update(config)
  }

  deleteConfigObj(ratTypeIndex: number, configTypeIndex: number, configObjIndex: number): void {
    const config = this.getConfig();
    const list = this.getConfigObjTypeList(ratTypeIndex);
    if (config && list && list[configTypeIndex]) {
      list[configTypeIndex].configObjList.splice(configObjIndex, 1);
      this._update(config)
    }
  }

  generateNewIdForConfigObj(path: number[]): string {
    if (path.length < 2) return '101';
    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return '101';

    let maxNum = 100;

    const traverse = (objList: any[] | undefined) => {
      if (!Array.isArray(objList)) return;
      for (const obj of objList) {
        if (!obj) continue;
        const raw = (obj as any).id ?? (obj as any).configObjId ?? (obj as any).objId ?? (obj as any).name ?? '';
        if (raw != null) {
          const m = String(raw).match(/(\d+)/g);
          if (m) {
            const parsed = parseInt(m[m.length - 1], 10);
            if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
          }
        }
        if (obj.configObjList) traverse(obj.configObjList);
      }
    };

    traverse(list[path[1]].configObjList);
    return String(Math.max(101, maxNum + 1));
  }

  // OperationType CRUD
  // path[0] = ratTypeIndex, path[1] = configObjTypeIndex, path[2+] = configObjList indices
  addOperationType(path: number[], operation: OperationType): void {
    const config = this.getConfig();
    if (!config || path.length < 3) return;

    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return;

    let parent: any = list[path[1]].configObjList[path[2]];
    for (let i = 3; i < path.length; i++) {
      if (!parent || !parent.configObjList) return;
      parent = parent.configObjList[path[i]];
    }
    if (parent) {
      parent.operationTypes = parent.operationTypes || [];
      parent.operationTypes.push(operation);
    }
    this._update(config)
  }

  updateOperationType(path: number[], operation: OperationType): void {
    const config = this.getConfig();
    if (!config || path.length < 4) return;

    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return;

    let parent: any = list[path[1]].configObjList[path[2]];
    for (let i = 3; i < path.length - 1; i++) {
      if (!parent || !parent.configObjList) return;
      parent = parent.configObjList[path[i]];
    }
    const lastIdx = path[path.length - 1];
    if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
      parent.operationTypes[lastIdx] = operation;
    }
    this._update(config)
  }

  deleteOperationType(ratTypeIndex: number, configTypeIndex: number, configObjIndex: number, operationIndex: number): void {
    const config = this.getConfig();
    const list = this.getConfigObjTypeList(ratTypeIndex);
    if (config && list && list[configTypeIndex]?.configObjList?.[configObjIndex]?.operationTypes) {
        list[configTypeIndex].configObjList[configObjIndex].operationTypes.splice(operationIndex, 1);
        this._update(config)
    }
  }

  // Parameter CRUD
  // path[0] = ratTypeIndex, path[1] = configObjTypeIndex, path[2+] = configObjList indices
  addParameter(path: number[], parameter: Parameter): void {
    const config = this.getConfig();
    if (!config || path.length < 3) return;

    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return;

    let parent: any = list[path[1]].configObjList[path[2]];
    for (let i = 3; i < path.length - 1; i++) {
      if (!parent || !parent.configObjList) return;
      parent = parent.configObjList[path[i]];
    }
    if (parent) {
      parent.params = parent.params || [];
      parent.params.push(parameter);
    }
    this._update(config)
  }

  updateParameter(path: number[], parameter: Parameter): void {
    const config = this.getConfig();
    if (!config || path.length < 3) return;

    const list = this.getConfigObjTypeList(path[0]);
    if (!list || !list[path[1]]) return;

    let parent: any = list[path[1]].configObjList[path[2]];
    for (let i = 3; i < path.length - 1; i++) {
      if (!parent || !parent.configObjList) return;
      parent = parent.configObjList[path[i]];
    }
    if (parent && parent.params && parent.params[path[path.length - 1]] !== undefined) {
      parent.params[path[path.length - 1]] = parameter;
    }
    this._update(config)
  }

  deleteParameter(ratTypeIndex: number, configTypeIndex: number, configObjIndex: number, paramIndex: number): void {
    const config = this.getConfig();
    const list = this.getConfigObjTypeList(ratTypeIndex);
    if (config && list && list[configTypeIndex]?.configObjList?.[configObjIndex]?.params) {
        list[configTypeIndex].configObjList[configObjIndex].params.splice(paramIndex, 1);
        this._update(config)
    }
  }
}