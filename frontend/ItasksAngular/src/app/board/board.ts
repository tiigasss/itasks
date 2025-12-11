import { Component } from '@angular/core';
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
  imports: [CommonModule, Column, DragDropModule, TaskForm, ManagerEstimatesModal],
  templateUrl: './board.html'
})
export class Board {
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
    this.refresh();

    // Carregar nomes dos utilizadores
    this.userService.getAll().subscribe({
      next: (users) => {
        users.forEach(u => this.usersMap[u.id] = u.displayName || u.username);
      },
      error: (err) => console.error('Erro ao carregar users', err)
    });
  }

  refresh() {
    this.taskService.getAll().subscribe({
      next: (tasks) => {
        this.ready = tasks.filter(t => t.estado === 'ToDo').sort((a, b) => a.ordem - b.ordem);
        this.inProgress = tasks.filter(t => t.estado === 'Doing').sort((a, b) => a.ordem - b.ordem);
        this.done = tasks.filter(t => t.estado === 'Done');
      },
      error: (err) => console.error('Erro ao carregar tasks', err)
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
      error: (err: any) => alert(err.error?.error || 'Erro ao criar tarefa')
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
          transferArrayItem(
            event.previousContainer.data,
            event.container.data,
            event.previousIndex,
            event.currentIndex
          );
          this.refresh();
        },
        error: (err: any) => {
          alert('Movimento bloqueado: ' + (err.error?.error || 'Erro desconhecido'));
          this.refresh();
        }
      });
    }
  }
}
