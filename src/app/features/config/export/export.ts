import { Component, inject, Input } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ENodeBTreeService } from '../enodeb-tree.service';
import { firstValueFrom } from 'rxjs';
import { ConfigObj, ConfigObjType, ConfMapConfig, ENodeBConfig, ICommand, ICommandParams, OperationType, Parameter, RatType, SettingItem } from '../enodeb-config.model';
import { BSCAlarmService } from '../../alarm/bsc-alarm.service';

export const filenames = {
    ZipFile: 'exported_files.zip',
    HyperConfig: 'hyperConfig.json',
    ENB: 'enb_setting.json',
    SIB: 'sib_setting.json',
    RR: 'rr_setting.json',
    DRB: 'drb_setting.json',
    ConfMap: 'Hytera-Faraabeen-conf-map.json',
    Commands: 'commands.json',
    Documentation: 'enodeb-documentation.pdf'
}

interface DocParam {
    nodePath: string;
    nodeTitle: string;
    dataName: string;
    parameterName: string;
    type: string;
    defaultValue: string;
    validation: string;
    isEditable: boolean;
    filterOptions: string;
}

interface DocSection {
    configType: string;
    nodePath: string;
    nodeTitle: string;
    depth: number;
    params: DocParam[];
    isRatHeader?: boolean;
    ratName?: string;
    childCount?: number;
    hasChildren?: boolean;
    sectionId?: string;
    parentId?: string | null;
}

interface FlatFileEntry {
    category: string;
    class_name: string;
    operation_types: string[];
    node_path: string;
    filter: string;
    array_type?: string;
}

@Component({
    selector: 'export-config',
    standalone: true,
    templateUrl: 'export.html'
})

export class ExportConfig {

    private eNodeBTreeService = inject(ENodeBTreeService);

    @Input() config: ENodeBConfig | null = null;  

    showFullscreen = false;
    allErrors: string[] = [];

    close() {
        this.showFullscreen = false;
    }

    async open() {

        const data = this.config ?? await firstValueFrom(this.eNodeBTreeService.config$);
        if (!data) {
            alert(`No ${filenames.HyperConfig} found to open.`);
            return;
        }
        this.showFullscreen = true;
    }

