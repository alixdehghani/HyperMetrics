// generate-hyperconfig-by-settings.js
const fs = require("fs");
const path = require("path");

const BASE = __dirname;

function loadJson(name) {
  const p = path.join(BASE, name);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// --- Load inputs -------------------------------------------------------------
const hyperTemplate = loadJson("HyperConfig.json");
const confMap       = loadJson("Hytera-Farabeen-conf-map.json");
const commandsList  = loadJson("commands.json");

const sibSetting = loadJson("sib_setting.json");
const enbSetting = loadJson("enb_setting.json");
const drbSetting = loadJson("drb_setting.json");
const rrSetting  = loadJson("rr_setting.json");

// --- Index helpers -----------------------------------------------------------

// commands by name
const commandsByName = {};
for (const c of commandsList) {
  commandsByName[c.name] = c;
}

// settings indexed by dataName (helper for param properties)
function indexSettings(arr) {
  const byName = {};
  for (const item of arr) {
    if (item.dataName != null) byName[item.dataName] = item;
  }
  return byName;
}

const settingsIndex = {
  sib: indexSettings(sibSetting),
  enb: indexSettings(enbSetting),
  drb: indexSettings(drbSetting),
  rr:  indexSettings(rrSetting),
};

// configTypeIds
const configTypeIds = {
  sib: "301",
  enb: "201",
  drb: "401",
  rr:  "501",
};

// --- Utility functions -------------------------------------------------------

function deriveModeType(cmdModeType, inputType) {
  if (cmdModeType) return cmdModeType;
  if (!inputType) return null;
  const it = inputType.toLowerCase();
  if (it === "select" || it === "multiselect") return it;
  return "input";
}

function metaToFilter(meta) {
  if (Array.isArray(meta)) {
    const out = [];
    for (const m of meta) {
      if (m && typeof m === "object") {
        const v = m.value;
        const lbl = m.label != null ? m.label : String(v);
        out.push({ text: String(lbl), value: String(v) });
      }
    }
    return out;
  }
  return [];
}

// Helper to normalize paths for comparison (ignore case, underscores, hyphens)
// e.g. "/sib1/sched_info/0" -> "sib1/schedinfo/0"
function normalizePath(p) {
  if (!p) return "";
  const parts = p.split("/").filter(Boolean);
  return parts.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, "")).join("/");
}

function buildMmlPostfix(keyName) {
  if (!keyName) return "";
  return keyName[0].toUpperCase() + keyName.slice(1);
}

// --- Param Merging -----------------------------------------------------------

function mergeParamFromCommands(category, paramName, commandDefs, settingsIdx) {
  let cmdParam = null;

  if (Array.isArray(commandDefs)) {
    outer:
    for (const cmdDef of commandDefs) {
      for (const cmd of cmdDef.commands || []) {
        for (const p of cmd.params || []) {
          // Try exact match or normalized match for param name
          if (p.name === paramName || 
              p.name.toLowerCase().replace(/_/g,"") === paramName.toLowerCase().replace(/_/g,"")) {
            cmdParam = p;
            break outer;
          }
        }
      }
    }
  }

  const setting = settingsIdx ? settingsIdx[paramName] : null;
  const param = {};

  if (cmdParam) {
    param.id           = cmdParam.id;
    param.name         = cmdParam.name;
    param.title        = cmdParam.title;
    param.type         = cmdParam.type;
    param.validation   = cmdParam.validation;
    param.uiValidation = cmdParam.uiValidation;
    param.defaultValue = cmdParam.defaultValue;
    param.isPrimaryKey = cmdParam.isPrimaryKey ?? false;
    param.required     = cmdParam.required ?? false;
    param.isEnabled    = cmdParam.isEnabled ?? true;
    param.unit         = cmdParam.unit;
    const cmdFilter    = cmdParam.filter || [];
    if (cmdFilter.length) param.filter = cmdFilter;
  } else {
    param.id           = null;
    param.name         = paramName;
    param.title        = paramName;
    param.type         = null;
    param.validation   = null;
    param.uiValidation = null;
    param.defaultValue = "";
    param.isPrimaryKey = false;
    param.required     = false;
    param.isEnabled    = true;
    param.unit         = null;
  }

  if (setting) {
    param.dataName      = setting.dataName || paramName;
    param.parameterName = setting.parameterName;
    param.abbreviation  = setting.abbreviation;
    param.isEditable    = setting.isEditable ?? true;
    param.showInWizard  = setting.showInWizard ?? false;

    const inputType = setting.inputType;
    const cmdModeType = cmdParam ? cmdParam.modeType : null;
    param.modeType = deriveModeType(cmdModeType, inputType);

    if (!("filter" in param)) {
      const f = metaToFilter(setting.metaData);
      if (f.length) param.filter = f;
    }

    param.showInOSS = true;
    param.showInUI  = true;
  } else {
    param.dataName      = paramName;
    param.parameterName = param.title;
    param.abbreviation  = paramName;
    param.isEditable    = true;
    param.showInWizard  = false;
    const cmdModeType = cmdParam ? cmdParam.modeType : null;
    param.modeType      = deriveModeType(cmdModeType, null);
    param.showInOSS     = true;
    param.showInUI      = true;
  }

  return param;
}

// --- Build config types (Path-based) -----------------------------------------

let nextConfigObjId = 1000;

