// components/tree-node/tree-node.component.ts
import { Component, input, output, output as output_1 } from '@angular/core';

import { ConfigObjType, ConfigObj, OperationType, Parameter, TreeNodeType } from '../../features/config/enodeb-config.model';

@Component({
    selector: 'app-tree-node',
    standalone: true,
    imports: [],
    templateUrl: './tree-node.html',
    styleUrls: ['./tree-node.scss']
})
export class TreeNodeComponent {
    readonly node = input<any>();
    readonly nodeType = input.required<TreeNodeType>();
    readonly path = input<number[]>([]);
    readonly isLast = input(false);
    readonly add = output<{
    type: TreeNodeType;
    path: number[];
}>();
    readonly view = output<{
    type: TreeNodeType;
    path: number[];
}>();
    readonly edit = output<{
    type: TreeNodeType;
    path: number[];
}>();
    readonly delete = output<{
    type: TreeNodeType;
    path: number[];
}>();

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
        return icons[this.nodeType()] || '📌';
    }

    getTitle(): string {
        switch (this.nodeType()) {
            case 'configType':
                return `${this.node().configType} (${this.node().configTypeId})`;
            case 'configObj':
                return `${this.node().parameterName} - ${this.node().dataName}`;
            case 'operationType':
                return `${this.node().operationName}`;
            case 'param':
                return `${this.node().dataName} [${this.node().abbreviation}]`;
            default:
                return 'Unknown';
        }
    }

    hasChildren(): boolean {
        const nodeType = this.nodeType();
        if (nodeType === 'configType') {
            const node = this.node();
            return node.configObjList && node.configObjList.length > 0;
        } else if (nodeType === 'configObj') {
            const node = this.node();
            return (node.operationTypes && node.operationTypes.length > 0) ||
                (node.params && node.params.length > 0);
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
        console.log('Delete:', this.nodeType(), this.path());
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
