// components/tree-node/tree-node.component.ts
import { Component, computed, input, output, signal } from '@angular/core';

import { TreeNodeType } from '../../features/config/enodeb-config.model';

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
    readonly searchTerm = input<string>('');
    readonly forceShow = input<boolean>(false);
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

    // private _isExpanded = signal(false);
    forceCollapse = true;

    // Compute: Does this specific node match the text?
    readonly isSelfMatch = computed(() => {
        const term = this.searchTerm().toLowerCase();
        if (!term) return false;
        this.forceCollapse = false;
        return this.getTitleForNode(this.node(), this.nodeType()).toLowerCase().includes(term);
    });

    // Compute: Should we force our children to show?
    // True if WE match, or if WE were forced by our parent.
    readonly forceChildren = computed(() => {
        return this.isSelfMatch() || this.forceShow();
    });

    // Expanded State Logic
    isExpanded = computed(() => {
        // 1. If searching and we are part of a "forced" subtree (parent matched), expand.
        if (this.forceShow()) return true;

        // 2. If we match the search term ourselves, expand to show our children.
        if (this.isSelfMatch()) return true;

        // 3. If we have matching descendants (path to match), expand.
        const term = this.searchTerm().toLowerCase();
        if (term && this.hasMatchingChildren(this.node(), this.nodeType(), term)) {
            return true;
        }

        // 4. Default manual toggle
        return true
    });

    toggleExpand(): void {        
        this.forceCollapse = !this.forceCollapse;
    }
    

    // ... existing getIcon / getTitle ...
    getIcon(): string {
        const icons: Record<string, string> = {
            root: '📁', configType: '📂', configObj: '📄', operationType: '⚙️', param: '🔧',
        };
        return icons[this.nodeType()] || '📌';
    }

    getTitleForNode(data: any, type: TreeNodeType): string {
        if (!data) return '';
        switch (type) {
            case 'root': return `${data.neTypeName}`
            case 'configType': return `${data.configType} (${data.configTypeId})`;
            case 'configObj': return `${data.parameterName} - ${data.dataName}`;
            case 'operationType': return `${data.operationName}`;
            case 'param': return `${data.dataName} [${data.abbreviation}]`;
            default: return 'Unknown';
        }
    }

    getTitle(): string {
        return this.getTitleForNode(this.node(), this.nodeType());
    }

    getHighlightedTitle(): string {
        const title = this.getTitle();
        const term = this.searchTerm();
        if (!term) return title;
        const re = new RegExp(`(${term})`, 'gi');
        return title.replace(re, '<mark>$1</mark>');
    }

    /**
   * Decides if a CHILD node should be rendered in the DOM.
   */
    shouldShowChild(data: any, type: TreeNodeType): boolean {
        const term = this.searchTerm().toLowerCase();
        if (!term) return true;

        // RULE: If we are forcing children (because we matched or were forced), SHOW ALL.
        if (this.forceChildren()) return true;

        // OTHERWISE: Standard filter (show if child matches or has matching descendants)
        const childTitle = this.getTitleForNode(data, type).toLowerCase();
        if (childTitle.includes(term)) return true;

        return this.hasMatchingChildren(data, type, term);
    }

    // 5. Visibility Check (Recursive)
    // Returns true if the node ITSELF matches OR if any DESCENDANT matches
    shouldShow(data: any, type: TreeNodeType): boolean {
        const term = this.searchTerm().toLowerCase();
        if (!term) return true; // Always show if no search

        // Check self
        const title = this.getTitleForNode(data, type).toLowerCase();
        if (title.includes(term)) return true;

        // Check children
        return this.hasMatchingChildren(data, type, term);
    }

    hasChildren(): boolean {
        const nodeType = this.nodeType();
        if (nodeType === 'root') {
            return true;
        } else if (nodeType === 'configType') {
            // const node = this.node();
            return true;
            // return node.configObjList && node.configObjList.length > 0;
        } else if (nodeType === 'configObj') {
            const node = this.node();
            return true;
            // return (node.operationTypes && node.operationTypes.length > 0) ||
            //     (node.params && node.params.length > 0) || (node.configObjList && node.configObjList.length > 0);
        }
        return false;
    }

    onView(output: { type: TreeNodeType, path: number[] }): void {
        this.view.emit(output);
    }

    onAdd(output: { type: TreeNodeType, path: number[] }): void {
        this.add.emit(output);
    }

    onEdit(output: { type: TreeNodeType, path: number[] }): void {
        this.edit.emit(output);
    }

    onDelete(output: { type: TreeNodeType, path: number[] }): void {
        this.delete.emit(output);
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

    private hasMatchingChildren(data: any, type: TreeNodeType, term: string): boolean {
        if (!data) return false;
        // Helper to check list
        const check = (list: any[], t: TreeNodeType) => list?.some(item => {
            // Check item itself
            if (this.getTitleForNode(item, t).toLowerCase().includes(term)) return true;
            // Recurse
            return this.hasMatchingChildren(item, t, term);
        });

        return check(data.configObjTypeList, 'configType') ||
            check(data.configObjList, 'configObj') ||
            check(data.operationTypes, 'operationType') ||
            check(data.params, 'param');
    }

}
