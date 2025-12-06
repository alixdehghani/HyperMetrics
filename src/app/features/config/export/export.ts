import { Component, inject } from '@angular/core';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ENodeBTreeService } from '../enodeb-tree.service';
import { map, Observable, take, firstValueFrom } from 'rxjs';

export const filenames = {
    ZipFile: 'exported_files.zip',
    HyperConfig: 'hyperConfig.json',
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
        const hyperBlob = await firstValueFrom(this.eNodeBTreeService.config$);        
        if (!hyperBlob) {
            alert(`No ${filenames.HyperConfig} found to open.`);
            return; 
        }
        this.showFullscreen = true;
    }

    async downloadAll() {
        const zip = new JSZip();
        const hyperBlob = await firstValueFrom(this._getHyperConfigBlobFile());
        zip.file(filenames['HyperConfig'], hyperBlob);
        // zip.file(filenames['Properties'], this._getPropertiesBlobFile());
        // zip.file(filenames['eNodeBNoRealtime'], this._getENodeBNoRealtimeBlobFile());
        // zip.file(filenames['KpiSetting'], this._getKpiSettingBlobFile());
        // zip.file(filenames['DefaultKpiFormulas'], this._getDefaultFormulasBlobFile());
        // zip.file(filenames['OssConfig'], this._getOssE2eTesingBlobFile());
        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, filenames['ZipFile']);
    }

    async downloadHyperConfigFiles() {
        const hyperBlob = await firstValueFrom(this._getHyperConfigBlobFile());
        saveAs(hyperBlob, filenames['HyperConfig']);
    }

    private _getHyperConfigBlobFile(): Observable<Blob> {
        return this.eNodeBTreeService.config$.pipe(take(1), map(res => new Blob([JSON.stringify(res, null, 2)], {
            type: 'application/json'
        })))
    }
}