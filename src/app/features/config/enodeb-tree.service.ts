// services/enodeb-tree.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ENodeBConfig, ConfigObjType, ConfigObj, OperationType, Parameter } from './enodeb-config.model';

@Injectable({
  providedIn: 'root'
})
export class ENodeBTreeService {
  private configSubject = new BehaviorSubject<ENodeBConfig | null>(null);
  public config$: Observable<ENodeBConfig | null> = this.configSubject.asObservable();

  constructor() { }

  setConfig(config: ENodeBConfig): void {
    this.configSubject.next(config);
  }

  getConfig(): ENodeBConfig | null {
    return this.configSubject.value;
  }

  // Header Operations
  updateHeader(neVersion: string, neTypeId: string, neTypeName: string): void {
    const config = this.getConfig();
    if (config) {
      config.neVersion = neVersion;
      config.neTypeId = neTypeId;
      config.neTypeName = neTypeName;
      this.configSubject.next({ ...config });
    }
  }

  // ConfigObjType CRUD
  addConfigType(configType: ConfigObjType): void {
    const config = this.getConfig();
    if (config) {
      config.configObjTypeList.push(configType);
      this.configSubject.next({ ...config });
    }
  }

  updateConfigType(index: number, configType: ConfigObjType): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[index]) {
      config.configObjTypeList[index] = configType;
      this.configSubject.next({ ...config });
    }
  }

  deleteConfigType(index: number): void {
    const config = this.getConfig();
    if (config) {
      config.configObjTypeList.splice(index, 1);
      this.configSubject.next({ ...config });
    }
  }

  generateNewIdForConfigType(): string {
    const config = this.getConfig();
    if (!config || !Array.isArray(config.configObjTypeList) || config.configObjTypeList.length === 0) {
      return '101';
    }

    let maxId = 0;
    for (const ct of config.configObjTypeList) {
      const raw = (ct as any).id ?? (ct as any).configTypeId ?? (ct as any).typeId ?? (ct as any).name;
      if (raw == null) continue;

      let num = 0;
      if (typeof raw === 'number') {
        num = raw;
      } else if (typeof raw === 'string') {
        // extract leading/trailing digits (handles values like "3", "CT-3", "type_4")
        const m = raw.match(/(\d+)/g);
        if (m) {
          // take the last numeric group to handle cases like "CT-3-v2"
          const parsed = parseInt(m[m.length - 1], 10);
          if (!isNaN(parsed)) num = parsed;
        }
      }

      if (num > maxId) maxId = num;
    }

    return String(maxId + 1);
  }

  // ConfigObj CRUD
  addConfigObj(path: number[], configObj: ConfigObj): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[path[0]]) {
      if (path.length === 0) {
        return;
      }
      if (path.length === 1) {
        config?.configObjTypeList[path[0]].configObjList.push(configObj);
        this.configSubject.next({ ...config });
        return;
      }
      let parent: any = config.configObjTypeList[path[0]].configObjList[path[1]];
      for (let i = 2; i < path.length; i++) {
        if (!parent || !parent.configObjList) {
          return;
        }
        parent = parent.configObjList[path[i]];
      }
      if (parent) {
        parent.configObjList = parent.configObjList || [];
        parent.configObjList.push(configObj);
      }
      this.configSubject.next({ ...config });
    }
  }

  updateConfigObj(path: number[], configObj: ConfigObj): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[path[0]]) {
      if (path.length === 0) {
        return
      }
      if (path.length === 1) {
        return;
      }
      if (path.length === 2) {
        config.configObjTypeList[path[0]].configObjList[path[1]] = configObj;
      } else {
        let parent: any = config.configObjTypeList[path[0]].configObjList[path[1]];
        for (let i = 2; i < path.length - 1; i++) {
          if (!parent || !parent.configObjList) {
            return;
          }
          parent = parent.configObjList[path[i]];
        }
        const lastIdx = path[path.length - 1];
        if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
          parent.configObjList[lastIdx] = configObj;
        }
      }
      this.configSubject.next({ ...config });
    }
  }

  deleteConfigObj(configTypeIndex: number, configObjIndex: number): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[configTypeIndex]) {
      config.configObjTypeList[configTypeIndex].configObjList.splice(configObjIndex, 1);
      this.configSubject.next({ ...config });
    }
  }

  generateNewIdForConfigObj(path: number[]): string {
    const config = this.getConfig();
    if (!config || path.length === 0) {
      return '101';
    }

    const type = config.configObjTypeList[path[0]];
    if (!type) {
      return '101';
    }

    let maxNum = 100;

    const traverse = (list: any[] | undefined) => {
      if (!Array.isArray(list)) return;
      for (const obj of list) {
        if (!obj) continue;
        const raw = (obj as any).id ?? (obj as any).configObjId ?? (obj as any).objId ?? (obj as any).name ?? '';
        if (raw != null) {
          const s = String(raw);
            const m = s.match(/(\d+)/g);
            if (m) {
              const parsed = parseInt(m[m.length - 1], 10);
              if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed;
              }
            }
        }
        if (obj.configObjList) {
          traverse(obj.configObjList);
        }
      }
    };

    traverse(type.configObjList);

    const next = Math.max(101, maxNum + 1);  
    
    return `${String(next)}`;
  }

  // OperationType CRUD
  addOperationType(path: number[], operation: OperationType): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[path[0]]) {
      if (path.length === 0 || path.length === 1) {
        return;
      }
      let parent: any = config.configObjTypeList[path[0]].configObjList[path[1]];
      for (let i = 2; i < path.length; i++) {
        if (!parent || !parent.configObjList) {
          return;
        }
        parent = parent.configObjList[path[i]];
      }
      if (parent) {
        parent.operationTypes = parent.operationTypes || [];
        parent.operationTypes.push(operation);
      }
      this.configSubject.next({ ...config });
    }
  }

  updateOperationType(path: number[], operation: OperationType): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[path[0]]) {
      if (path.length === 0 || path.length === 1) {
        return;
      }
      let parent: any = config.configObjTypeList[path[0]].configObjList[path[1]];
      for (let i = 2; i < path.length - 1; i++) {
        if (!parent || !parent.configObjList) {
          return;
        }
        parent = parent.configObjList[path[i]];
      }
      const lastIdx = path[path.length - 1];
      if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
        parent.operationTypes[lastIdx] = operation;
      }
      this.configSubject.next({ ...config });
    }
  }

  deleteOperationType(configTypeIndex: number, configObjIndex: number, operationIndex: number): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[configTypeIndex]?.configObjList[configObjIndex]) {
      config.configObjTypeList[configTypeIndex].configObjList[configObjIndex].operationTypes.splice(operationIndex, 1);
      this.configSubject.next({ ...config });
    }
  }

  // Parameter CRUD
  addParameter(path: number[], parameter: Parameter): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[path[0]]) {
      if (path.length === 0 || path.length === 1) {
        return;
      }
      let parent: any = config.configObjTypeList[path[0]].configObjList[path[1]];
      for (let i = 2; i < path.length - 1; i++) {
        if (!parent || !parent.configObjList) {
          return;
        }
        parent = parent.configObjList[path[i]];
      }
      if (parent) {
        parent.params = parent.params || [];
        parent.params.push(parameter);
      }
      this.configSubject.next({ ...config });
    }
  }

  updateParameter(path: number[], parameter: Parameter): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[path[0]]) {
      if (path.length === 0 || path.length === 1) {
        return;
      }
      let parent: any = config.configObjTypeList[path[0]].configObjList[path[1]];
      for (let i = 2; i < path.length - 1; i++) {
        if (!parent || !parent.configObjList) {
          return;
        }
        parent = parent.configObjList[path[i]];
      }
      if (parent && parent.params && parent.params[path[path.length - 1]] !== undefined) {
        parent.params[path[path.length - 1]] = parameter;
      }
      this.configSubject.next({ ...config });
    }
  }

  deleteParameter(configTypeIndex: number, configObjIndex: number, paramIndex: number): void {
    const config = this.getConfig();
    if (config && config.configObjTypeList[configTypeIndex]?.configObjList[configObjIndex]) {
      config.configObjTypeList[configTypeIndex].configObjList[configObjIndex].params.splice(paramIndex, 1);
      this.configSubject.next({ ...config });
    }
  }
}
