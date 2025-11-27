// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Parameter } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-conf-obj-param-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: 'edit-conf-obj-param-modal.html'
})
export class EditConfObjParamModalComponent implements OnInit {
  @Input() config: Parameter | null = null;
  @Input() path: number[] = [];
  @Input() mode!: 'edit' | 'view' | 'create';
  @Output() close = new EventEmitter<void>();


  confObjParamForm!: FormGroup;

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
    this.confObjParamForm = this.fb.group({
      id: [this.config?.id || '', Validators.required],
      dataName: [this.config?.dataName || '', Validators.required],
      title: [this.config?.title || '', Validators.required],
      parameterName: [this.config?.parameterName || '', Validators.required],
      abbreviation: [this.config?.abbreviation || '', Validators.required],
      name: [this.config?.name || '', Validators.required],
      unit: [this.config?.unit || '', Validators.required],
      defaultValue: [this.config?.defaultValue || '', Validators.required],
      type: [this.config?.type || '', Validators.required],
      validation: [this.config?.validation || '', Validators.required],
      uiValidation: [this.config?.uiValidation || '', Validators.required],
      filter: [this.config?.filter || '', Validators.required],
      modetype: [this.config?.modetype || '', Validators.required],
      showOn: [this.config?.showOn || '', Validators.required],
      isEditable: [this.config?.isEditable || false, Validators.required],
      showInWizard: [this.config?.showInWizard || false, Validators.required],
      showInOSS: [this.config?.showInOSS || false, Validators.required],
      showInUI: [this.config?.showInUI || false, Validators.required],
      isPrimaryKey: [this.config?.isPrimaryKey || false, Validators.required],
      required: [this.config?.required || false, Validators.required],
      isEnabled: [this.config?.isEnabled || false, Validators.required],
    });
    if (this.mode === 'view') {
      this.confObjParamForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confObjParamForm.valid) {
      const { id, dataName, title, parameterName, abbreviation, name, unit, defaultValue, type, validation, uiValidation, filter, modetype, showOn, isEditable, showInWizard, showInOSS, showInUI, isPrimaryKey, required, isEnabled } = this.confObjParamForm.value;
      if (this.mode === 'create') {
        this.treeService.addParameter(this.path, { id, dataName, title, parameterName, abbreviation, name, unit, defaultValue, type, validation, uiValidation, filter, modetype, showOn, isEditable, showInWizard, showInOSS, showInUI, isPrimaryKey, required, isEnabled });
      } else {
        this.treeService.updateParameter(this.path, { id, dataName, title, parameterName, abbreviation, name, unit, defaultValue, type, validation, uiValidation, filter, modetype, showOn, isEditable, showInWizard, showInOSS, showInUI, isPrimaryKey, required, isEnabled });
      }
      this.close.emit();
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
