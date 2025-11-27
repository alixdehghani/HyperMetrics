// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, OnInit, input, inject, output } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ConfigObj, ConfigObjType } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-conf-obj-modal',
  imports: [ReactiveFormsModule],
  templateUrl: 'edit-conf-obj-modal.html'
})
export class EditConfObjModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treeService = inject(ENodeBTreeService);

  readonly config = input<ConfigObj | null>(null);
  readonly path = input<number[]>([]);
  readonly mode = input.required<'edit' | 'view' | 'create'>();
  readonly close = output<void>();


  confObjForm!: FormGroup;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  ngOnInit(): void {
    const mode = this.mode();
    const config = this.config();
    if (mode === 'edit' && !config) {
      alert('Invalid config provided to EditConfObjModalComponent');
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
      return;
    }    
    this.confObjForm = this.fb.group({
      configObjId: [config?.configObjId || '', Validators.required],
      dataName: [config?.dataName || '', Validators.required],
      title: [config?.title || '', Validators.required],
      parameterName: [config?.parameterName || '', Validators.required],
      abbreviation: [config?.abbreviation || '', Validators.required],
      mmlCommandNamePosfix: [config?.mmlCommandNamePosfix || '', Validators.required],
      className: [config?.className || '', Validators.required],
      module: [config?.module || '', Validators.required],
      showInOSS: [config?.showInOSS || false],
      showInUI: [config?.showInUI || false],
      showInNavMenue: [config?.showInNavMenue || false],
      operationTypes: this.fb.array(config?.operationTypes || []),
      params: this.fb.array(config?.params || []),
    });    
    if (mode === 'view') {
      this.confObjForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confObjForm.valid) {
      const { configObjId, dataName, title, parameterName, abbreviation, mmlCommandNamePosfix, className, module, showInOSS, showInUI, showInNavMenue, params, operationTypes } = this.confObjForm.value;
      if (this.mode() === 'create') {
        this.treeService.addConfigObj(this.path(), { configObjId, dataName, title, parameterName, abbreviation, mmlCommandNamePosfix, className, module, showInOSS, showInUI, showInNavMenue, operationTypes: operationTypes || [], params: params || [], configObjList: [] });
      } else {
        this.treeService.updateConfigObj(this.path(), { configObjId, dataName, title, parameterName, abbreviation, mmlCommandNamePosfix, className, module, showInOSS, showInUI, showInNavMenue, operationTypes: operationTypes || [], params: params || [], configObjList: this.config()?.configObjList || [] });
      }
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
    }
  }

  onCancel(): void {
    // TODO: The 'emit' function requires a mandatory void argument
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
