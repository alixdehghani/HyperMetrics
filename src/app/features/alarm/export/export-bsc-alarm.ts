import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { firstValueFrom } from 'rxjs';
import { BSCAlarmService } from '../../alarm/bsc-alarm.service';

export const bscFilenames = {
    ZipFile: 'bsc_alarm_files.zip',
    HyperConfig: 'bsc_alarm_hyperconfig.json',
    FlatFile: 'bsc_alarm_flatfile.json',
    Documentation: 'bsc-alarm-documentation.html',
    YmlFile: 'bsc_alarm-info.yml'
};

export interface BSCAlarm {
    advise: string;
    alarmId: number;
    alarmName: string;
    alarmTypeId: number;
    alarmTypeIdSwitch: string;
    appendInfo: string;
    brdTypeId: number;
    brdTypeIdSwitch: string;
    cause: string;
    dataUpdatePath: string;
    editPeople: string;
    intoDbTime: string;
    isRedefined: string;
    languageType: string;
    levelId: number;
    neTypeId: string;
    staticInfoSwitch: string;
    xXDWInfo1: string;
    xXDWInfo2: string;
    xXKZInfo1: string;
    xXKZInfo2: string;
    xXKZInfo3: string;
    xXKZInfo4: string;
}

export interface BSCAlarmConfig {
    bsc_alarms: BSCAlarm[];
}

interface BSCFlatFileEntry {
    category: string;
    class_name: string;
    operation_types: string[];
    node_path: string;
    filter: string;
    alarm_level?: number;
    alarm_type?: number;
}

interface BSCDocParam {
    fieldName: string;
    fieldValue: string;
    isEmpty: boolean;
}

interface BSCDocSection {
    alarmId: number;
    alarmName: string;
    advise: string;
    cause: string;
    levelId: number;
    levelName: string;
    alarmTypeId: number;
    alarmTypeName: string;
    brdTypeId: number;
    params: BSCDocParam[];
    sectionId: string;
}

@Component({
    selector: 'export-bsc-alarm',
    standalone: true,
    imports: [CommonModule],
    templateUrl: 'export-bsc-alarm.html'
})
export class ExportBSCAlarm {
    private bscAlarmService = inject(BSCAlarmService);

    @Input() config: BSCAlarmConfig | null = null;

    showFullscreen = false;
    allErrors: string[] = [];

    // Expose filenames to template
    filenames = bscFilenames;

    private levelNames: Record<number, string> = {
        0: 'Critical',
        1: 'Major',
        2: 'Minor',
        3: 'Warning'
    };

    private alarmTypeNames: Record<number, string> = {
        0: 'Communication',
        1: 'Equipment',
        2: 'Processing'
    };

    close() {
        this.showFullscreen = false;
    }

    async open() {
        const data = this.config ?? await firstValueFrom(this.bscAlarmService.config$);
        if (!data || !data.bsc_alarms || data.bsc_alarms.length === 0) {
            alert(`No BSC alarm configuration found to open.`);
            return;
        }
        this.showFullscreen = true;
                console.log("1111111")

    }

