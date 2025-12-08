// components/modals/edit-header-modal/edit-header-modal.component.ts
import { Component, OnInit, input, inject, output } from '@angular/core';

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

  readonly config = input<ConfigObjType | null>(null);
  readonly index = input<number | null>(null);
  readonly mode = input.required<'edit' | 'view' | 'create'>();
  readonly close = output<void>();

  confTypeForm!: FormGroup;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() { }

  ngOnInit(): void {
    const mode = this.mode();
    const config = this.config();
    if (mode === 'edit' && !config) {
      alert('Invalid config provided to EditConfTypeModalComponent');
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
      return;      
    }
    if (mode === 'edit' && this.index() === null) {
      alert('Invalid index provided to EditConfTypeModalComponent');
      // TODO: The 'emit' function requires a mandatory void argument
      this.close.emit();
      return;
    }
    this.confTypeForm = this.fb.group({
      configType: [config?.configType || '', Validators.required],
      mmlCommandNamePrefix: [config?.mmlCommandNamePrefix || '', Validators.required],
      configTypeId: [config?.configTypeId || '', Validators.required]
    });
    if (mode === 'view') {
      this.confTypeForm.disable();
    }
    if(mode === 'create') {
      this.confTypeForm.get('configTypeId')?.setValue(this.treeService.generateNewIdForConfigType())
    }
  }

  onSubmit(): void {
    if (this.confTypeForm.valid) {
      const { configType, mmlCommandNamePrefix, configTypeId } = this.confTypeForm.value;
      if (this.mode() === 'create') {
        this.treeService.addConfigType({ configType, mmlCommandNamePrefix, configTypeId, configObjList: [] });
      } else {
        this.treeService.updateConfigType(this.index()!, { configType, mmlCommandNamePrefix, configTypeId, configObjList: this.config()?.configObjList || [] } );
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
