// components/enodeb-tree/enodeb-tree.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { ENodeBTreeService } from '../enodeb-tree.service';
import { TreeNodeComponent } from '../../../shared/tree-node/tree-node';
import { EditHeaderModalComponent } from '../edit-header-modal/edit-header-modal';
import { ConfigObj, ConfigObjType, ENodeBConfig, OperationType, Parameter, TreeNodeType } from '../enodeb-config.model';
import { HttpClient } from '@angular/common/http';
import { EditConfTypeModalComponent } from '../edit-conf-type-modal/edit-conf-type-modal';
import { EditConfObjModalComponent } from '../edit-conf-obj-modal/edit-conf-obj-modal';
import { Subject, takeUntil } from 'rxjs';
import { EditConfObjOperationModalComponent } from '../edit-conf-obj-operation-modal/edit-conf-obj-operation-modal';
import { EditConfObjParamModalComponent } from '../edit-conf-obj-param-modal/edit-conf-obj-param-modal';

@Component({
    selector: 'enodeb-tree',
    imports: [
    TreeNodeComponent,
    EditHeaderModalComponent,
    EditConfTypeModalComponent,
    EditConfObjModalComponent,
    EditConfObjOperationModalComponent,
    EditConfObjParamModalComponent
],
    templateUrl: './enodeb-tree.html',
    styleUrls: ['./enodeb-tree.scss']
})
export class ENodeBTreeComponent implements OnInit, OnDestroy {
    config: ENodeBConfig | null = null;
    showHeaderModal = false;

    showConfTypeModal = false;
    confTypeModalData: ConfigObjType | null = null;

    showConfObjModal = false;
    confObjModalData: ConfigObj | null = null;

    showOperationTypeModal = false;
    operationTypeModalData: OperationType | null = null;

    showConfObjParamModal = false;
    confObjParamModalData: Parameter | null = null;

    path: number[] = [];
    mode!: 'edit' | 'view' | 'create';
    private httpClient = inject(HttpClient);
    private $destroy = new Subject<void>();
    constructor(private treeService: ENodeBTreeService) { }
    ngOnDestroy(): void {
        this.$destroy.next();
        this.$destroy.complete();
    }

    ngOnInit(): void {
        // Initialize with your JSON data
        this.httpClient.get('HyperConfig.json').subscribe(res => {
            this.treeService.setConfig(res as ENodeBConfig);

        })


        this.treeService.config$.pipe(takeUntil(this.$destroy)).subscribe(config => {
            this.config = config;
        });
    }

    openHeaderModal(): void {
        this.showHeaderModal = true;
    }

    closeHeaderModal(): void {
        this.showHeaderModal = false;
    }

    closeConfTypeModal(): void {
        this.showConfTypeModal = false;
        this.confTypeModalData = null;
        this.path = [];
    }

    closeConfObjModal(): void {
        this.showConfObjModal = false;
        this.confObjModalData = null;
        this.path = [];
    }

    closeOperationTypeModal(): void {
        this.showOperationTypeModal = false;
        this.operationTypeModalData = null;
        this.path = [];
    }

    closeConfObjParamModal(): void {
        this.showConfObjParamModal = false;
        this.confObjParamModalData = null;
        this.path = [];
    }