    async downloadAll() {
        const zip = new JSZip();
        const data = await firstValueFrom(this.bscAlarmService.config$);
        if (!data) {
            alert('No BSC alarm data found.');
            return;
        }
        zip.file(bscFilenames['HyperConfig'], this._getHyperConfigBlobFile(data));
        zip.file(bscFilenames['FlatFile'], this._getFlatFileBlobFile(data));
        zip.file(bscFilenames['YmlFile'], this._getYmlBlobFile(data)); 

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, bscFilenames['ZipFile']);
    }

    async downloadHyperConfigFile() {
        const data = await firstValueFrom(this.bscAlarmService.config$);
        if (!data) {
            alert('No BSC alarm data found.');
            return;
        }
        const blob = this._getHyperConfigBlobFile(data);
        saveAs(blob, bscFilenames['HyperConfig']);
    }

    async downloadFlatFile() {
        const data = await firstValueFrom(this.bscAlarmService.config$);
        if (!data) {
            alert('No BSC alarm data found.');
            return;
        }
        const blob = this._getFlatFileBlobFile(data);
        saveAs(blob, bscFilenames['FlatFile']);
    }

    async downloadDocumentation() {
        try {
            const data = await firstValueFrom(this.bscAlarmService.config$);
            if (!data || !data.bsc_alarms || data.bsc_alarms.length === 0) {
                alert('No BSC alarm data found.');
                return;
            }
            const sections = this._buildDocSections(data);
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
            console.error('BSC Alarm documentation generation failed:', err);
            alert(`Error: ${(err as Error)?.message || err}`);
        }
    }
    async downloadYmlFile(): Promise<void> {
    const data = await firstValueFrom(this.bscAlarmService.config$);
    if (!data) {
        alert('No BSC alarm data found.');
        return;
    }
    const blob = this._getYmlBlobFile(data);
    saveAs(blob, bscFilenames['YmlFile']);
    }

    private _getYmlBlobFile(config: BSCAlarmConfig): Blob {
        return new Blob([JSON.stringify(config, null, 2)], { type: 'application/x-yaml' });
    }
    private _getHyperConfigBlobFile(config: BSCAlarmConfig): Blob {
        return new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    }

    private _getFlatFileBlobFile(config: BSCAlarmConfig): Blob {
        const flatFileJson = this.generateFlatFile(config);
        return new Blob([JSON.stringify(flatFileJson, null, 2)], { type: 'application/json' });
    }

    public generateFlatFile(config: BSCAlarmConfig): Record<string, BSCFlatFileEntry> {
        const result: Record<string, BSCFlatFileEntry> = {};

        config.bsc_alarms.forEach((alarm) => {
            const key = `BSC_ALARM_${alarm.alarmId}`;

            const filterFields = ['advise', 'cause', 'alarmName', 'editPeople']
                .filter(field => {
                    const val = alarm[field as keyof BSCAlarm];
                    return val && String(val).trim() !== '';
                })
                .join(',');

            const entry: BSCFlatFileEntry = {
                category: 'bsc_alarm',
                class_name: 'alarm',
                operation_types: ['GET', 'SET', 'DELETE'],
                node_path: `/bsc/alarm/${alarm.alarmId}`,
                filter: filterFields || 'alarmName',
                alarm_level: alarm.levelId,
                alarm_type: alarm.alarmTypeId
            };

            result[key] = entry;
        });

        return result;
    }

    private _esc(str: string): string {
        if (!str || str === '—') return str || '—';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    private _buildDocSections(config: BSCAlarmConfig): BSCDocSection[] {
        const sections: BSCDocSection[] = [];

        config.bsc_alarms.forEach((alarm) => {
            const levelName = this.levelNames[alarm.levelId] || `Level ${alarm.levelId}`;
            const typeName = this.alarmTypeNames[alarm.alarmTypeId] || `Type ${alarm.alarmTypeId}`;

            const params: BSCDocParam[] = [
                { fieldName: 'Alarm ID', fieldValue: String(alarm.alarmId), isEmpty: false },
                { fieldName: 'Alarm Name', fieldValue: alarm.alarmName, isEmpty: !alarm.alarmName },
                { fieldName: 'Advise', fieldValue: alarm.advise, isEmpty: !alarm.advise },
                { fieldName: 'Cause', fieldValue: alarm.cause, isEmpty: !alarm.cause },
                { fieldName: 'Alarm Type ID', fieldValue: `${alarm.alarmTypeId} (${typeName})`, isEmpty: false },
                { fieldName: 'Level ID', fieldValue: `${alarm.levelId} (${levelName})`, isEmpty: false },
                { fieldName: 'Board Type ID', fieldValue: String(alarm.brdTypeId), isEmpty: false },
                { fieldName: 'Edit People', fieldValue: alarm.editPeople, isEmpty: !alarm.editPeople },
                { fieldName: 'Alarm Type Switch', fieldValue: alarm.alarmTypeIdSwitch, isEmpty: !alarm.alarmTypeIdSwitch },
                { fieldName: 'Append Info', fieldValue: alarm.appendInfo, isEmpty: !alarm.appendInfo },
                { fieldName: 'Board Type Switch', fieldValue: alarm.brdTypeIdSwitch, isEmpty: !alarm.brdTypeIdSwitch },
                { fieldName: 'Data Update Path', fieldValue: alarm.dataUpdatePath, isEmpty: !alarm.dataUpdatePath },
                { fieldName: 'Into DB Time', fieldValue: alarm.intoDbTime, isEmpty: !alarm.intoDbTime },
                { fieldName: 'Is Redefined', fieldValue: alarm.isRedefined, isEmpty: !alarm.isRedefined },
                { fieldName: 'Language Type', fieldValue: alarm.languageType, isEmpty: !alarm.languageType },
                { fieldName: 'NE Type ID', fieldValue: alarm.neTypeId, isEmpty: !alarm.neTypeId },
                { fieldName: 'Static Info Switch', fieldValue: alarm.staticInfoSwitch, isEmpty: !alarm.staticInfoSwitch },
                { fieldName: 'XXDW Info 1', fieldValue: alarm.xXDWInfo1, isEmpty: !alarm.xXDWInfo1 },
                { fieldName: 'XXDW Info 2', fieldValue: alarm.xXDWInfo2, isEmpty: !alarm.xXDWInfo2 },
                { fieldName: 'XXKZ Info 1', fieldValue: alarm.xXKZInfo1, isEmpty: !alarm.xXKZInfo1 },
                { fieldName: 'XXKZ Info 2', fieldValue: alarm.xXKZInfo2, isEmpty: !alarm.xXKZInfo2 },
                { fieldName: 'XXKZ Info 3', fieldValue: alarm.xXKZInfo3, isEmpty: !alarm.xXKZInfo3 },
                { fieldName: 'XXKZ Info 4', fieldValue: alarm.xXKZInfo4, isEmpty: !alarm.xXKZInfo4 },
            ];

            sections.push({
                alarmId: alarm.alarmId,
                alarmName: alarm.alarmName,
                advise: alarm.advise,
                cause: alarm.cause,
                levelId: alarm.levelId,
                levelName,
                alarmTypeId: alarm.alarmTypeId,
                alarmTypeName: typeName,
                brdTypeId: alarm.brdTypeId,
                params,
                sectionId: `alarm_${alarm.alarmId}`
            });
        });

        return sections;
    }

    private _buildDocumentationHTML(sections: BSCDocSection[]): string {
        const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        const levelColors: Record<number, { bg: string; accent: string; text: string }> = {
            0: { bg: '#7f1d1d', accent: '#dc2626', text: 'Critical' },
            1: { bg: '#7c2d12', accent: '#ea580c', text: 'Major' },
            2: { bg: '#713f12', accent: '#ca8a04', text: 'Minor' },
            3: { bg: '#1e3a8a', accent: '#3b82f6', text: 'Warning' }
        };

        const byLevel = new Map<number, BSCDocSection[]>();
        sections.forEach(s => {
            if (!byLevel.has(s.levelId)) {
                byLevel.set(s.levelId, []);
            }
            byLevel.get(s.levelId)!.push(s);
        });

        const renderSection = (section: BSCDocSection): string => {
            const colors = levelColors[section.levelId] || levelColors[3];

            const rowsHTML = section.params.map((p, i) => {
                const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                const emptyClass = p.isEmpty ? 'empty-field' : '';
                const displayValue = p.isEmpty ? '—' : this._esc(p.fieldValue);

                return `
        <tr style="background:${bg}" class="${emptyClass}">
            <td style="width:25%;font-weight:600;color:#475569">${this._esc(p.fieldName)}</td>
            <td style="width:75%">${displayValue}</td>
        </tr>`;
            }).join('');

            return `
        <div class="alarm-card" style="border-left:5px solid ${colors.accent};">
            <div class="alarm-header" style="background:linear-gradient(135deg,${colors.bg},${colors.bg}dd);">
                <div class="alarm-id">#${section.alarmId}</div>
                <div class="alarm-title">${this._esc(section.alarmName)}</div>
                <div class="alarm-badges">
                    <span class="badge level-badge" style="background:${colors.accent}22;color:${colors.accent};border:1px solid ${colors.accent}44">
                        ${colors.text}
                    </span>
                    <span class="badge type-badge">
                        ${this._esc(section.alarmTypeName)}
                    </span>
                    <span class="badge brd-badge">
                        Board ${section.brdTypeId}
                    </span>
                </div>
            </div>
            <div class="alarm-body">
                <div class="info-grid">
                    <div class="info-box">
                        <div class="info-label">Advise</div>
                        <div class="info-value">${this._esc(section.advise) || '—'}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-label">Cause</div>
                        <div class="info-value">${this._esc(section.cause) || '—'}</div>
                    </div>
                </div>
                <table class="params-table">
                    <thead>
                        <tr>
                            <th>Field</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHTML}</tbody>
                </table>
            </div>
        </div>`;
        };

        const levelsHTML = Array.from(byLevel.entries())
            .sort(([a], [b]) => a - b)
            .map(([levelId, levelSections]) => {
                const colors = levelColors[levelId] || levelColors[3];
                const sectionsHTML = levelSections.map(s => renderSection(s)).join('');

                return `
        <section class="level-section" style="--accent:${colors.accent};--bg:${colors.bg}">
            <div class="level-header" style="background:linear-gradient(135deg,${colors.bg},${colors.bg}dd);">
                <div class="level-title">${colors.text} Alarms</div>
                <div class="level-count">${levelSections.length} alarm(s)</div>
            </div>
            <div class="level-content">
                ${sectionsHTML}
            </div>
        </section>`;
            }).join('');

        return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>BSC Alarm Documentation</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    line-height: 1.6;
}
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 30px;
}
.header {
    background: linear-gradient(135deg, #1e293b, #0f172a);
    color: white;
    padding: 40px;
    border-radius: 16px;
    margin-bottom: 30px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
}
.header h1 {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 8px;
    letter-spacing: -0.5px;
}
.header .subtitle {
    opacity: 0.7;
    font-size: 14px;
}
.header .meta {
    margin-top: 16px;
    display: flex;
    gap: 20px;
    font-size: 13px;
    opacity: 0.8;
}
.meta-item {
    background: rgba(255,255,255,0.1);
    padding: 6px 14px;
    border-radius: 20px;
}
.level-section {
    margin-bottom: 40px;
}
.level-header {
    color: white;
    padding: 20px 24px;
    border-radius: 12px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.level-title {
    font-size: 20px;
    font-weight: 700;
}
.level-count {
    background: rgba(255,255,255,0.2);
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
}
.alarm-card {
    background: white;
    border-radius: 12px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    overflow: hidden;
    break-inside: avoid;
}
.alarm-header {
    color: white;
    padding: 18px 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
}
.alarm-id {
    background: rgba(255,255,255,0.2);
    padding: 4px 12px;
    border-radius: 8px;
    font-family: 'SF Mono', monospace;
    font-size: 13px;
    font-weight: 700;
}
.alarm-title {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    min-width: 200px;
}
.alarm-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}
.badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
}
.type-badge {
    background: rgba(255,255,255,0.15);
    color: white;
}
.brd-badge {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.8);
}
.alarm-body {
    padding: 20px 24px;
}
.info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
}
@media (max-width: 768px) {
    .info-grid { grid-template-columns: 1fr; }
}
.info-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px;
}
.info-label {
    font-size: 11px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
}
.info-value {
    font-size: 13px;
    color: #334155;
    line-height: 1.5;
}
.params-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
}
.params-table th {
    background: #f1f5f9;
    padding: 10px 14px;
    text-align: left;
    font-weight: 700;
    color: #475569;
    border-bottom: 2px solid #e2e8f0;
}
.params-table td {
    padding: 8px 14px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
}
.params-table tr:last-child td {
    border-bottom: none;
}
.empty-field {
    opacity: 0.5;
}
.empty-field td:first-child {
    text-decoration: line-through;
    text-decoration-color: #cbd5e1;
}
.print-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: white;
    border: none;
    padding: 14px 28px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 9999;
}
.print-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(37, 99, 235, 0.4);
}
@media print {
    body { background: white; }
    .alarm-card { 
        box-shadow: none; 
        border: 1px solid #e2e8f0;
        page-break-inside: avoid;
    }
    .print-btn { display: none; }
    .level-section { page-break-before: always; }
    .level-section:first-of-type { page-break-before: auto; }
}
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>BSC Alarm Documentation</h1>
        <div class="subtitle">Base Station Controller Alarm Configuration Reference</div>
        <div class="meta">
            <span class="meta-item">${date}</span>
            <span class="meta-item">${sections.length} Total Alarms</span>
            <span class="meta-item">Board Type: 13 (BBU)</span>
        </div>
    </div>
    ${levelsHTML}
</div>
<button class="print-btn no-print" onclick="window.print()">
    Save as PDF
</button>
</body>
</html>`;
    }
}