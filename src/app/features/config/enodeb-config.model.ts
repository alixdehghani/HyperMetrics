// models/enodeb-config.model.ts
export interface ENodeBConfig {
    neVersion: string;
    neTypeId: string;
    neTypeName: string;
    configObjTypeList: ConfigObjType[];
}

export interface ConfigObjType {
    configType: string;
    mmlCommandNamePrefix: string;
    configTypeId: string;
    configObjList: ConfigObj[];
}

export interface ConfigObj {
    configObjId: string;
    dataName: string;
    title: string;
    parameterName: string;
    abbreviation: string;
    mmlCommandNamePosfix: string;
    className: string;
    module: string;
    operationTypes: OperationType[];
    showInOSS: boolean;
    showInUI: boolean;
    showInNavMenue: boolean;
    params: Parameter[];
    configObjList?: ConfigObj[];
}

export interface OperationType {
    operationName: string;
    msgId: string;
    operationCode: string;
    operationType: string;
    title: string;
    isDangerous: boolean;
}

export interface Parameter {
    id: string;
    dataName: string;
    title: string;
    parameterName: string;
    abbreviation: string;
    name: string;
    unit: string | null;
    defaultValue: string;
    type: 'Integer' | 'OctetString' | 'Float';
    validation: string | null;
    uiValidation: string | null;
    filter: FilterOption[];
    modeType: string;
    showOn: any;
    isEditable: boolean;
    showInWizard: boolean;
    showInOSS: boolean;
    showInUI: boolean;
    isPrimaryKey: boolean;
    required: boolean;
    isEnabled: boolean;
}

export interface FilterOption {
    text: string;
    value: string;
}

export type TreeNodeType = 'root' | 'configType' | 'configObj' | 'operationType' | 'param';