function buildConfigType(category, settingArr) {
  const cfgTypeId = configTypeIds[category] || String(900 + Math.floor(Math.random() * 100));
  const cfgType = {
    configType: category,
    mmlCommandNamePrefix: category,
    configTypeId: cfgTypeId,
    configObjList: []
  };

  const settingsIdx = settingsIndex[category];
  
  // Map to store nodes by their constructed path: e.g. "sib1/sched_info/0"
  const nodesByPath = {};
  
  // Helper to get or create a node for a given path array
  function getOrCreateNode(pathParts, properties = {}) {
    if (pathParts.length === 0) return null;
    const pathKey = pathParts.join("/");
    
    if (nodesByPath[pathKey]) {
      // If properties provided, merge them (e.g. explicit definition overwrites implicit)
      if (Object.keys(properties).length > 0) {
        Object.assign(nodesByPath[pathKey], properties);
      }
      return nodesByPath[pathKey];
    }

    // Recursive create parent
    const parentPath = pathParts.slice(0, -1);
    const parentNode = parentPath.length > 0 ? getOrCreateNode(parentPath) : null;

    const name = pathParts[pathParts.length - 1];
    
    const newNode = {
      dataName: name,
      title: properties.parameterName || properties.title || name,
      parameterName: properties.parameterName || "",
      abbreviation: properties.abbreviation || "",
      configObjId: String(nextConfigObjId++),
      mmlCommandNamePosfix: "",
      className: null,
      module: null,
      operationTypes: [],
      showInOSS: true,
      showInUI: true,
      showInNavMenue: properties.showInNavMenue ?? true,
      params: [],
      configObjList: [],
      __cmdDefs: [],
      ...properties // Apply passed properties
    };

    nodesByPath[pathKey] = newNode;

    if (parentNode) {
      parentNode.configObjList.push(newNode);
    } else {
      cfgType.configObjList.push(newNode);
    }

    return newNode;
  }

  // 1) First pass: Create nodes for all "Group" items (hasParam == false)
  for (const item of settingArr) {
    if (item.hasParam === false && item.dataName) {
      const parts = [...(item.parentDataNames || []), item.dataName];
      getOrCreateNode(parts, item);
    }
  }

  // 2) Second pass: Process parameters
  for (const item of settingArr) {
    if (item.hasParam !== false && item.dataName) { // It's a param
      const parents = item.parentDataNames || [];
      if (parents.length === 0) continue;

      const parentNode = getOrCreateNode(parents);
      if (parentNode) {
          // Store param temporarily to be merged later
          if (!parentNode.__rawParams) parentNode.__rawParams = [];
          parentNode.__rawParams.push(item);
      }
    }
  }

  // 3) Bind commands from confMap using Normalized Path Matching
  //    This fixes duplicate/ambiguous node issues (e.g. multiple "logical_channel_config")
  for (const [keyName, info] of Object.entries(confMap)) {
     if (info.category !== category) continue;

     const mapPathRaw = info.node_path || "";
     const normMapPath = normalizePath(mapPathRaw); // e.g. "qciconfig/0/pdcpconfig"
     
     const cmdDef = commandsByName[keyName];
     if (!cmdDef) continue;

     // Find matching nodes
     for (const [nodePathKey, node] of Object.entries(nodesByPath)) {
         const normNodePath = normalizePath(nodePathKey);
         
         if (normNodePath === normMapPath) {
             // Match found! Bind command info.
             if (!node.className && info.class_name) node.className = info.class_name;
             if (!node.module && cmdDef.module) node.module = cmdDef.module;
             if (!node.mmlCommandNamePosfix) node.mmlCommandNamePosfix = buildMmlPostfix(keyName);

             const allowed = info.operation_types ? new Set(info.operation_types) : null;
             
             // Add operations
             for (const cmd of cmdDef.commands || []) {
                 if (allowed && !allowed.has(cmd.type)) continue;
                 
                 // Avoid dups
                 if (!node.operationTypes.some(op => op.operationName === cmd.name && op.msgId === cmd.msgId)) {
                     node.operationTypes.push({
                         operationName: cmd.name,
                         msgId: cmd.msgId,
                         operationCode: cmd.code,
                         operationType: cmd.type,
                         title: cmd.title,
                         isDangerous: cmd.isDangerous ?? false
                     });
                 }
             }
             
             // Add to internal cmd defs for param merging
             node.__cmdDefs.push(cmdDef);
         }
     }
  }

  // 4) Process params for each node (merging with commands)
  for (const node of Object.values(nodesByPath)) {
      if (node.__rawParams) {
          for (const item of node.__rawParams) {
              const param = mergeParamFromCommands(category, item.dataName, node.__cmdDefs, settingsIdx);
              node.params.push(param);
          }
          delete node.__rawParams;
      }
      delete node.__cmdDefs; // Cleanup
  }

  return cfgType;
}

// --- Build all config types --------------------------------------------------

const configObjTypeList = [];

configObjTypeList.push(buildConfigType("sib", sibSetting));
configObjTypeList.push(buildConfigType("enb", enbSetting));
configObjTypeList.push(buildConfigType("rr",  rrSetting));
configObjTypeList.push(buildConfigType("drb", drbSetting));

// Final HyperConfig object
const newHyper = {
  neVersion: hyperTemplate.neVersion,
  neTypeId: hyperTemplate.neTypeId,
  neTypeName: hyperTemplate.neTypeName,
  configObjTypeList
};

const outPath = path.join(BASE, "HyperConfig.generated.bySettings.json");
fs.writeFileSync(outPath, JSON.stringify(newHyper, null, 4), "utf8");
console.log("Wrote", outPath);
