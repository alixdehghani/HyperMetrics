import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouteService } from '../../core/services/route/route.service';
import { ExportBSCAlarm, BSCAlarm } from './export/export-bsc-alarm';
import { BSCAlarmService } from './bsc-alarm.service';

@Component({
    standalone: true,
    imports: [RouterModule, FormsModule, ReactiveFormsModule, CommonModule, ExportBSCAlarm],
    selector: 'alarm',
    templateUrl: 'alarm.html',
    styleUrls: ['./alarm.scss']
})
export class Alarm implements OnInit {
    expandedSections: { [key: string]: boolean } = {};
    searchTerm = '';
    activeFilter = -1;
    selectedAlarm: BSCAlarm | null = null;
    alarms: BSCAlarm[] = [];
    hasStoredData = false;

    routeService = inject(RouteService);
    private _fb = inject(FormBuilder);
    private bscAlarmService = inject(BSCAlarmService);

    private levelNames: Record<number, string> = { 0: 'Critical', 1: 'Major', 2: 'Minor', 3: 'Warning' };
    private levelClasses: Record<number, string> = { 0: 'critical', 1: 'major', 2: 'minor', 3: 'warning' };
    private typeNames: Record<number, string> = { 0: 'Communication', 1: 'Equipment', 2: 'Processing' };
    modalOpen = false;
modalMode: 'add' | 'edit' = 'add';
editingAlarm: BSCAlarm | null = null;
alarmForm!: FormGroup;

openAddModal(): void {
    this.modalMode = 'add';
    this.editingAlarm = null;
    this.alarmForm = this._fb.group({
        alarmId:       [null, Validators.required],
        advise:        ['', Validators.required],
        alarmName:     ['', Validators.required],
        cause:         [''],
        levelId:       [3],
        alarmTypeId:   [0],
        brdTypeId:     [13],
        neTypeId:      [''],
        editPeople:    [''],
        languageType:  [''],
        appendInfo:    [''],
        isRedefined:   [''],
        alarmTypeIdSwitch: [''],
        brdTypeIdSwitch:   [''],
        dataUpdatePath:    [''],
        intoDbTime:        [''],
        staticInfoSwitch:  [''],
        xXDWInfo1: [''], xXDWInfo2: [''],
        xXKZInfo1: [''], xXKZInfo2: [''], xXKZInfo3: [''], xXKZInfo4: [''],
    });
    this.modalOpen = true;
}

openEditModal(alarm: BSCAlarm): void {
    this.modalMode = 'edit';
    this.editingAlarm = alarm;
    this.alarmForm = this._fb.group({
        alarmId:       [alarm.alarmId, Validators.required],
        advise:        [alarm.advise, Validators.required],
        alarmName:     [alarm.alarmName, Validators.required],
        cause:         [alarm.cause],
        levelId:       [alarm.levelId],
        alarmTypeId:   [alarm.alarmTypeId],
        brdTypeId:     [alarm.brdTypeId],
        neTypeId:      [alarm.neTypeId],
        editPeople:    [alarm.editPeople],
        languageType:  [alarm.languageType],
        appendInfo:    [alarm.appendInfo],
        isRedefined:   [alarm.isRedefined],
        alarmTypeIdSwitch: [alarm.alarmTypeIdSwitch],
        brdTypeIdSwitch:   [alarm.brdTypeIdSwitch],
        dataUpdatePath:    [alarm.dataUpdatePath],
        intoDbTime:        [alarm.intoDbTime],
        staticInfoSwitch:  [alarm.staticInfoSwitch],
        xXDWInfo1: [alarm.xXDWInfo1], xXDWInfo2: [alarm.xXDWInfo2],
        xXKZInfo1: [alarm.xXKZInfo1], xXKZInfo2: [alarm.xXKZInfo2],
        xXKZInfo3: [alarm.xXKZInfo3], xXKZInfo4: [alarm.xXKZInfo4],
    });
    this.modalOpen = true;
}

closeModal(): void {
    this.modalOpen = false;
    this.editingAlarm = null;
}

saveAlarm(): void {
    if (this.alarmForm.invalid) return;
    const value = this.alarmForm.value as BSCAlarm;
    const config = this.bscAlarmService.getCurrentConfig();
    const alarms = config?.bsc_alarms ? [...config.bsc_alarms] : [];

    if (this.modalMode === 'add') {
        // چک duplicate ID
        if (alarms.some(a => a.alarmId === value.alarmId)) {
            alert(`Alarm ID ${value.alarmId} already exists.`);
            return;
        }
        alarms.push(value);
    } else {
        const idx = alarms.findIndex(a => a.alarmId === this.editingAlarm?.alarmId);
        if (idx !== -1) alarms[idx] = value;
    }

    this.bscAlarmService.loadConfig({ bsc_alarms: alarms });
    this.closeModal();
}

deleteAlarm(alarm: BSCAlarm): void {
    if (!confirm(`Delete alarm #${alarm.alarmId} "${alarm.advise}"?`)) return;
    const config = this.bscAlarmService.getCurrentConfig();
    if (!config) return;
    const alarms = config.bsc_alarms.filter(a => a.alarmId !== alarm.alarmId);
    this.bscAlarmService.loadConfig({ bsc_alarms: alarms });
    if (this.selectedAlarm?.alarmId === alarm.alarmId) {
        this.selectedAlarm = null;
    }
}
openAddModalWithLevel(levelId: number): void {
    this.openAddModal();
    this.alarmForm.patchValue({ levelId });
}
    ngOnInit(): void {
        this.hasStoredData = this.bscAlarmService.hasStoredConfig();
        this.bscAlarmService.fetchConfigFromPublic();
        this.bscAlarmService.config$.subscribe(config => {
            this.alarms = config?.bsc_alarms ?? [];
            [0, 1, 2, 3].forEach(l => this.expandedSections[this.levelNames[l]] = true);
        });
    }

