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
