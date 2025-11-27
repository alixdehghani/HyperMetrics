// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, input, inject } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfigObjType } from '../enodeb-config.model';
import { ENodeBTreeService } from '../enodeb-tree.service';


@Component({
  selector: 'app-edit-conf-type-modal',
  imports: [ReactiveFormsModule],
  templateUrl: 'edit-conf-type-modal.html'
})
export class EditConfTypeModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private treeService = inject(ENodeBTreeService);

  @Input() config: ConfigObjType | null = null;
  @Input() index: number | null = null;
  @Input() mode!: 'edit' | 'view' | 'create';
  @Output() close = new EventEmitter<void>();

  confTypeForm!: FormGroup;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  ngOnInit(): void {
    if (this.mode === 'edit' && !this.config) {
      alert('Invalid config provided to EditConfTypeModalComponent');
      this.close.emit();
      return;      
    }
    if (this.mode === 'edit' && this.index === null) {
      alert('Invalid index provided to EditConfTypeModalComponent');
      this.close.emit();
      return;
    }
    this.confTypeForm = this.fb.group({
      configType: [this.config?.configType || '', Validators.required],
      mmlCommandNamePrefix: [this.config?.mmlCommandNamePrefix || '', Validators.required],
      configTypeId: [this.config?.configTypeId || '', Validators.required]
    });
    if (this.mode === 'view') {
      this.confTypeForm.disable();
    }
  }

  onSubmit(): void {
    if (this.confTypeForm.valid) {
      const { configType, mmlCommandNamePrefix, configTypeId } = this.confTypeForm.value;
      if (this.mode === 'create') {
        this.treeService.addConfigType({ configType, mmlCommandNamePrefix, configTypeId, configObjList: [] });
      } else {
        this.treeService.updateConfigType(this.index!, { configType, mmlCommandNamePrefix, configTypeId, configObjList: this.config?.configObjList || [] } );
      }
      this.close.emit();
    }
  }

  onCancel(): void {
    this.close.emit();
  }
}
