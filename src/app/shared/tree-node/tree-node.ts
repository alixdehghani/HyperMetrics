import { Component, computed, input, output, signal } from '@angular/core';
import { TreeNodeType } from '../../features/config/enodeb-config.model';
import { NgIf, NgFor, NgClass } from '@angular/common';

@Component({
    selector: 'app-tree-node',
    standalone: true,
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
    
    readonly add = output<{ type: TreeNodeType; path: number[]; }>();
    readonly view = output<{ type: TreeNodeType; path: number[]; }>();
    readonly edit = output<{ type: TreeNodeType; path: number[]; }>();
    readonly delete = output<{ type: TreeNodeType; path: number[]; }>();

    // Use signal for expanded state so it actually toggles
    private _isExpanded = signal(false); // Start expanded by default

    readonly isSelfMatch = computed(() => {
        const term = this.searchTerm().toLowerCase();
        if (!term) return false;
        return this.getTitleForNode(this.node(), this.nodeType()).toLowerCase().includes(term);
    });

    readonly forceChildren = computed(() => {
        return this.isSelfMatch() || this.forceShow();
    });

    // Fixed: Actually use the signal state
   isExpanded = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (this.forceShow()) return true;
    if (this.isSelfMatch()) return true;
    if (term && this.hasMatchingChildren(this.node(), this.nodeType(), term)) return true;
    return this._isExpanded(); // Use the signal!
    });


    toggleExpand(): void {        
        this._isExpanded.update(v => !v);
    }

    getIcon(): string {
        const icons: Record<string, string> = {
            root: '📁',
            configType: '📂',
            configObj: '📄',
            operationType: '⚙️',
            param: '🔧',
        };
        return icons[this.nodeType()] || '📌';
    }

    getTitleForNode(data: any, type: TreeNodeType): string {
    if (!data) return '';
    // For configObj, prefer confObjDetail data
    const detail = type === 'configObj' ? (data.confObjDetail || data) : data;
    
    switch (type) {
        case 'root': return `${data.neTypeName || 'Root'}`;
        case 'configType': return `${data.configType || 'Unknown'} (${data.configTypeId || '?'})`;
        case 'configObj': return `${detail.parameterName || detail.title || detail.dataName || 'Unnamed'} - ${detail.dataName || ''}`;
        case 'operationType': return `${data.operationName || 'Unnamed'}`;
        case 'param': return `${data.dataName || ''} [${data.abbreviation || ''}]`;
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
        const re = new RegExp(`(${this.escapeRegex(term)})`, 'gi');
        return title.replace(re, '<mark>$1</mark>');
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

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
        return this.hasMatchingChildren(data, type, term);
    }

    hasChildren(): boolean {
    const node = this.node();
    if (!node) return false;
    
    const nodeType = this.nodeType();
    switch (nodeType) {
        case 'root':
            return !!(node.ratTypeList && node.ratTypeList.length > 0);
        case 'configType':
            return !!(node.configObjList && node.configObjList.length > 0);
        case 'configObj': {
            const detail = node.confObjDetail || node;
            return !!(detail.configObjList?.length || detail.operationTypes?.length || detail.params?.length);
        }
        default:
            return false;
    }
}

    // Get children arrays for rendering
    getChildren(): Array<{data: any, type: TreeNodeType}> {
        const node = this.node();
        if (!node) return [];
        
        const nodeType = this.nodeType();
        const children: Array<{data: any, type: TreeNodeType}> = [];
        
        if (nodeType === 'root') {
            (node.ratTypeList || []).forEach((rat: any, i: number) => {
                // RAT types contain configObjTypeList
                (rat.configObjTypeList || []).forEach((typeItem: any, j: number) => {
                    children.push({ data: typeItem, type: 'configType' });
                });
            });
        } else if (nodeType === 'configType') {
            (node.configObjList || []).forEach((obj: any, i: number) => {
                children.push({ data: obj, type: 'configObj' });
            });
        } else if (nodeType === 'configObj') {
            const detail = node.confObjDetail || node;
            // Add nested config objects
            (detail.configObjList || []).forEach((obj: any, i: number) => {
                children.push({ data: obj, type: 'configObj' });
            });
            // Add operation types
            (detail.operationTypes || []).forEach((op: any, i: number) => {
                children.push({ data: op, type: 'operationType' });
            });
            // Add parameters
            (detail.params || []).forEach((param: any, i: number) => {
                children.push({ data: param, type: 'param' });
            });
        }
        
        return children;
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
        if (item === null) return [...array];
        if (item2 === null) return [...array, item];
        return [...array, item, item2];
    }

    private hasMatchingChildren(data: any, type: TreeNodeType, term: string): boolean {
        if (!data) return false;
        
        const check = (list: any[], t: TreeNodeType) => list?.some(item => {
            if (this.getTitleForNode(item, t).toLowerCase().includes(term)) return true;
            return this.hasMatchingChildren(item, t, term);
        });

        if (type === 'root') {
            return (data.ratTypeList || []).some((rat: any) => 
                check(rat.configObjTypeList, 'configType')
            );
        }
        
        return check(data.configObjList, 'configObj') ||
               check(data.operationTypes, 'operationType') ||
               check(data.params, 'param');
    }
}