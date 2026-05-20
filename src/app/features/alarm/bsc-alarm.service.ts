import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { BSCAlarmConfig } from './export/export-bsc-alarm';

@Injectable({
    providedIn: 'root'
})
export class BSCAlarmService {
    private readonly STORAGE_KEY = 'bsc_alarm_config';
    private configSubject = new BehaviorSubject<BSCAlarmConfig | null>(null);
    public config$: Observable<BSCAlarmConfig | null> = this.configSubject.asObservable();

    constructor() {
        this._loadFromStorage();
    }

    private _loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                this.configSubject.next(JSON.parse(raw));
            }
        } catch {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    private _saveToStorage(config: BSCAlarmConfig | null): void {
        if (config) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
        } else {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }

    loadConfig(config: BSCAlarmConfig): void {
        this.configSubject.next(config);
        this._saveToStorage(config);
    }

    loadConfigFromString(jsonString: string): void {
        try {
            const config: BSCAlarmConfig = JSON.parse(jsonString);
            this.configSubject.next(config);
            this._saveToStorage(config);
        } catch (err) {
            console.error('Failed to parse BSC alarm config:', err);
        }
    }

    async fetchConfigFromPublic(): Promise<void> {
        // اگه localStorage داره، از public نخون
        if (this.configSubject.value) return;
        try {
            const response = await fetch('/bsc_alarm-info.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const config: BSCAlarmConfig = await response.json();
            this.configSubject.next(config);
            this._saveToStorage(config);
        } catch (err) {
            console.error('Failed to fetch BSC alarm config:', err);
        }
    }

    getCurrentConfig(): BSCAlarmConfig | null {
        return this.configSubject.value;
    }

    clearConfig(): void {
        this.configSubject.next(null);
        localStorage.removeItem(this.STORAGE_KEY);
    }

    hasStoredConfig(): boolean {
        return !!localStorage.getItem(this.STORAGE_KEY);
    }
}