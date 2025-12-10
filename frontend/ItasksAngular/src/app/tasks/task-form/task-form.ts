import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TypeService } from '../../services/type.service';
import { TaskModel, AppUser } from '../../models/task';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.html'
})
export class TaskFormComponent {
  @Input() task: TaskModel | null = null;
  @Input() readonly = false;
  @Output() saved = new EventEmitter<Partial<TaskModel>>();
  @Output() cancelled = new EventEmitter<void>();

  form: FormGroup;

  types: any = null;
  users: AppUser[] = [];

  constructor(private fb: FormBuilder, private typeService: TypeService, private userService: UserService) {
    this.form = this.fb.group({
    descricao: ['', Validators.required],
    tipoId: ['', Validators.required],
    programadorId: [null as string | null],
    ordem: [1, [Validators.required, Validators.min(1)]],
    dataPrevistaInicio: [''],
    dataPrevistaFim: [''],
    storyPoints: [0]
  });
  }

  ngOnInit() {
    this.types = this.typeService.getAll();
    this.users = this.userService.getAll().filter(u => u.role === 'Programador') as AppUser[];
    if (this.task) {
      this.form.patchValue({
        descricao: this.task.descricao ?? '',
        tipoId: this.task.tipoId,
        programadorId: this.task.programadorId ?? null,
        ordem: this.task.ordem,
        dataPrevistaInicio: this.task.dataPrevistaInicio ?? '',
        dataPrevistaFim: this.task.dataPrevistaFim ?? '',
        storyPoints: this.task.storyPoints ?? 0
      });
      if (this.readonly) this.form.disable();
    }
  }

  onSave() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saved.emit(this.form.getRawValue());
  }

  onCancel(){ this.cancelled.emit(); }
}