    onJsonFileUpload(event: any): void {
        if (this.bscAlarmService.hasStoredConfig()) {
            if (!confirm('Are you sure? This will replace the current data.')) return;
        }
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e: any) => {
            try {
                this.bscAlarmService.loadConfigFromString(e.target.result);
                this.hasStoredData = true;
            } catch {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    }

    clearData(): void {
        if (!confirm('Are you sure you want to clear all alarm data?')) return;
        this.bscAlarmService.clearConfig();
        this.alarms = [];
        this.hasStoredData = false;
    }

    get filteredAlarms(): BSCAlarm[] {
        return this.alarms.filter(a => {
            const matchLevel = this.activeFilter === -1 || a.levelId === this.activeFilter;
            const term = this.searchTerm.toLowerCase();
            const matchSearch = !term ||
                a.alarmName.toLowerCase().includes(term) ||
                a.advise.toLowerCase().includes(term) ||
                String(a.alarmId).includes(term);
            return matchLevel && matchSearch;
        });
    }

    get filteredGroups() {
        const groups: { levelId: number; levelName: string; levelClass: string; alarms: BSCAlarm[] }[] = [];
        [0, 1, 2, 3].forEach(levelId => {
            const levelAlarms = this.filteredAlarms.filter(a => a.levelId === levelId);
            if (levelAlarms.length > 0) {
                groups.push({ levelId, levelName: this.levelNames[levelId], levelClass: this.levelClasses[levelId], alarms: levelAlarms });
            }
        });
        return groups;
    }

    countByLevel(level: number): number {
        return this.alarms.filter(a => a.levelId === level).length;
    }

    filterLevel(level: number): void { this.activeFilter = level; }
    toggleSection(section: string): void { this.expandedSections[section] = !this.expandedSections[section]; }
    selectAlarm(alarm: BSCAlarm): void { this.selectedAlarm = alarm; }
    getLevelName(levelId: number): string { return this.levelNames[levelId] ?? `Level ${levelId}`; }
    getLevelClass(levelId: number): string { return this.levelClasses[levelId] ?? 'warning'; }
    getTypeName(typeId: number): string { return this.typeNames[typeId] ?? `Type ${typeId}`; }
}