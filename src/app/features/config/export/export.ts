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
    Commands: 'commands.json'
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

    private _getHyperConfigBlobFile(config: ENodeBConfig): Blob {
        return new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
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

        // Iterate over the top-level config object types
        // config.configObjTypeList.forEach(typeItem => {
        // Iterate over the root config objects in each type
        configType.configObjList.forEach(rootObj => {
            this.processConfigObj(rootObj, [], [], flatList);
            // });
        });

        return flatList;
    }
    private processConfigObj(
        obj: ConfigObj,
        parentAbs: string[],
        parentData: string[],
        result: SettingItem[]
    ): void {

        // 1. Convert the current ConfigObj (Container)
        const currentAbs = [...parentAbs];
        const currentData = [...parentData];

        const configItem: SettingItem = {
            dataName: obj.dataName,
            show: obj.showInUI, // Assumed mapping
            parameterName: obj.parameterName || obj.title, // Fallback to title if paramName empty
            abbreviation: obj.abbreviation,
            parentAbbreviationNames: [...parentAbs],
            parentDataNames: [...parentData],
            isEditable: false, // Containers usually not editable directly
            hasParam: false,
            showInNavMenue: obj.showInNavMenue
        };
        if (obj.dataName !== '0') {
            result.push(configItem);
        }

        // Update parents for children (current obj becomes a parent)
        currentAbs.push(obj.abbreviation || '0');
        currentData.push(obj.dataName);

        // 2. Process Parameters (Leafs of this node)
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

        // 3. Recursively process child ConfigObjects
        if (obj.configObjList && obj.configObjList.length > 0) {
            obj.configObjList.forEach(childObj => {
                this.processConfigObj(childObj, currentAbs, currentData, result);
            });
        }
    }
    private determineInputType(param: Parameter): 'select' | 'number' | 'text' | 'boolean' {
        if (param.filter && param.filter.length > 0) {
            return 'select';
        }

        switch (param.type) {
            case 'Integer':
            case 'Float':
                return 'number';
            // Add logic for Boolean if your system has a specific type for it
            default:
                return 'text';
        }
    }

    /**
     * Helper to extract metadata (options for selects, min/max for numbers)
     */
    private generateMetaData(param: Parameter): any {
        // Case 1: Select/Dropdown (Filter Options)
        if (param.filter && param.filter.length > 0) {
            // Assuming FilterOption has value/label structure. 
            // If FilterOption is just a string or different, adjust map below.
            return param.filter.map((f: any) => ({
                value: f.value || f, // handle if f is object or primitive
                label: f.label || f.name || f
            }));
        }

        // Case 2: Number Range (Validation String Parsing)
        if (param.type === 'Integer' || param.type === 'Float') {
            // Logic depends on your validation string format. 
            // Example implementation for a string like "range(-70, -22)" or "-70..-22"
            if (param.validation) {
                // Simple mock regex for "min..max" or similar
                // You should replace this with your actual validation parser
                return this.parseRange(param.validation);
            }
            return null;
        }

        return null;
    }

    private parseRange(validationStr: string): { min: number, max: number } | null {
        // Example placeholder parser
        // Adjust regex to match your actual data, e.g., "range(-70, -22)"
        try {
            // This is a dummy implementation. 
            // If string is "-70..-22"
            const parts = validationStr.match(/(-?\d+)/g);
            if (parts && parts.length >= 2) {
                return {
                    min: parseFloat(parts[0]),
                    max: parseFloat(parts[1])
                };
            }
        } catch (e) {
            console.warn('Failed to parse validation string', validationStr);
        }
        return null;
    }

    public generateFlatFile(config: ENodeBConfig): ConfMapConfig {
        const result: ConfMapConfig = {};

        // Iterate over each configuration type (e.g., 'enb', 'sib')
        config.configObjTypeList.forEach(typeItem => {
            // The prefix (e.g., "sib") used for property key generation
            const prefix = typeItem.mmlCommandNamePrefix;
            // The category name (e.g., "sib")
            const category = typeItem.configType || prefix;

            typeItem.configObjList.forEach(rootObj => {
                this.processNode(rootObj, prefix, category, [], result);
            });
        });

        return result;
    }

    /**
     * Recursive function to process nodes and their children
     * @param obj - Current ConfigObj
     * @param keyPrefix - The cumulative prefix for the JSON key (e.g., "sibSib1")
     * @param category - The category string
     * @param pathStack - Array of dataNames to build node_path (e.g., ["sib1", "sched_info"])
     * @param result - Reference to the result object
     */
    private processNode(
        obj: ConfigObj,
        keyPrefix: string,
        category: string,
        pathStack: string[],
        result: ConfMapConfig
    ): void {

        // 1. Construct the unique key for this entry
        // Strategy: Concatenate parent prefix + current postfix (or abbreviation/title if postfix missing)
        // Example: "sib" + "Sib1" = "sibSib1"
        const currentKeyPart = obj.mmlCommandNamePosfix || this.toPascalCase(obj.abbreviation || obj.dataName);
        const uniqueKey = keyPrefix + currentKeyPart;

        // 2. Construct the node_path
        // Example: /sib1/sched_info/0
        const currentPathStack = [...pathStack, obj.dataName];
        const nodePath = '/' + currentPathStack.join('/');

        // 3. Build the entry
        result[uniqueKey] = {
            category: category,
            class_name: obj.className || 'mo', // Default to 'mo' if missing
            operation_types: obj.operationTypes.map(op => op.operationName),
            node_path: nodePath,
            filter: this.generateFilterString(obj)
        };

        // 4. Process Children (Recursion)
        if (obj.configObjList && obj.configObjList.length > 0) {
            obj.configObjList.forEach(child => {
                // Pass the *current uniqueKey* as the prefix for the child
                // This creates keys like "sibSib1" -> "sibSib1SchedulingInfo"
                this.processNode(child, uniqueKey, category, currentPathStack, result);
            });
        }
    }

    /**
     * Helper to create the comma-separated filter string from parameters
     */
    private generateFilterString(obj: ConfigObj): string {
        if (!obj.params || obj.params.length === 0) {
            return '';
        }
        return obj.params.map(p => p.dataName).join(',');
    }

    /**
     * Helper to ensure key parts are PascalCase (Capitalized) to match example style
     * e.g., "scheduling_info" -> "SchedulingInfo"
     */
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
                    // Start recursion. 
                    // The base 'parentPath' is the configType (e.g., "ENodeBFunction").
                    typeItem.configObjList.forEach((obj: ConfigObj) => {
                        flattenedCommands.push(
                            ...this.processConfigObject(obj, typeItem.configType)
                        );
                    });
                }
            });
        }

        return flattenedCommands;
    }

    /**
     * Recursive function to process an object and its children.
     * @param obj The current object to process.
     * @param parentPath The accumulated path name of the parent (used as pmoName).
     */
    private processConfigObject(obj: ConfigObj, parentPath: string): ICommand[] {
        const results: ICommand[] = [];

        // 1. Map the current ConfigObj to ICommand
        const command: ICommand = {
            module: obj.module,
            id: obj.configObjId,
            pmoName: `${parentPath}.${obj.dataName}`,            // Current pmoName is the path passed from parent
            name: obj.mmlCommandNamePosfix, // Mapped from mmlCommandNamePosfix
            title: obj.title,
            commands: this.mapOperations(obj.operationTypes, obj.params)
        };

        results.push(command);

        // 2. Prepare the path for children
        // "join parent dataName or parent configType with ."
        // The next level's parentPath is: [Current Parent Path].[Current Data Name]
        const nextPath = `${parentPath}.${obj.dataName}`;

        // 3. Recursively process children if they exist
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