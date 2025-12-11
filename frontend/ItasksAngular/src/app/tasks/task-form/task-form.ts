import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { TaskModel, AppUser } from '../../models/task';
import { TypeService } from '../../services/type.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-task-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './task-form.html'
})
export class TaskForm implements OnInit {

  @Input() task: TaskModel | null = null;
  @Input() readonly = false;

  @Output() save = new EventEmitter<Partial<TaskModel>>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;

  types: any[] = [];
  programmers: AppUser[] = [];
  currentUser!: AppUser | null;

  constructor(
    private fb: FormBuilder,
    private typeService: TypeService,
    private userService: UserService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    // 1. Inicializar o form IMEDIATAMENTE para evitar erros no template
    this.form = this.fb.group({
      descricao: ['', Validators.required],
      tipoId: ['', Validators.required],
      programadorId: [null],
      ordem: [1, Validators.required],
      dataPrevistaInicio: [''],
      dataPrevistaFim: [''],
      storyPoints: [0]
    });

    // 2. Carregar dados auxiliares
    this.currentUser = this.auth.currentUserValue;
    this.types = this.typeService.getAll();

    // Filtro de programadores (Req 31)
    const allProgrammers = this.userService.getAll().filter(u => u.role === 'Programador');
    if (this.currentUser?.role === 'Gestor') {
        this.programmers = allProgrammers.filter(p => p.gestorId === this.currentUser?.id);
    } else {
        this.programmers = allProgrammers;
    }

    // 3. Preencher form se for edição
    if (this.task) {
      this.form.patchValue({
        descricao: this.task.descricao,
        tipoId: this.task.tipoId,
        programadorId: this.task.programadorId,
        ordem: this.task.ordem,
        dataPrevistaInicio: this.task.dataPrevistaInicio ?? '',
        dataPrevistaFim: this.task.dataPrevistaFim ?? '',
        storyPoints: this.task.storyPoints ?? 0
      });

      if (this.readonly) this.form.disable();
    }
  }

  onSave() {
    // Proteção extra: se o form não existir, não faz nada
    if (!this.form) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result = this.form.getRawValue();

    // Preenche o gestor automaticamente se for uma nova tarefa
    if (!this.task) {
      result['gestorId'] = this.currentUser?.id ?? null;
    }

    this.save.emit(result);
  }

  onCancel() {
    this.cancelled.emit();
  }
}