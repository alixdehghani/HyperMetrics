// components/enodeb-tree/enodeb-tree.component.ts
import { Component, inject, OnDestroy, OnInit } from '@angular/core';

import { ENodeBTreeService } from '../enodeb-tree.service';
import { TreeNodeComponent } from '../../../shared/tree-node/tree-node';
import { EditHeaderModalComponent } from '../edit-header-modal/edit-header-modal';
import { ConfigObj, ConfigObjType, ENodeBConfig, OperationType, Parameter, RatType, TreeNodeType } from '../enodeb-config.model';
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

    // Helper: get configObjTypeList from path[0]=ratTypeIndex
    private getConfigObjTypeList(ratTypeIndex: number): ConfigObjType[] | null {
        if (!this.config || !this.config.ratTypeList[ratTypeIndex]) return null;
        return this.config.ratTypeList[ratTypeIndex].configObjTypeList;
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

    // path[0]=ratTypeIndex, path[1]=configObjTypeIndex, path[2+]=nested
    onViewNode(output: { type: TreeNodeType, path: number[] }): void {
        console.log(output);

        this.path = output.path;
        this.mode = 'view';

        if (output.type === 'root') {
            this.openHeaderModal();
        }

        if (output.type === 'configType') {
            // path[0]=ratTypeIndex, path[1]=configObjTypeIndex
            const list = this.getConfigObjTypeList(output.path[0]);
            this.confTypeModalData = list?.[output.path[1]] || null;
            this.showConfTypeModal = true;
            return;
        }

        if (output.type === 'configObj') {
            // path[0]=ratTypeIndex, path[1]=configObjTypeIndex, path[2]=configObjIndex, path[3+]=nested
            const list = this.getConfigObjTypeList(output.path[0]);
            if (!list || !list[output.path[1]] || output.path.length < 3) return;

            if (output.path.length === 3) {
                this.confObjModalData = list[output.path[1]].configObjList[output.path[2]];
            } else {
                let parent: any = list[output.path[1]].configObjList[output.path[2]];
                for (let i = 3; i < output.path.length - 1; i++) {
                    if (!parent || !parent.configObjList) return;
                    parent = parent.configObjList[output.path[i]];
                }
                const lastIdx = output.path[output.path.length - 1];
                if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
                    this.confObjModalData = parent.configObjList[lastIdx];
                }
            }
            this.showConfObjModal = true;
            return;
        }

        if (output.type === 'operationType') {
            // path[0]=ratTypeIndex, path[1]=configObjTypeIndex, path[2]=configObjIndex, path[3+]=nested/opIndex
            const list = this.getConfigObjTypeList(output.path[0]);
            if (!list || !list[output.path[1]] || output.path.length < 4) return;

            let parent: any = list[output.path[1]].configObjList[output.path[2]];
            for (let i = 3; i < output.path.length - 1; i++) {
                if (!parent || !parent.configObjList) return;
                parent = parent.configObjList[output.path[i]];
            }
            const lastIdx = output.path[output.path.length - 1];
            if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
                this.operationTypeModalData = parent.operationTypes[lastIdx];
            }
            this.showOperationTypeModal = true;
            return;
        }

        if (output.type === 'param') {
            const list = this.getConfigObjTypeList(output.path[0]);
            if (!list || !list[output.path[1]] || output.path.length < 4) return;

            let parent: any = list[output.path[1]].configObjList[output.path[2]];
            for (let i = 3; i < output.path.length - 1; i++) {
                if (!parent || !parent.configObjList) return;
                parent = parent.configObjList[output.path[i]];
            }
            if (parent) {
                parent.params = parent.params || [];
                this.confObjParamModalData = parent.params[output.path[output.path.length - 1]];
            }
            this.showConfObjParamModal = true;
            return;
        }
        // Handle view node logic here
    }

    onAddNode(output: { type: TreeNodeType, path: number[] }): void {
        this.path = output.path;
        this.mode = 'create';

        if (output.type === 'root') return;

        if (output.type === 'configType') {
            this.confTypeModalData = null;
            this.showConfTypeModal = true;
            return;
        }
        if (output.type === 'configObj') {
            this.showConfObjModal = true;
            this.confObjModalData = null;
            return;
        }
        if (output.type === 'operationType') {
            this.showOperationTypeModal = true;
            this.operationTypeModalData = null;
            return;
        }
        if (output.type === 'param') {
            this.showConfObjParamModal = true;
            this.confObjParamModalData = null;
            return;
        }
    }

    onEditNode(output: { type: TreeNodeType, path: number[] }): void {
        this.path = output.path;
        this.mode = 'edit';

        if (output.type === 'root') {
            this.openHeaderModal();
            return;
        }

        if (output.type === 'configType') {
            const list = this.getConfigObjTypeList(output.path[0]);
            this.confTypeModalData = list?.[output.path[1]] || null;
            this.showConfTypeModal = true;
            return;
        }

        if (output.type === 'configObj') {
            const list = this.getConfigObjTypeList(output.path[0]);
            if (!list || !list[output.path[1]] || output.path.length < 3) return;

            if (output.path.length === 3) {
                this.confObjModalData = list[output.path[1]].configObjList[output.path[2]];
            } else {
                let parent: any = list[output.path[1]].configObjList[output.path[2]];
                for (let i = 3; i < output.path.length - 1; i++) {
                    if (!parent || !parent.configObjList) return;
                    parent = parent.configObjList[output.path[i]];
                }
                const lastIdx = output.path[output.path.length - 1];
                if (parent && parent.configObjList && parent.configObjList[lastIdx] !== undefined) {
                    this.confObjModalData = parent.configObjList[lastIdx];
                }
            }
            this.showConfObjModal = true;
            return;
        }

        if (output.type === 'operationType') {
            const list = this.getConfigObjTypeList(output.path[0]);
            if (!list || !list[output.path[1]] || output.path.length < 4) return;

            let parent: any = list[output.path[1]].configObjList[output.path[2]];
            for (let i = 3; i < output.path.length - 1; i++) {
                if (!parent || !parent.configObjList) return;
                parent = parent.configObjList[output.path[i]];
            }
            const lastIdx = output.path[output.path.length - 1];
            if (parent && parent.operationTypes && parent.operationTypes[lastIdx] !== undefined) {
                this.operationTypeModalData = parent.operationTypes[lastIdx];
            }
            this.showOperationTypeModal = true;
            return;
        }

        if (output.type === 'param') {
            const list = this.getConfigObjTypeList(output.path[0]);
            if (!list || !list[output.path[1]] || output.path.length < 4) return;

            let parent: any = list[output.path[1]].configObjList[output.path[2]];
            for (let i = 3; i < output.path.length - 1; i++) {
                if (!parent || !parent.configObjList) return;
                parent = parent.configObjList[output.path[i]];
            }
            if (parent) {
                parent.params = parent.params || [];
                this.confObjParamModalData = parent.params[output.path[output.path.length - 1]];
            }
            this.showConfObjParamModal = true;
            return;
        }
    }

    onDeleteNode(output: { type: TreeNodeType, path: number[] }): void {
        if (!this.config) return;

        const confirmed = window.confirm(`Are you sure you want to delete this ${output.type}?`);
        if (!confirmed) return;

        const path = output.path;

        if (output.type === 'root') {
            this.config = null;
            this.treeService.setConfig(this.config as any);
            this.path = [];
            return;
        }

        if (output.type === 'configType') {
            // path[0]=ratTypeIndex, path[1]=configObjTypeIndex
            const list = this.getConfigObjTypeList(path[0]);
            if (list && list[path[1]] !== undefined) {
                list.splice(path[1], 1);
            }
            this.treeService.setConfig(this.config);
            this.path = [];
            return;
        }

        if (output.type === 'configObj') {
            // path[0]=ratTypeIndex, path[1]=configObjTypeIndex, path[2]=configObjIndex, path[3+]=nested
            const list = this.getConfigObjTypeList(path[0]);
            if (!list || !list[path[1]] || path.length < 3) return;

            const typeObj = list[path[1]];
            if (path.length === 3) {
                if (typeObj.configObjList && typeObj.configObjList[path[2]] !== undefined) {
                    typeObj.configObjList.splice(path[2], 1);
                }
            } else {
                let parent: any = typeObj.configObjList[path[2]];
                for (let i = 3; i < path.length - 1; i++) {
                    if (!parent || !parent.configObjList) return;
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
            // path[0]=ratTypeIndex, path[1]=configObjTypeIndex, path[2]=configObjIndex, path[3+]=nested/opIndex
            const list = this.getConfigObjTypeList(path[0]);
            if (!list || !list[path[1]] || path.length < 4) return;

            let parent: any = list[path[1]].configObjList[path[2]];
            for (let i = 3; i < path.length - 1; i++) {
                if (!parent || !parent.configObjList) return;
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
            const list = this.getConfigObjTypeList(path[0]);
            if (!list || !list[path[1]] || path.length < 4) return;

            let parent: any = list[path[1]].configObjList[path[2]];
            for (let i = 3; i < path.length - 1; i++) {
                if (!parent || !parent.configObjList) return;
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