// components/tree-node/tree-node.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ConfigObjType, ConfigObj, OperationType, Parameter, TreeNodeType } from '../../features/config/enodeb-config.model';

@Component({
    selector: 'app-tree-node',
    standalone: true,
    imports: [],
    templateUrl: './tree-node.html',
    styleUrls: ['./tree-node.scss']
})
export class TreeNodeComponent {
    @Input() node: any;
    @Input() nodeType!: TreeNodeType;
    @Input() path: number[] = [];
    @Input() isLast = false;
    @Output() add = new EventEmitter<{type: TreeNodeType, path: number[]}>();
    @Output() view = new EventEmitter<{type: TreeNodeType, path: number[]}>();
    @Output() edit = new EventEmitter<{type: TreeNodeType, path: number[]}>();
    @Output() delete = new EventEmitter<{type: TreeNodeType, path: number[]}>();

    isExpanded = false;
    showActions = false;

    toggleExpand(): void {
        this.isExpanded = !this.isExpanded;
    }

    getIcon(): string {
        const icons: Record<TreeNodeType, string> = {
            root: '📁',
            configType: '📂',
            configObj: '📄',
            operationType: '⚙️',
            param: '🔧',
        };
        return icons[this.nodeType] || '📌';
    }

    getTitle(): string {
        switch (this.nodeType) {
            case 'configType':
                return `${this.node.configType} (${this.node.configTypeId})`;
            case 'configObj':
                return `${this.node.parameterName} - ${this.node.dataName}`;
            case 'operationType':
                return `${this.node.operationName}`;
            case 'param':
                return `${this.node.dataName} [${this.node.abbreviation}]`;
            default:
                return 'Unknown';
        }
    }

    hasChildren(): boolean {
        if (this.nodeType === 'configType') {
            return this.node.configObjList && this.node.configObjList.length > 0;
        } else if (this.nodeType === 'configObj') {
            return (this.node.operationTypes && this.node.operationTypes.length > 0) ||
                (this.node.params && this.node.params.length > 0);
        }
        return false;
    }

    onView(output: {type: TreeNodeType, path: number[]}): void {
        this.view.emit(output);
    }

    onAdd(output: {type: TreeNodeType, path: number[]}): void {
        this.add.emit(output);
    }

    onEdit(output: {type: TreeNodeType, path: number[]}): void {
        this.edit.emit(output);
    }

    onDelete(): void {
        console.log('Delete:', this.nodeType, this.path);
        // Confirm and delete
    }

    getCopyArray(array: any[], item: any, item2: any = null): any[] {
        if (item === null) {
            return [...array];
        }
        if (item2 === null) {
            return [...array, item];
        }
        return [...array, item, item2];
    }
}