    onViewNode(output: { type: TreeNodeType, path: number[] }): void {
        this.path = output.path;
        this.mode = 'view';       
        
        if (output.type === 'configType') {
            this.confTypeModalData = this.config?.configObjTypeList[output.path[0]] || null;
            this.showConfTypeModal = true;
        }
        if (output.type === 'configObj') {
            if (this.config && this.config.configObjTypeList[output.path[0]]) {
                if (output.path.length === 0) {
                    return
                }
                if (output.path.length === 1) {
                    return;
                }
                if (output.path.length === 2) {
                    this.confObjModalData = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                } else {
                    let parent: any = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                    for (let i = 2; i < output.path.length - 1; i++) {
                        if (!parent || !parent.configObjList) {
                            return;
                        }
                        parent = parent.configObjList[output.path[i]];
                    }
                    const lastIdx = output.path[output.path.length - 1];
                    if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
                        this.confObjModalData = parent.configObjList[lastIdx]
                    }
                }
                this.showConfObjModal = true;
            }
        }
        if (output.type === 'operationType') {
            if (this.config && this.config.configObjTypeList[output.path[0]]) {
                if (output.path.length === 0 || output.path.length === 1) {
                    return;
                }
                let parent: any = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                for (let i = 2; i < output.path.length - 1; i++) {
                    if (!parent || !parent.configObjList) {
                        return;
                    }
                    parent = parent.configObjList[output.path[i]];
                }
                const lastIdx = output.path[output.path.length - 1];
                if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
                    this.operationTypeModalData = parent.operationTypes[lastIdx];
                }
            }
            this.showOperationTypeModal = true;
        }
        if (output.type === 'param') {
            if (this.config && this.config.configObjTypeList[output.path[0]]) {
                if (output.path.length === 0 || output.path.length === 1) {
                    return;
                }
                let parent: any = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                for (let i = 2; i < output.path.length - 1; i++) {
                    if (!parent || !parent.configObjList) {
                        return;
                    }
                    parent = parent.configObjList[output.path[i]];
                }
                if (parent) {
                    parent.params = parent.params || [];
                    this.confObjParamModalData = parent.params[output.path[output.path.length - 1]];
                }                                
                this.showConfObjParamModal = true;
            }
        }
        // Handle view node logic here
    }

    onAddNode(output: { type: TreeNodeType, path: number[] }): void {
        this.path = output.path;
        this.mode = 'create';
        console.log('Add node event received:', output.type, output.path);
        if (output.type === 'root') {
            this.confTypeModalData = null;
            this.showConfTypeModal = true;
        }
        if (output.type === 'configType' || output.type === 'configObj') {
            this.showConfObjModal = true;
            this.confObjModalData = null;
        }
        if (output.type === 'operationType') {
            this.showOperationTypeModal = true;
            this.operationTypeModalData = null;
        }
        if (output.type === 'param') {
            this.showConfObjParamModal = true;
            this.confObjParamModalData = null;
        }
        // Handle add node logic here
    }

    onEditNode(output: { type: TreeNodeType, path: number[] }): void {
        this.path = output.path;
        this.mode = 'edit';
        if (output.type === 'configType') {
            this.confTypeModalData = this.config?.configObjTypeList[output.path[0]] || null;
            this.showConfTypeModal = true;
        }
        if (output.type === 'configObj') {
            if (this.config && this.config.configObjTypeList[output.path[0]]) {
                if (output.path.length === 0) {
                    return
                }
                if (output.path.length === 1) {
                    return;
                }
                if (output.path.length === 2) {
                    this.confObjModalData = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                } else {
                    let parent: any = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                    for (let i = 2; i < output.path.length - 1; i++) {
                        if (!parent || !parent.configObjList) {
                            return;
                        }
                        parent = parent.configObjList[output.path[i]];
                    }
                    const lastIdx = output.path[output.path.length - 1];
                    if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
                        this.confObjModalData = parent.configObjList[lastIdx]
                    }
                }
                this.showConfObjModal = true;
            }
        }
        if (output.type === 'operationType') {
            if (this.config && this.config.configObjTypeList[output.path[0]]) {
                if (output.path.length === 0 || output.path.length === 1) {
                    return;
                }
                let parent: any = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                for (let i = 2; i < output.path.length - 1; i++) {
                    if (!parent || !parent.configObjList) {
                        return;
                    }
                    parent = parent.configObjList[output.path[i]];
                }
                const lastIdx = output.path[output.path.length - 1];
                if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
                    this.operationTypeModalData = parent.operationTypes[lastIdx];
                }
            }
            this.showOperationTypeModal = true;
        }
        if (output.type === 'param') {
            if (this.config && this.config.configObjTypeList[output.path[0]]) {
                if (output.path.length === 0 || output.path.length === 1) {
                    return;
                }
                let parent: any = this.config.configObjTypeList[output.path[0]].configObjList[output.path[1]];
                for (let i = 2; i < output.path.length - 1; i++) {
                    if (!parent || !parent.configObjList) {
                        return;
                    }
                    parent = parent.configObjList[output.path[i]];
                }
                if (parent) {
                    parent.params = parent.params || [];
                    this.confObjParamModalData = parent.params[output.path[output.path.length - 1]];
                }
                this.showConfObjParamModal = true;
            }
        }

    }

    onDeleteNode(output: { type: TreeNodeType, path: number[] }): void {
        this.path = output.path;
        console.log('Delete node event received:', output.type, output.path);
        // Handle delete node logic here
    }
}
