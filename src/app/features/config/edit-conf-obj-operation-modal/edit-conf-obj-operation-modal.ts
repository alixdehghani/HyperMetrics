// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, OnInit, input, inject, output } from '@angular/core';

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

  readonly config = input<OperationType | null>(null);
  readonly path = input<number[]>([]);
  readonly mode = input.required<'edit' | 'view' | 'create'>();
  readonly close = output<void>();


  confObjOperationForm!: FormGroup;

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
    this.confObjOperationForm = this.fb.group({
      operationName: [config?.operationName || '', Validators.required],
      msgId: [config?.msgId || 0, [Validators.required, Validators.min(0)]],
      operationCode: [config?.operationCode || 0, [Validators.required, Validators.min(0)]],
      operationType: [config?.operationType || '', Validators.required],
      title: [config?.title || '', Validators.required],
      isDangerous: [config?.isDangerous || false]
    });
    if (mode === 'view') {
      this.confObjOperationForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confObjOperationForm.valid) {
      const { operationName, msgId, operationCode, operationType, title, isDangerous } = this.confObjOperationForm.value;
      if (this.mode() === 'create') {
        this.treeService.addOperationType(this.path(), { operationName, msgId, operationCode, operationType, title, isDangerous });
      } else {
        this.treeService.updateOperationType(this.path(), { operationName, msgId, operationCode, operationType, title, isDangerous });
      }
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
    }
  }

  onCancel(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.close.emit();
  }
}
