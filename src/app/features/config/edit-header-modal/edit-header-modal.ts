// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ENodeBConfig } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-header-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './edit-header-modal.html'
})
export class EditHeaderModalComponent implements OnInit {
  @Input() config: ENodeBConfig | null = null;
  @Output() close = new EventEmitter<void>();

  headerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private treeService: ENodeBTreeService
  ) {}

  ngOnInit(): void {
    this.headerForm = this.fb.group({
      neVersion: [this.config?.neVersion || '', Validators.required],
      neTypeId: [this.config?.neTypeId || '', Validators.required],
      neTypeName: [this.config?.neTypeName || '', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.headerForm.valid) {
      const { neVersion, neTypeId, neTypeName } = this.headerForm.value;
      this.treeService.updateHeader(neVersion, neTypeId, neTypeName);
      this.close.emit();
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
