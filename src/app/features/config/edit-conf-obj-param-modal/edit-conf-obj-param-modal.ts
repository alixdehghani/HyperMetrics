// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, OnInit, inject, input, output } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Parameter } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-conf-obj-param-modal',
  imports: [ReactiveFormsModule],
  templateUrl: 'edit-conf-obj-param-modal.html'
})
export class EditConfObjParamModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treeService = inject(ENodeBTreeService);

  readonly config = input<Parameter | null>(null);
  readonly path = input<number[]>([]);
  readonly mode = input.required<'edit' | 'view' | 'create'>();
  readonly close = output<void>();


  confObjParamForm!: FormGroup;

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
    this.confObjParamForm = this.fb.group({
      id: [config?.id || '', Validators.required],
      dataName: [config?.dataName || '', Validators.required],
      title: [config?.title || '', Validators.required],
      parameterName: [config?.parameterName || '', Validators.required],
      abbreviation: [config?.abbreviation || '', Validators.required],
      name: [config?.name || '', Validators.required],
      unit: [config?.unit || ''],
      defaultValue: [config?.defaultValue || ''],
      type: [config?.type || '', Validators.required],
      validation: [config?.validation || ''],
      uiValidation: [config?.uiValidation || ''],
      filter: this.fb.array(config?.filter || []),
      modeType: [config?.modeType || '', Validators.required],
      showOn: [config?.showOn || ''],
      isEditable: [config?.isEditable || false, Validators.required],
      showInWizard: [config?.showInWizard || false, Validators.required],
      showInOSS: [config?.showInOSS || false, Validators.required],
      showInUI: [config?.showInUI || false, Validators.required],
      isPrimaryKey: [config?.isPrimaryKey || false, Validators.required],
      required: [config?.required || false, Validators.required],
      isEnabled: [config?.isEnabled || false, Validators.required],
    });
    if (mode === 'view') {
      this.confObjParamForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confObjParamForm.valid) {
      const { id, dataName, title, parameterName, abbreviation, name, unit, defaultValue, type, validation, uiValidation, filter, modeType, showOn, isEditable, showInWizard, showInOSS, showInUI, isPrimaryKey, required, isEnabled } = this.confObjParamForm.value;
      if (this.mode() === 'create') {
        this.treeService.addParameter(this.path(), { id, dataName, title, parameterName, abbreviation, name, unit, defaultValue, type, validation, uiValidation, filter, modeType, showOn, isEditable, showInWizard, showInOSS, showInUI, isPrimaryKey, required, isEnabled });
      } else {
        this.treeService.updateParameter(this.path(), { id, dataName, title, parameterName, abbreviation, name, unit, defaultValue, type, validation, uiValidation, filter, modeType, showOn, isEditable, showInWizard, showInOSS, showInUI, isPrimaryKey, required, isEnabled });
      }
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
    }
  }

  onCancel(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.close.emit();
  }

  get filter(): FormArray {
    return this.confObjParamForm.get('filter') as FormArray;
  }

  newParam(text: string = '', value: string = ''): FormGroup {
    return this.fb.group({
      text: [text, Validators.required],
      value: [value, Validators.required]
    });
  }

  addFilter(text: string = '', value: string = '') {
    this.filter.push(this.newParam(text, value));
  }

  removeParam(index: number) {
    this.filter.removeAt(index);
  }
}