    async downloadAll() {
        const zip = new JSZip();
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        zip.file(filenames['HyperConfig'], this._getHyperConfigBlobFile(data!));
        zip.file(filenames['ENB'], this._getEnbSettingBlobFile(data!));
        zip.file(filenames['SIB'], this._getSIBSettingBlobFile(data!));
        zip.file(filenames['RR'], this._getRRSettingBlobFile(data!));
        zip.file(filenames['DRB'], this._getDRBSettingBlobFile(data!));
        zip.file(filenames['ConfMap'], this._getHyteraFaraabenBlobFile(data!));
        zip.file(filenames['Commands'], this._getCommandsBlobFile(data!));
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, filenames['ZipFile']);
    }

    async downloadHyperConfigFiles() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const hyperBlob = this._getHyperConfigBlobFile(data!);
        saveAs(hyperBlob, filenames['HyperConfig']);
    }

    async downloadENBSettingFiles() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const blob = this._getEnbSettingBlobFile(data!);
        saveAs(blob, filenames['ENB']);
    }

    async downloadSIBSettingFiles() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const blob = this._getSIBSettingBlobFile(data!);
        saveAs(blob, filenames['SIB']);
    }

    async downloadRRSettingFiles() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const blob = this._getRRSettingBlobFile(data!);
        saveAs(blob, filenames['RR']);
    }

    async downloadDRBSettingFiles() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const blob = this._getDRBSettingBlobFile(data!);
        saveAs(blob, filenames['DRB']);
    }

    async downloadHyteraFraabeenConfMapFile() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const blob = this._getHyteraFaraabenBlobFile(data!);
        saveAs(blob, filenames['ConfMap']);
    }

    async downloadCommandsFile() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
        const blob = this._getCommandsBlobFile(data!);
        saveAs(blob, filenames['Commands']);
    }

    async downloadDocumentationPDF() {

        try {

            const data = await firstValueFrom(this.eNodeBTreeService.config$);

            if (!data) {
                alert('No configuration data found.');
                return;
            }

            const sections = this._buildDocSections(data);

            if (sections.length === 0) {
                alert('No sections found in configuration tree.');
                return;
            }
            const html = this._buildDocumentationHTML(sections);
            const newTab = window.open('', '_blank');
            if (!newTab) {
                alert('Popup blocked! Please allow popups for this site.');
                return;
            }

            newTab.document.open();

            newTab.document.write(html);

            newTab.document.close();

        } catch (err) {

            console.error('Documentation generation failed:', err);

            alert(
                `Error: ${(err as Error)?.message || err}`
            );
        }
    }

    private _esc(str: string): string {
        if (!str || str === '—') return str || '—';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }


    private _buildDocSections(config: ENodeBConfig): DocSection[] {
        const sections: DocSection[] = [];
        let sectionCounter = 0;

        config.ratTypeList.forEach(rat => {
            rat.configObjTypeList.forEach(typeItem => {
                typeItem.configObjList.forEach(rootObj => {
                    this._traverseForDoc(
                        rootObj,
                        typeItem.configType,
                        [rat.ratTypeName],
                        sections,
                        1,
                        rat.ratTypeName,
                        rat.ratTypeId,
                        true,
                        null,
                        () => { sectionCounter++; return `sec_${sectionCounter}`; }
                    );
                });
            });
        });

        return sections;
    }


    private _traverseForDoc(
        obj: ConfigObj,
        configType: string,
        pathStack: string[],
        sections: DocSection[],
        depth: number,
        ratName: string,
        ratTypeId: string,
        isFirstInRat: boolean = true,
        parentId: string | null = null,
        idGen: () => string = () => 'sec_0'
    ): void {
        const detail = obj.confObjDetail || obj;
        const dataName = detail.dataName || obj.configObjName || '';
        const currentPath = [...pathStack, dataName];
        const nodePath = '/' + currentPath.join('/');
        const nodeTitle = detail.title || detail.parameterName || dataName;
        const myId = idGen();

        if (isFirstInRat && depth === 1) {
            sections.push({
                configType: `rat_${ratName.toLowerCase()}`,
                nodePath: `/rat/${ratTypeId}`,
                nodeTitle: `${ratName} (RAT ${ratTypeId})`,
                depth: 0,
                params: [],
                isRatHeader: true,
                ratName: ratName,
                sectionId: myId,
                parentId: null
            });
        }

        const params: DocParam[] = (detail.params || []).map(p => ({
            nodePath,
            nodeTitle: detail.title || detail.parameterName || dataName || '',
            dataName: p.dataName,
            parameterName: p.parameterName || p.title || p.name || p.dataName || '',
            type: p.type || '—',
            defaultValue: p.defaultValue != null ? String(p.defaultValue) : '—',
            validation: p.validation || p.uiValidation || '—',
            isEditable: !!p.isEditable,
            filterOptions: p.filter && p.filter.length > 0
                ? p.filter.map((f: any) => f.label || f.name || f.value || String(f)).join(', ')
                : '—',
            ratName: ratName || ''
        }));

        const children = detail.configObjList || obj.configObjList || [];
        const childCount = children.length;
        const hasChildren = childCount > 0;

        if (params.length > 0 || hasChildren) {
            sections.push({
                configType,
                nodePath,
                nodeTitle: nodeTitle || '',
                depth,
                params,
                ratName: ratName,
                childCount,
                hasChildren,
                sectionId: myId,
                parentId: parentId
            });
        }

        if (children.length > 0) {
            children.forEach((child) => {
                this._traverseForDoc(
                    child,
                    configType || '',
                    currentPath.filter((p): p is string => !!p),
                    sections,
                    depth + 1,
                    ratName || '',
                    ratTypeId || '',
                    false,
                    myId,
                    idGen
                );
            });
        }
    }

    private _buildDocumentationHTML(sections: DocSection[]): string {
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Build parent-child map
        const childrenMap = new Map<string, DocSection[]>();
        sections.forEach(s => {
            if (s.parentId) {
                if (!childrenMap.has(s.parentId)) {
                    childrenMap.set(s.parentId, []);
                }
                childrenMap.get(s.parentId)!.push(s);
            }
        });

        // Group by RAT, then by configType
        const byRat = new Map<string, { header: DocSection | null, types: Map<string, DocSection[]> }>();

        sections.forEach(s => {
            const ratKey = s.ratName || 'unknown';
            if (!byRat.has(ratKey)) {
                byRat.set(ratKey, { header: null, types: new Map() });
            }
            const ratGroup = byRat.get(ratKey)!;
            if (s.isRatHeader) {
                ratGroup.header = s;
            } else if (!s.parentId || s.parentId === '') {
                // Only top-level sections per type
                if (!ratGroup.types.has(s.configType)) {
                    ratGroup.types.set(s.configType, []);
                }
                ratGroup.types.get(s.configType)!.push(s);
            }
        });

        const chapterColors: Record<string, string> = {
            enb: '#1e3a8a',
            sib: '#065f46',
            rr: '#581c87',
            drb: '#af3333',
        };

        const chapterAccents: Record<string, string> = {
            enb: '#3b82f6',
            sib: '#10b981',
            rr: '#a855f7',
            drb: '#f97316',
        };

        const renderSection = (section: DocSection, accent: string, bgColor: string): string => {
            const depth = section.depth;
            const hue = depth === 1 ? bgColor : depth === 2 ? '#2d394b' : '#475569';
            const indent = (depth - 1) * 16;
            const myChildren = childrenMap.get(section.sectionId || '') || [];
            const hasChildren = myChildren.length > 0;

            const rowsHTML = section.params.map((p, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                const editIcon = p.isEditable ? '✓' : '✗';
                const filterVal = p.filterOptions === '—' || p.filterOptions === '&mdash;'
                    ? '' : this._esc(p.filterOptions);

                return `
        <tr style="background:${bg}">
            <td>${this._esc(p.dataName)}</td>
            <td>${this._esc(p.parameterName)}</td>
            <td><span class="type">${this._esc(p.type)}</span></td>
            <td>${this._esc(p.defaultValue)}</td>
            <td>${this._esc(p.validation)}</td>
            <td style="text-align:center;">
                <span class="badge ${p.isEditable ? 'yes' : 'no'}">
                    ${editIcon} ${p.isEditable ? 'Yes' : 'No'}
                </span>
            </td>
            <td>${filterVal || '—'}</td>
        </tr>`;
            }).join('');

            const tableHTML = section.params.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th style="width:14%">Data Name</th>
                        <th style="width:18%">Parameter</th>
                        <th style="width:10%">Type</th>
                        <th style="width:12%">Default</th>
                        <th style="width:16%">Validation</th>
                        <th style="width:10%">Editable</th>
                        <th style="width:20%">Filter Options</th>
                    </tr>
                </thead>
                <tbody>${rowsHTML}</tbody>
            </table>` : '';

            // Recursively render children inside the parent's border
            const childrenHTML = myChildren.map(child => renderSection(child, accent, bgColor)).join('');

            // If this section has children, wrap everything in a border box
            if (hasChildren) {
                return `
        <div class="parent-box" style="margin-left:${indent}px;">
            <div class="section-header parent-header" style="background:${hue};">
                <span style="opacity:0.6;font-size:8pt">${this._esc(section.nodePath)}</span>
                <span style="font-weight:700">📂 ${this._esc(section.nodeTitle)}</span>
                <span style="float:right;opacity:0.8;font-size:8pt">${section.params.length} params, ${myChildren.length} children</span>
            </div>
            ${tableHTML}
            <div class="children-container">
                ${childrenHTML}
            </div>
        </div>`;
            } else {
                // Leaf node - no border, just the section
                return `
        <div class="section" style="margin-left:${indent}px;">
            <div class="section-header" style="background:${hue};">
                <span style="opacity:0.6;font-size:8pt">${this._esc(section.nodePath)}</span>
                <span style="font-weight:700">${this._esc(section.nodeTitle)}</span>
                <span style="float:right;opacity:0.8;font-size:8pt">${section.params.length} params</span>
            </div>
            ${tableHTML}
        </div>`;
            }
        };

        // Build HTML per RAT
        const ratsHTML = Array.from(byRat.entries()).map(([ratName, ratGroup], ri) => {
            const ratHeaderHTML = ratGroup.header ? `
                <div style="background:linear-gradient(135deg,#580f0f,#1e40af);
                            color:white; padding:24px; border-radius:12px;
                            margin-bottom:24px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
                    <div style="font-size:28px; font-weight:800; letter-spacing:1px;">
                        ${this._esc(ratGroup.header.nodeTitle)}
                    </div>
                    <div style="opacity:0.7; font-size:13px; margin-top:6px;">
                        Radio Access Technology Configuration
                    </div>
                </div>
            ` : '';

            const chaptersHTML = Array.from(ratGroup.types.entries()).map(([type, typeSections], ci) => {
                const bgColor = chapterColors[type] || '#1e3a5f';
                const accent = chapterAccents[type] || '#60a5fa';
                const chapterParams = typeSections.reduce((a, s) => a + s.params.length, 0);

                const sectionsHTML = typeSections.map(section => renderSection(section, accent, bgColor)).join('');

                return `
        <section style="page-break-before:${ci > 0 ? 'always' : 'auto'}">
            <div style="background:linear-gradient(135deg,${bgColor},${bgColor}dd);
                border-left:5px solid ${accent};
                color:white;padding:18px;margin-bottom:20px;border-radius:8px;">
                <div style="font-size:22px;font-weight:800">${type.toUpperCase()}</div>
                <div style="opacity:0.7;font-size:12px">${chapterParams} parameters</div>
            </div>
            ${sectionsHTML}
        </section>`;
            }).join('');

            return `
        <div class="rat-container" style="page-break-before:${ri > 0 ? 'always' : 'auto'}">
            ${ratHeaderHTML}
            ${chaptersHTML}
        </div>`;
        }).join('');

        return `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="utf-8"/>
        <style>
        * { box-sizing: border-box; }
        body {
            font-family: Inter, Arial, sans-serif;
            margin: 0;
            background: #f1f5f9;
            color: #0f172a;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        td, th {
            border: 1px solid #e2e8f0;
            padding: 6px;
            font-size: 9pt;
            white-space: normal !important;
            overflow-wrap: anywhere;
            word-break: break-word;
            vertical-align: top;
        }
        td { max-width: 0; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        .badge {
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 8pt;
            display: inline-block;
        }
        .yes { background:#dcfce7; color:#16a34a; }
        .no { background:#fee2e2; color:#dc2626; }
        .type {
            background:#ede9fe;
            color:#6d28d9;
            padding:2px 6px;
            border-radius:4px;
            font-family: monospace;
        }
        .section {
            margin-bottom: 18px;
            break-inside: avoid;
        }

        /* PARENT BOX: Border around parent + all its children */
        .parent-box {
            border: 2px solid #cbd5e1;
            border-radius: 10px;
            margin-bottom: 20px;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            break-inside: avoid;
            overflow: hidden;
        }

        .parent-box .parent-header {
            border-radius: 8px 8px 0 0;
            padding: 12px 14px;
            font-size: 11pt;
        }

        .parent-box table {
            margin: 0 12px 12px 12px;
            width: calc(100% - 24px);
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            overflow: hidden;
        }

        .children-container {
            padding: 8px 12px 12px 20px;
            background: #f8fafc;
            border-top: 1px dashed #e2e8f0;
        }

        .children-container .parent-box {
            border-color: #94a3b8;
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .children-container .children-container {
            background: #f1f5f9;
        }

        .section-header {
            padding: 10px;
            color: white;
            font-weight: 700;
            border-radius: 6px;
        }

        .rat-container {
            margin-bottom: 40px;
        }

        @media print {
            body { background: white; }
            .rat-container { page-break-before: always; }
            .rat-container:first-of-type { page-break-before: auto; }
            .parent-box { 
                box-shadow: none; 
                border: 2px solid #94a3b8 !important;
            }
            .children-container { background: #f8fafc !important; }
        }
        </style>
        </head>
        <body>
        <div style="padding:30px">
        <h2>ENodeB Documentation</h2>
        <p>${date}</p>
        ${ratsHTML}
        </div>
        <button class="no-print" onclick="window.print()"
            style="position:fixed; bottom:20px; right:20px; z-index:9999; background:#2563eb; color:white; border:none; padding:12px 22px; border-radius:8px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,.2);">
            Save as PDF
        </button>
        </body>
        </html>`;
    }

    private _getHyperConfigBlobFile(config: ENodeBConfig): Blob {
        return new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    }

    private _getSettingBlobFile(data: ENodeBConfig, type: string): Blob {
        const configObjType = data.ratTypeList
            ?.flatMap((rat: RatType) => rat.configObjTypeList ?? [])
            .find((item: ConfigObjType) => item.configType === type);
        const result = configObjType ? this.flattenENodeBConfig(configObjType) : [];
        return new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    }

    private _getEnbSettingBlobFile(data: ENodeBConfig): Blob {
        return this._getSettingBlobFile(data, 'enb');
    }

    private _getSIBSettingBlobFile(data: ENodeBConfig): Blob {
        return this._getSettingBlobFile(data, 'sib');
    }

    private _getRRSettingBlobFile(data: ENodeBConfig): Blob {
        return this._getSettingBlobFile(data, 'rr');
    }

    private _getDRBSettingBlobFile(data: ENodeBConfig): Blob {
        return this._getSettingBlobFile(data, 'drd');
    }

    private _getHyteraFaraabenBlobFile(data: ENodeBConfig): Blob {
        const flatFileJson = this.generateFlatFile(data);
        return new Blob([JSON.stringify(flatFileJson, null, 2)], { type: 'application/json' });
    }

        private _getCommandsBlobFile(data: ENodeBConfig): Blob {
        const commands = this.convertToCommands(data);
        return new Blob([JSON.stringify(commands, null, 2)], { type: 'application/json' });
    }

    public convertToCommands(treeData: ENodeBConfig): ICommand[] {
        const flattenedCommands: ICommand[] = [];
        
        treeData.ratTypeList?.forEach((ratType: RatType) => {
            ratType.configObjTypeList?.forEach((typeItem: ConfigObjType) => {
                const configType = typeItem.configType || 'BSC';
                const module = configType.toUpperCase();
                
                typeItem.configObjList?.forEach((obj: ConfigObj) => {
                    flattenedCommands.push(...this.processConfigObject(obj, '', module, configType));
                });
            });
        });
        
        return flattenedCommands;
    }

    private processConfigObject(
        obj: ConfigObj, 
        parentPmoName: string, 
        module: string,
        configType: string
    ): ICommand[] {
        const results: ICommand[] = [];
        const detail = obj.confObjDetail || obj;
        
        const displayName = detail.mmlCommandNamePosfix || this._toPascalCase(detail.dataName || '');

        // L3 navigation entry (always created for UI tree structure)
        const l3Entry: ICommand = {
            module: 'L3',
            id: detail.configObjId || obj.configObjId || '10002',
            pmoName: parentPmoName,
            name: displayName,
            title: detail.title || '',
            commands: []
        };
        results.push(l3Entry);
        
        // BSC command entry (only if operations exist)
        const operations = detail.operationTypes || [];
        if (operations.length > 0) {
            const bscEntry: ICommand = {
                module: module,
                id: detail.configObjId || obj.configObjId || '',
                pmoName: parentPmoName,
                name: detail.dataName || obj.configObjName || '',
                title: detail.title || '',
                commands: this.mapOperations(operations, detail.params || [])
            };
            results.push(bscEntry);
        }
        
        // Process children - their pmoName is this item's display name
        const children = detail.configObjList || obj.configObjList || [];
        if (children.length > 0) {
            children.forEach((child: ConfigObj) => {
                results.push(...this.processConfigObject(child, displayName, module, configType));
            });
        }
        
        return results;
    }

    private mapOperations(ops: OperationType[], params: Parameter[]) {
        if (!ops) return [];
        return ops.map(op => ({
            msgId: op.msgId,
            name: op.operationName,
            code: op.operationCode,
            type: op.operationType,
            title: op.title,
            isDangerous: op.isDangerous,
            params: params ? params.map(p => this.mapParameter(p)) : []
        }));
    }

    private mapParameter(p: Parameter): ICommandParams {
        return {
            id: p.id,
            name: p.name || p.parameterName || p.dataName || '',
            title: p.title || p.parameterName || p.name || '',
            isPrimaryKey: !!p.isPrimaryKey,
            required: !!p.required,
            isEnabled: p.isEnabled !== false,
            unit: p.unit || null,
            defaultValue: p.defaultValue != null ? String(p.defaultValue) : '',
            type: p.type || 'OctetString',
            validation: p.validation || null,
            uiValidation: p.uiValidation || null,
            filter: this.mapFilter(p.filter),
            modeType: p.modeType || 'input',
            showOn: p.showOn ? String(p.showOn) : null
        };
    }

    private mapFilter(filter: any[] | undefined): { text: string; value: string }[] {
        if (!filter || filter.length === 0) return [];
        
        return filter.map(f => {
            if (typeof f === 'string') {
                return { text: f, value: f };
            }
            if (typeof f === 'object' && f !== null) {
                const text = f.text || f.label || f.name || String(f.value ?? f);
                const value = f.value !== undefined ? String(f.value) : (f.text || f.label || f.name || String(f));
                return { text, value };
            }
            return { text: String(f), value: String(f) };
        });
    }

    public generateFlatFile(config: ENodeBConfig): ConfMapConfig {
        const result: ConfMapConfig = {};
        config.ratTypeList.forEach(rat => {
            rat.configObjTypeList.forEach(typeItem => {
                const category = typeItem.configType || 'bsc';
                const prefix = typeItem.mmlCommandNamePrefix || category;
                typeItem.configObjList.forEach(rootObj => {
                    this._processNodeForFlatFile(rootObj, category, prefix, [], result, '', []);
                });
            });
        });
        return result;
    }

    private _processNodeForFlatFile(
        obj: ConfigObj,
        category: string,
        prefix: string,
        pathStack: string[],
        result: ConfMapConfig,
        parentKey: string,
        indexContext: Array<{ pathSegment: string; indexVar: string }>
    ): void {
        const detail = obj.confObjDetail || obj;
        const dataName = detail.dataName || obj.configObjName || 'unknown';
        const currentPathStack = [...pathStack, dataName];
        const detailMeta = detail as any;
        const mmlPosfix = detailMeta.mmlCommandNamePosfix || '';
        const isComposite = !!detailMeta.isComposite;
        const compositeShareParent = !!detailMeta.compositeShareParent;
        const arrayType = detailMeta.arrayType || undefined;
        const hasIndexParam = (detail.params || []).some(p => p.dataName === 'index' && p.isPrimaryKey);
        let currentIndexVar: string | null = null;
        if (hasIndexParam) {
            currentIndexVar = this._buildIndexVariable(prefix, currentPathStack);
        }
        const nodePath = this._buildNodePath(currentPathStack, hasIndexParam, currentIndexVar, indexContext, compositeShareParent);
        const keyPart = mmlPosfix || this._toPascalCase(dataName);
        const uniqueKey = prefix + parentKey + keyPart;
        const operationTypes = detail.operationTypes || [];
        let filter: string;
        if (isComposite && compositeShareParent) {
            filter = dataName;
        } else {
            const compositeParams = this._getCompositeParamNames(detail);
            const filterParams = (detail.params || []).filter(p => !p.isPrimaryKey && !compositeParams.includes(p.dataName));
            filter = filterParams.map(p => p.dataName).join(',');
        }
        let shouldAddEntry: boolean;
        if (isComposite) {
            shouldAddEntry = true;
        } else {
            const compositeParams = this._getCompositeParamNames(detail);
            const relevantParams = (detail.params || []).filter(p => !p.isPrimaryKey && !compositeParams.includes(p.dataName));
            shouldAddEntry = relevantParams.length > 0;
        }
        if (shouldAddEntry) {
            const entry: FlatFileEntry = {
                category,
                class_name: detail.className || 'mo',
                operation_types: operationTypes.map(op => op.operationName),
                node_path: nodePath,
                filter
            };
            if (arrayType) {
                (entry as any).array_type = arrayType;
            }
            result[uniqueKey] = entry;
        }
        const children = detail.configObjList || obj.configObjList || [];
        if (children.length > 0) {
            const nextParentKey = parentKey + keyPart;
            const nextIndexContext = [...indexContext];
            if (hasIndexParam && currentIndexVar) {
                nextIndexContext.push({ pathSegment: dataName, indexVar: currentIndexVar });
            }
            children.forEach(child => {
                this._processNodeForFlatFile(child, category, prefix, currentPathStack, result, nextParentKey, nextIndexContext);
            });
        }
    }

    private _getCompositeParamNames(detail: any): string[] {
        const compositeNames: string[] = [];
        const params = detail.params || [];
        const children = detail.configObjList || [];
        for (const param of params) {
            const matchingChild = children.find((child: any) => {
                const childDetail = child.confObjDetail || child;
                const childMeta = childDetail as any;
                return childDetail.dataName === param.dataName && childMeta.isComposite;
            });
            if (matchingChild) {
                compositeNames.push(param.dataName);
            }
        }
        return compositeNames;
    }

    private _buildNodePath(
        pathStack: string[],
        hasIndexParam: boolean,
        indexVar: string | null,
        indexContext: Array<{ pathSegment: string; indexVar: string }>,
        compositeShareParent: boolean
    ): string {
        if (pathStack.length === 0) return '/';
        const effectivePath = compositeShareParent ? pathStack.slice(0, -1) : pathStack;
        const segments: string[] = [];
        for (let i = 0; i < effectivePath.length; i++) {
            const segment = effectivePath[i];
            const contextEntry = indexContext.find(ctx => ctx.pathSegment === segment);
            if (contextEntry) {
                segments.push(segment);
                segments.push(contextEntry.indexVar);
            } else if (i === effectivePath.length - 1 && hasIndexParam && indexVar) {
                segments.push(segment);
                segments.push(indexVar);
            } else {
                segments.push(segment);
            }
        }
        return '/' + segments.join('/');
    }

    private _buildIndexVariable(prefix: string, pathStack: string[]): string {
        const pathStr = pathStack.join('_');
        return '${' + prefix + '_' + pathStr + '_index}';
    }

    private _toPascalCase(str: string): string {
        if (!str) return '';
        return str.replace(/[\W_]+(.)/g, (_, chr) => chr.toUpperCase()).replace(/^(.)/, (_, chr) => chr.toUpperCase());
    }

    private flattenENodeBConfig(configType: ConfigObjType): SettingItem[] {
        const flatList: SettingItem[] = [];
        configType.configObjList.forEach(rootObj => {
            this.processConfigObj(rootObj, [], [], flatList);
        });
        return flatList;
    }

    private processConfigObj(obj: ConfigObj, parentAbs: string[], parentData: string[], result: SettingItem[]): void {
        const currentAbs = [...parentAbs];
        const currentData = [...parentData];
        const configItem: SettingItem = {
            dataName: obj.dataName || obj.configObjName || '',
            show: !!obj.showInUI,
            parameterName: obj.parameterName || obj.title || '',
            abbreviation: obj.abbreviation || '',
            parentAbbreviationNames: [...parentAbs],
            parentDataNames: [...parentData],
            isEditable: false,
            hasParam: false,
            showInNavMenue: !!obj.showInNavMenue
        };
        if (obj.dataName !== '0') result.push(configItem);
        currentAbs.push(obj.abbreviation || '0');
        currentData.push(obj.dataName || '');
        const detail = obj.confObjDetail || obj;
        const children = detail.configObjList || obj.configObjList || [];
        if (children.length > 0) {
            children.forEach((child: ConfigObj) => {
                this.processConfigObj(child, currentAbs, currentData, result);
            });
        }
    }

    private determineInputType(param: Parameter): 'select' | 'number' | 'text' | 'boolean' {
        if (param.filter && param.filter.length > 0) return 'select';
        switch (param.type) {
            case 'Integer':
            case 'Float': return 'number';
            default: return 'text';
        }
    }

    private generateMetaData(param: Parameter): any {
        if (param.filter && param.filter.length > 0) {
            return param.filter.map((f: any) => ({ value: f.value || f, label: f.label || f.name || f }));
        }
        if (param.type === 'Integer' || param.type === 'Float') {
            if (param.validation) return this.parseRange(param.validation);
            return null;
        }
        return null;
    }

    private parseRange(validationStr: string): { min: number, max: number } | null {
        try {
            const parts = validationStr.match(/(-?\d+)/g);
            if (parts && parts.length >= 2) {
                return { min: parseFloat(parts[0]), max: parseFloat(parts[1]) };
            }
        } catch (e) {
            console.warn('Failed to parse validation string', validationStr);
        }
        return null;
    }

    private processNode(obj: ConfigObj, keyPrefix: string, category: string, pathStack: string[], result: ConfMapConfig): void {
        const detail = obj.confObjDetail || obj;
        const currentKeyPart = detail.mmlCommandNamePosfix || this._toPascalCase(detail.abbreviation || detail.dataName || '');
        const uniqueKey = keyPrefix + currentKeyPart;
        const currentPathStack = [...pathStack, detail.dataName || ''];
        const nodePath = '/' + currentPathStack.join('/');
        result[uniqueKey] = {
            category,
            class_name: detail.className || 'mo',
            operation_types: (detail.operationTypes || []).map(op => op.operationName),
            node_path: nodePath,
            filter: this.generateFilterString(obj)
        };
        const children = detail.configObjList || obj.configObjList || [];
        if (children.length > 0) {
            children.forEach(child => {
                this.processNode(child, uniqueKey, category, currentPathStack.filter((p): p is string => !!p), result);
            });
        }
    }

    private generateFilterString(obj: ConfigObj): string {
        if (!obj.params || obj.params.length === 0) return '';
        return obj.params.map(p => p.dataName).join(',');
    }

   

    
}