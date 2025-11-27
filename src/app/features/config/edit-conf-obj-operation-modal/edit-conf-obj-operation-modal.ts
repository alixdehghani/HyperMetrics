// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, input, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { OperationType } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-conf-obj-operation-modal',
  imports: [ReactiveFormsModule],
  templateUrl: 'edit-conf-obj-operation-modal.html'
})
export class EditConfObjOperationModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treeService = inject(ENodeBTreeService);

  @Input() config: OperationType | null = null;
  @Input() path: number[] = [];
  @Input() mode!: 'edit' | 'view' | 'create';
  @Output() close = new EventEmitter<void>();


  confObjOperationForm!: FormGroup;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  ngOnInit(): void {
    if (this.mode === 'edit' && !this.config) {
      alert('Invalid config provided to EditConfObjModalComponent');
      this.close.emit();
      return;
    }
    this.confObjOperationForm = this.fb.group({
      operationName: [this.config?.operationName || '', Validators.required],
      msgId: [this.config?.msgId || 0, [Validators.required, Validators.min(0)]],
      operationCode: [this.config?.operationCode || 0, [Validators.required, Validators.min(0)]],
      operationType: [this.config?.operationType || '', Validators.required],
      title: [this.config?.title || '', Validators.required],
      isDangerous: [this.config?.isDangerous || false]
    });
    if (this.mode === 'view') {
      this.confObjOperationForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confObjOperationForm.valid) {
      const { operationName, msgId, operationCode, operationType, title, isDangerous } = this.confObjOperationForm.value;
      if (this.mode === 'create') {
        this.treeService.addOperationType(this.path, { operationName, msgId, operationCode, operationType, title, isDangerous });
      } else {
        this.treeService.updateOperationType(this.path, { operationName, msgId, operationCode, operationType, title, isDangerous });
      }
      this.close.emit();
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
