// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ConfigObj, ConfigObjType } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-conf-obj-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: 'edit-conf-obj-modal.html'
})
export class EditConfObjModalComponent implements OnInit {
  @Input() config: ConfigObj | null = null;
  @Input() path: number[] = [];
  @Input() mode!: 'edit' | 'view' | 'create';
  @Output() close = new EventEmitter<void>();


  confObjForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private treeService: ENodeBTreeService
  ) { }

  ngOnInit(): void {
    if (this.mode === 'edit' && !this.config) {
      alert('Invalid config provided to EditConfObjModalComponent');
      this.close.emit();
      return;
    }    
    this.confObjForm = this.fb.group({
      configObjId: [this.config?.configObjId || '', Validators.required],
      dataName: [this.config?.dataName || '', Validators.required],
      title: [this.config?.title || '', Validators.required],
      parameterName: [this.config?.parameterName || '', Validators.required],
      abbreviation: [this.config?.abbreviation || '', Validators.required],
      mmlCommandNamePosfix: [this.config?.mmlCommandNamePosfix || '', Validators.required],
      className: [this.config?.className || '', Validators.required],
      module: [this.config?.module || '', Validators.required],
      showInOSS: [this.config?.showInOSS || false],
      showInUI: [this.config?.showInUI || false],
      showInNavMenue: [this.config?.showInNavMenue || false],
      operationTypes: this.fb.array(this.config?.operationTypes || []),
      params: this.fb.array(this.config?.params || []),
    });    
    if (this.mode === 'view') {
      this.confObjForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confObjForm.valid) {
      const { configObjId, dataName, title, parameterName, abbreviation, mmlCommandNamePosfix, className, module, showInOSS, showInUI, showInNavMenue, params, operationTypes } = this.confObjForm.value;
      if (this.mode === 'create') {
        this.treeService.addConfigObj(this.path, { configObjId, dataName, title, parameterName, abbreviation, mmlCommandNamePosfix, className, module, showInOSS, showInUI, showInNavMenue, operationTypes: operationTypes || [], params: params || [], configObjList: [] });
      } else {
        this.treeService.updateConfigObj(this.path, { configObjId, dataName, title, parameterName, abbreviation, mmlCommandNamePosfix, className, module, showInOSS, showInUI, showInNavMenue, operationTypes: operationTypes || [], params: params || [], configObjList: this.config?.configObjList || [] });
      }
      this.close.emit();
    }
  }

  onCancel(): void {
    this.close.emit();
  }

  get params(): FormArray {    
    return this.confObjForm.get('params') as FormArray;
  }

  newParam(dataName: string = '', abbreviation: string = ''): FormGroup {
    return this.fb.group({
      dataName: [dataName, Validators.required],
      abbreviation: [abbreviation, Validators.required]
    });
  }

  addParam(dataName: string = '', abbreviation: string = '') {
    this.params.push(this.newParam(dataName, abbreviation));
  }

  removeParam(index: number) {
    this.params.removeAt(index);
  }

  get operationTypes(): FormArray {    
    return this.confObjForm.get('operationTypes') as FormArray;
  }

  newOperationType(operationName: string = ''): FormGroup {
    return this.fb.group({
      operationName: [operationName, Validators.required],
    });
  }

  addOperationType(operationName: string = '') {
    this.operationTypes.push(this.newOperationType(operationName));
  }

  removeOperationType(index: number) {
    this.operationTypes.removeAt(index);
  }

}
