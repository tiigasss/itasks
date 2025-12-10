import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TypeService } from '../../services/type.service';
import { TaskType } from '../../models/task';

@Component({
  selector: 'app-type-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './type-management.html'
})
export class TypeManagementComponent {
  items: TaskType[] = [];
  form: FormGroup;
  editId: string | null = null;

  constructor(private typeService: TypeService, private fb: FormBuilder) {
    this.form = this.fb.group({ name: ['', Validators.required], color: ['#4ade80'] });
    this.load();
  }

  load(){ this.items = this.typeService.getAll(); }

  startCreate(){ this.editId = null; this.form.reset({ color: '#4ade80' }); }
  startEdit(t: TaskType){ this.editId = t.id; this.form.patchValue(t); }

  save(){
    const v = this.form.getRawValue();
    if (this.editId) { this.typeService.update({ id: this.editId, name: v.name, color: v.color }); }
    else this.typeService.create({ name: v.name, color: v.color });
    this.load();
  }

  remove(id: string) { if (confirm('Eliminar?')) { this.typeService.delete(id); this.load(); } }
}
