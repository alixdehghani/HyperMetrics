// components/enodeb-tree/enodeb-tree.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { ENodeBTreeService } from '../enodeb-tree.service';
import { TreeNodeComponent } from '../../../shared/tree-node/tree-node';
import { EditHeaderModalComponent } from '../edit-header-modal/edit-header-modal';
import { ConfigObj, ConfigObjType, ENodeBConfig, OperationType, Parameter, TreeNodeType } from '../enodeb-config.model';
import { HttpClient } from '@angular/common/http';
import { EditConfTypeModalComponent } from '../edit-conf-type-modal/edit-conf-type-modal';
import { EditConfObjModalComponent } from '../edit-conf-obj-modal/edit-conf-obj-modal';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { EditConfObjOperationModalComponent } from '../edit-conf-obj-operation-modal/edit-conf-obj-operation-modal';
import { EditConfObjParamModalComponent } from '../edit-conf-obj-param-modal/edit-conf-obj-param-modal';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ExportConfig } from '../export/export';

@Component({
    selector: 'enodeb-tree',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        TreeNodeComponent,
        EditHeaderModalComponent,
        EditConfTypeModalComponent,
        EditConfObjModalComponent,
        EditConfObjOperationModalComponent,
        EditConfObjParamModalComponent,
        ExportConfig
    ],
    templateUrl: './enodeb-tree.html',
    styleUrls: ['./enodeb-tree.scss']
})
export class ENodeBTreeComponent implements OnInit, OnDestroy {
    private treeService = inject(ENodeBTreeService);

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
    searchTerm = '';
    searchControl = new FormControl('');
    private httpClient = inject(HttpClient);
    private $destroy = new Subject<void>();

    /** Inserted by Angular inject() migration for backwards compatibility */
    constructor(...args: unknown[]);
    constructor() { }
    ngOnDestroy(): void {
        this.$destroy.next();
        this.$destroy.complete();
    }

    ngOnInit(): void {
        // Initialize with your JSON data
        this.httpClient.get('HyperConfig.json').subscribe(res => {
            this.treeService.setConfig(res as ENodeBConfig);
        });


        this.treeService.config$.pipe(takeUntil(this.$destroy)).subscribe(config => {
            this.config = config;
        });

        this.searchControl.valueChanges
            .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.$destroy))
            .subscribe(term => this.searchTerm = term || '');
    }

    async onJsonFileUpload(event: any) {
        const oldData = await firstValueFrom(this.treeService.config$);
        if (oldData) {
            if (!confirm("Are you sure you want to upload a new JSON file? This will replace the current data. Unsaved changes will be lost.")) {
                return;
            }
        }
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                const data = JSON.parse(e.target.result);
                this.treeService.setConfig(data as ENodeBConfig);
            } catch (err) {
                console.error("❌ Invalid JSON file", err);
                alert("The uploaded file is not a valid JSON.");
            }
        };
        reader.readAsText(file);
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
        console.log(output);

        this.path = output.path;
        this.mode = 'view';

        if (output.type === 'root') {
            this.openHeaderModal();
        }

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
        if (output.type === 'root') {
            return;
        }
        if (output.type === 'configType') {
            this.confTypeModalData = null;
            this.showConfTypeModal = true;
        }
        if (output.type === 'configObj') {
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

        if (output.type === 'root') {
            this.openHeaderModal();
        }

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
        if (!this.config) {
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to delete this ${output.type}?`);
        if (!confirmed) {
            return;
        }

        const path = output.path;

        if (output.type === 'root') {
            // remove whole config
            this.config = null;
            this.treeService.setConfig(this.config as any);
            this.path = [];
            return;
        }

        if (output.type === 'configType') {
            const idx = path[0];
            if (this.config.configObjTypeList && this.config.configObjTypeList[idx] !== undefined) {
                this.config.configObjTypeList.splice(idx, 1);
            }
            this.treeService.setConfig(this.config);
            this.path = [];
            return;
        }

        if (output.type === 'configObj') {
            if (!this.config.configObjTypeList[path[0]]) {
                return;
            }
            if (path.length < 2) {
                return;
            }
            const typeObj = this.config.configObjTypeList[path[0]];
            if (path.length === 2) {
                // remove from top-level configObjList
                if (typeObj.configObjList && typeObj.configObjList[path[1]] !== undefined) {
                    typeObj.configObjList.splice(path[1], 1);
                }
            } else {
                // find parent configObj that contains the target list
                let parent: any = typeObj.configObjList[path[1]];
                for (let i = 2; i < path.length - 1; i++) {
                    if (!parent || !parent.configObjList) {
                        return;
                    }
                    parent = parent.configObjList[path[i]];
                }
                const lastIdx = path[path.length - 1];
                if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
                    parent.configObjList.splice(lastIdx, 1);
                }
            }
            this.treeService.setConfig(this.config);
            this.path = [];
            return;
        }

        if (output.type === 'operationType') {
            if (!this.config.configObjTypeList[path[0]]) {
                return;
            }
            if (path.length < 3) {
                return;
            }
            let parent: any = this.config.configObjTypeList[path[0]].configObjList[path[1]];
            for (let i = 2; i < path.length - 1; i++) {
                if (!parent || !parent.configObjList) {
                    return;
                }
                parent = parent.configObjList[path[i]];
            }
            const lastIdx = path[path.length - 1];
            if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
                parent.operationTypes.splice(lastIdx, 1);
            }
            this.treeService.setConfig(this.config);
            this.path = [];
            return;
        }

        if (output.type === 'param') {
            if (!this.config.configObjTypeList[path[0]]) {
                return;
            }
            if (path.length < 3) {
                return;
            }
            let parent: any = this.config.configObjTypeList[path[0]].configObjList[path[1]];
            for (let i = 2; i < path.length - 1; i++) {
                if (!parent || !parent.configObjList) {
                    return;
                }
                parent = parent.configObjList[path[i]];
            }
            const lastIdx = path[path.length - 1];
            if (parent) {
                parent.params = parent.params || [];
                if (parent.params[lastIdx] !== undefined) {
                    parent.params.splice(lastIdx, 1);
                }
            }
            this.treeService.setConfig(this.config);
            this.path = [];
            return;
        }
    }
}
