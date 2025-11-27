// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, OnInit, inject, input, output } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ENodeBConfig } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-header-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-header-modal.html'
})
export class EditHeaderModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treeService = inject(ENodeBTreeService);

  readonly config = input<ENodeBConfig | null>(null);
  readonly close = output<void>();

  headerForm!: FormGroup;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnInit(): void {
    this.headerForm = this.fb.group({
      neVersion: [this.config()?.neVersion || '', Validators.required],
      neTypeId: [this.config()?.neTypeId || '', Validators.required],
      neTypeName: [this.config()?.neTypeName || '', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.headerForm.valid) {
      const { neVersion, neTypeId, neTypeName } = this.headerForm.value;
      this.treeService.updateHeader(neVersion, neTypeId, neTypeName);
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
    }
  }

  onCancel(): void {
    // TODO: The 'emit' function requires a mandatory void argument
    this.close.emit();
  }
}
