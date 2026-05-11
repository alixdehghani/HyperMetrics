import { Component, inject } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ENodeBTreeService } from '../enodeb-tree.service';
import { map, Observable, take, firstValueFrom } from 'rxjs';
import { ConfigObj, ConfigObjType, ConfMapConfig, ENodeBConfig, ICommand, ICommandParams, OperationType, Parameter, SettingItem } from '../enodeb-config.model';

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
}

@Component({
    selector: 'export-config',
    templateUrl: 'export.html'
})

export class ExportConfig {

    private eNodeBTreeService = inject(ENodeBTreeService);
    showFullscreen = false;
    allErrors: string[] = [];

    close() {
        this.showFullscreen = false;
    }

    async open() {
        const data = await firstValueFrom(this.eNodeBTreeService.config$);
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

            const byType = new Map<string, DocSection[]>();

            sections.forEach(s => {

                if (!byType.has(s.configType)) {
                    byType.set(s.configType, []);
                }

                byType.get(s.configType)!.push(s);
            });

            const html = this._buildDocumentationHTML(
                sections,
                byType
            );

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

    private _loadScript(src: string, globalKey: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any)[globalKey]) { resolve(); return; }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load: ' + src));
            document.head.appendChild(script);
        });
    }

   
    private _buildDocSections(config: ENodeBConfig): DocSection[] {
        const sections: DocSection[] = [];
        config.configObjTypeList.forEach(typeItem => {
            typeItem.configObjList.forEach(rootObj => {
                this._traverseForDoc(rootObj, typeItem.configType, [], sections, 0);
            });
        });
        return sections;
    }

    
    private _traverseForDoc(
        obj: ConfigObj,
        configType: string,
        pathStack: string[],
        sections: DocSection[],
        depth: number
    ): void {
        const currentPath = [...pathStack, obj.dataName];
        const nodePath = '/' + currentPath.join('/');
        const nodeTitle = obj.title || obj.parameterName || obj.dataName;

        const params: DocParam[] = (obj.params || []).map(p => ({
            nodePath,
            nodeTitle,
            dataName: p.dataName,
            parameterName: p.parameterName || p.title || p.name || p.dataName,
            type: p.type || '—',
            defaultValue: p.defaultValue != null ? String(p.defaultValue) : '—',
            validation: p.validation || p.uiValidation || '—',
            isEditable: !!p.isEditable,
            filterOptions: p.filter && p.filter.length > 0
                ? p.filter.map((f: any) => f.label || f.name || f.value || String(f)).join(', ')
                : '—'
        }));

        // Only add section if it has params or children (skip empty leaf-less nodes)
        if (params.length > 0 || (obj.configObjList && obj.configObjList.length > 0)) {
            sections.push({ configType, nodePath, nodeTitle, depth, params });
        }

        if (obj.configObjList && obj.configObjList.length > 0) {
            obj.configObjList.forEach(child => {
                this._traverseForDoc(child, configType, currentPath, sections, depth + 1);
            });
        }
    }

   
    private _esc(str: string): string {
        if (!str || str === '—') return str || '—';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    private _buildDocumentationHTML(sections: DocSection[], byType: Map<string, DocSection[]>): string {

        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const totalParams = sections.reduce((acc, s) => acc + s.params.length, 0);
        const totalNodes = sections.filter(s => s.params.length > 0).length;
        const moduleNames = Array.from(byType.keys()).map(k => k.toUpperCase()).join(' · ');

        const chapterColors: Record<string, string> = {
            enb: '#1e3a8a',
            sib: '#065f46',
            rr: '#581c87',
            drb: '#7c2d12'
        };

        const chapterAccents: Record<string, string> = {
            enb: '#3b82f6',
            sib: '#10b981',
            rr: '#a855f7',
            drb: '#f97316'
        };

        const chaptersHTML = Array.from(byType.entries()).map(([type, typeSections], ci) => {

            const bgColor = chapterColors[type] || '#1e3a5f';
            const accent = chapterAccents[type] || '#60a5fa';
            const chapterParams = typeSections.reduce((a, s) => a + s.params.length, 0);

            const sectionsHTML = typeSections.map(section => {

                if (section.params.length === 0) return '';

                const depth = section.depth;
                const hue = depth === 0 ? bgColor : depth === 1 ? '#2d394b' : '#475569';
                const indent = depth * 16;

                const rowsHTML = section.params.map((p, i) => {

                    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';

                    const editIcon = p.isEditable ? '✓' : '✗';

                    const filterVal =
                        p.filterOptions === '—' || p.filterOptions === '&mdash;'
                            ? ''
                            : this._esc(p.filterOptions);

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

                return `
    <div class="section" style="margin-left:${indent}px;">

        <div class="section-header" style="background:${hue}">
            <span style="opacity:0.6;font-size:8pt">${this._esc(section.nodePath)}</span>
            <span style="font-weight:700">${this._esc(section.nodeTitle)}</span>
            <span style="float:right;opacity:0.8;font-size:8pt">${section.params.length} params</span>
        </div>

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

            <tbody>
                ${rowsHTML}
            </tbody>
        </table>

    </div>`;
            }).join('');

            return `
    <section style="page-break-before:${ci > 0 ? 'always' : 'auto'}">

        <div style="background:linear-gradient(135deg,${bgColor},${bgColor}dd);
            border-left:5px solid ${accent};
            color:white;padding:18px;margin-bottom:20px;border-radius:8px;">

            <div style="font-size:22px;font-weight:800">
                ${type.toUpperCase()}
            </div>

            <div style="opacity:0.7;font-size:12px">
                ${chapterParams} parameters
            </div>

        </div>

        ${sectionsHTML}

    </section>`;
        }).join('');

        return `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8"/>

    <style>


    * { box-sizing: border-box; }

    body {
        font-family: Inter, Arial;
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

    td {
        max-width: 0;  
    }

    /* header repeat fix */
    thead {
        display: table-header-group;
    }

    /* row safe */
    tr {
        break-inside: avoid;
    }

    /* badges */
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

    /* section */
    .section {
        margin-bottom: 18px;
        break-inside: avoid;
    }

    .section-header {
        padding: 10px;
        color: white;
        font-weight: 700;
    }

    @media print {
        body { background: white; }
        section { page-break-before: always; }
    }

    </style>

    </head>

    <body>

    <div style="padding:30px">

    <h2>ENodeB Documentation</h2>
    <p>${date}</p>

    
    ${chaptersHTML}

    </div>
<button
    class="no-print"
    onclick="window.print()"
    style="
        position:fixed;
        bottom:20px;
        right:20px;
        z-index:9999;
        background:#2563eb;
        color:white;
        border:none;
        padding:12px 22px;
        border-radius:8px;
        font-size:14px;
        font-weight:700;
        cursor:pointer;
        box-shadow:0 4px 12px rgba(0,0,0,.2);
    "
>
    Save as PDF
</button>
    </body>
    </html>`;
    }

    private _getHyperConfigBlobFile(config: ENodeBConfig): Blob {
        return new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    }

    private _getEnbSettingBlobFile(data: ENodeBConfig): Blob {
        const result = this.flattenENodeBConfig(data.configObjTypeList.find(item => item.configType === 'enb')!);
        return new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    }

    private _getSIBSettingBlobFile(data: ENodeBConfig): Blob {
        const result = this.flattenENodeBConfig(data.configObjTypeList.find(item => item.configType === 'sib')!);
        return new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    }

    private _getRRSettingBlobFile(data: ENodeBConfig): Blob {
        const result = this.flattenENodeBConfig(data.configObjTypeList.find(item => item.configType === 'rr')!);
        return new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    }

    private _getDRBSettingBlobFile(data: ENodeBConfig): Blob {
        const result = this.flattenENodeBConfig(data.configObjTypeList.find(item => item.configType === 'drb')!);
        return new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    }

    private _getHyteraFaraabenBlobFile(data: ENodeBConfig): Blob {
        const flatFileJson = this.generateFlatFile(data);
        return new Blob([JSON.stringify(flatFileJson, null, 2)], { type: 'application/json' });
    }

    private _getCommandsBlobFile(data: ENodeBConfig): Blob {
        const commands = this.convertToCommands(data);
        return new Blob([JSON.stringify(commands, null, 2)], { type: 'application/json' });
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
            dataName: obj.dataName,
            show: obj.showInUI,
            parameterName: obj.parameterName || obj.title,
            abbreviation: obj.abbreviation,
            parentAbbreviationNames: [...parentAbs],
            parentDataNames: [...parentData],
            isEditable: false,
            hasParam: false,
            showInNavMenue: obj.showInNavMenue
        };
        if (obj.dataName !== '0') result.push(configItem);
        currentAbs.push(obj.abbreviation || '0');
        currentData.push(obj.dataName);
        if (obj.params && obj.params.length > 0) {
            obj.params.forEach(param => {
                const paramItem: SettingItem = {
                    dataName: param.dataName,
                    show: param.showInUI,
                    parameterName: param.parameterName || param.title,
                    abbreviation: param.abbreviation,
                    parentAbbreviationNames: [...currentAbs],
                    parentDataNames: [...currentData],
                    isEditable: param.isEditable,
                    hasParam: true,
                    showInWizard: param.showInWizard,
                    inputType: this.determineInputType(param),
                    metaData: this.generateMetaData(param)
                };
                result.push(paramItem);
            });
        }
        if (obj.configObjList && obj.configObjList.length > 0) {
            obj.configObjList.forEach(childObj => {
                this.processConfigObj(childObj, currentAbs, currentData, result);
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

    public generateFlatFile(config: ENodeBConfig): ConfMapConfig {
        const result: ConfMapConfig = {};
        config.configObjTypeList.forEach(typeItem => {
            const prefix = typeItem.mmlCommandNamePrefix;
            const category = typeItem.configType || prefix;
            typeItem.configObjList.forEach(rootObj => {
                this.processNode(rootObj, prefix, category, [], result);
            });
        });
        return result;
    }

    private processNode(obj: ConfigObj, keyPrefix: string, category: string, pathStack: string[], result: ConfMapConfig): void {
        const currentKeyPart = obj.mmlCommandNamePosfix || this.toPascalCase(obj.abbreviation || obj.dataName);
        const uniqueKey = keyPrefix + currentKeyPart;
        const currentPathStack = [...pathStack, obj.dataName];
        const nodePath = '/' + currentPathStack.join('/');
        result[uniqueKey] = {
            category,
            class_name: obj.className || 'mo',
            operation_types: obj.operationTypes.map(op => op.operationName),
            node_path: nodePath,
            filter: this.generateFilterString(obj)
        };
        if (obj.configObjList && obj.configObjList.length > 0) {
            obj.configObjList.forEach(child => {
                this.processNode(child, uniqueKey, category, currentPathStack, result);
            });
        }
    }

    private generateFilterString(obj: ConfigObj): string {
        if (!obj.params || obj.params.length === 0) return '';
        return obj.params.map(p => p.dataName).join(',');
    }

    private toPascalCase(str: string): string {
        if (!str) return '';
        return str
            .replace(/[\W_]+(.)/g, (_, chr) => chr.toUpperCase())
            .replace(/^(.)/, (_, chr) => chr.toUpperCase());
    }

    private convertToCommands(treeData: ENodeBConfig): ICommand[] {
        const flattenedCommands: ICommand[] = [];
        if (treeData.configObjTypeList) {
            treeData.configObjTypeList.forEach((typeItem: ConfigObjType) => {
                if (typeItem.configObjList) {
                    typeItem.configObjList.forEach((obj: ConfigObj) => {
                        flattenedCommands.push(...this.processConfigObject(obj, typeItem.configType));
                    });
                }
            });
        }
        return flattenedCommands;
    }

    private processConfigObject(obj: ConfigObj, parentPath: string): ICommand[] {
        const results: ICommand[] = [];
        const command: ICommand = {
            module: obj.module,
            id: obj.configObjId,
            pmoName: `${parentPath}.${obj.dataName}`,
            name: obj.mmlCommandNamePosfix,
            title: obj.title,
            commands: this.mapOperations(obj.operationTypes, obj.params)
        };
        results.push(command);
        const nextPath = `${parentPath}.${obj.dataName}`;
        if (obj.configObjList && obj.configObjList.length > 0) {
            obj.configObjList.forEach((child: ConfigObj) => {
                results.push(...this.processConfigObject(child, nextPath));
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
            name: p.name || p.parameterName,
            title: p.title,
            isPrimaryKey: p.isPrimaryKey,
            required: p.required,
            isEnabled: p.isEnabled,
            unit: p.unit,
            defaultValue: p.defaultValue,
            type: p.type,
            validation: p.validation || '',
            uiValidation: p.uiValidation || '',
            filter: p.filter || [],
            modeType: p.modeType,
            showOn: p.showOn ? String(p.showOn) : null
        };
    }
}