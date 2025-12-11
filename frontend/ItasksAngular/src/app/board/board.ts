import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Column } from '../column/column';
import { TaskService } from '../services/task.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskModel, EstadoAtual } from '../models/task';
import { TaskForm } from '../tasks/task-form/task-form';
import { AuthService } from '../auth/auth-service';
import { UserService } from '../services/user.service';
import { ManagerEstimatesModal } from '../reports/manager-estimates/manager-estimates';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [
    CommonModule,
    Column,
    DragDropModule,
    TaskForm,
    ManagerEstimatesModal
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './board.html'
})
export class Board implements OnInit {
  ready: TaskModel[] = [];
  inProgress: TaskModel[] = [];
  done: TaskModel[] = [];

  connectedLists = ['ready', 'inprogress', 'done'];
  usersMap: { [key: string]: string } = {};

  isModalOpen = false;
  isEstimateModalOpen = false;
  currentUserRole = '';

  constructor(
    private taskService: TaskService,
    private auth: AuthService,
    private userService: UserService
  ) {
    this.currentUserRole = auth.currentUserValue?.role ?? '';
  }

  ngOnInit() {
    const users = this.userService.getAll();
    if (users && Array.isArray(users)) {
      users.forEach(u => this.usersMap[u.id] = u.displayName || u.username);
    }
    this.refresh();
  }

  refresh() {
    this.taskService.getAll().subscribe({
      next: (tasks) => {
        if (!tasks) return;
        const sorted = tasks.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
        this.ready = sorted.filter(t => t.estado === 'ToDo');
        this.inProgress = sorted.filter(t => t.estado === 'Doing');
        this.done = sorted.filter(t => t.estado === 'Done');
      },
      error: (e) => console.error(e)
    });
  }

  openNewTaskModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; }

  openEstimates() { this.isEstimateModalOpen = true; }
  closeEstimates() { this.isEstimateModalOpen = false; }

  onTaskCreated(data: Partial<TaskModel>) {
    const gestorId = this.auth.currentUserValue?.id ?? 'unknown';
    this.taskService.create(data, gestorId).subscribe({
      next: () => {
        this.refresh();
        this.closeModal();
      },
      error: (err) => alert('Erro: ' + (err.error?.error || err.message))
    });
  }

  onDropped(event: CdkDragDrop<TaskModel[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const task = event.previousContainer.data[event.previousIndex];
      let targetState = EstadoAtual.ToDo;
      if (event.container.id === 'inprogress') targetState = EstadoAtual.Doing;
      if (event.container.id === 'done') targetState = EstadoAtual.Done;

      this.taskService.moveTask(task.id, targetState, this.currentUserRole).subscribe({
        next: () => {
          transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
          this.refresh();
        },
        error: (err) => {
          alert('Erro: ' + (err.error?.error || 'Movimento não permitido'));
          this.refresh();
        }
      });
    }
  }
}
