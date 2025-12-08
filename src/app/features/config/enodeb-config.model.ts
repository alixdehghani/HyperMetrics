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

export interface SettingItem {
  dataName: string;
  show: boolean;
  parameterName: string; // or Title
  abbreviation: string;
  parentAbbreviationNames: string[];
  parentDataNames: string[];
  isEditable: boolean;
  hasParam: boolean;
  showInNavMenue?: boolean; // Specific to ConfigObj
  showInWizard?: boolean;   // Specific to Parameter
  inputType?: 'select' | 'number' | 'text' | 'boolean';
  metaData?: any; // Can be array of options or min/max object
}

export interface ConfMapEntry {
  category: string;
  class_name: string;
  operation_types: string[];
  node_path: string;
  filter: string; // Comma-separated parameter dataNames
}

export interface ConfMapConfig {
  [key: string]: ConfMapEntry;
}

// Target Interfaces
export interface ICommand {
  module: string;
  id: string;
  pmoName: string; // Mapped from className
  name: string;    // Mapped from dataName
  title: string;
  commands: {
    msgId: string;
    name: string;
    code: string;
    type: string;
    title: string;
    isDangerous: boolean;
    params: ICommandParams[];
  }[];
}

export interface ICommandParams {
  id: string;
  name: string;
  title: string;
  isPrimaryKey: boolean;
  required: boolean;
  isEnabled: boolean;
  unit: string | null;
  defaultValue: string;
  type: string;
  validation: string;
  uiValidation: string;
  filter: any[];
  modeType: string;
  showOn: string | null;
}