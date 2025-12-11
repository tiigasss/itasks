import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Column } from '../column/column';
import { TaskService } from '../services/task.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskModel, EstadoAtual } from '../models/task';
import { TaskForm } from '../tasks/task-form/task-form';
import { AuthService } from '../auth/auth-service';
import { UserService } from '../services/user.service';
import { ManagerEstimatesModal } from '../reports/manager-estimates/manager-estimates'; // Vamos criar este

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
  isEstimateModalOpen = false; // Novo modal
  currentUserRole = '';

  constructor(
    private taskService: TaskService,
    private auth: AuthService,
    private userService: UserService
  ) {
    this.currentUserRole = auth.currentUserValue?.role ?? '';
    this.refresh();
    this.userService.getAll().forEach(u => this.usersMap[u.id] = u.displayName || u.username);
  }

  refresh() {
    this.ready = this.taskService.getReadyValue();
    this.inProgress = this.taskService.getInProgressValue();
    this.done = this.taskService.getDoneValue();
  }

  openNewTaskModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; }
  
  openEstimates() { this.isEstimateModalOpen = true; } // Req 28
  closeEstimates() { this.isEstimateModalOpen = false; }

  onTaskCreated(data: Partial<TaskModel>) {
    // ... (Mantém o código anterior, mas lida com o erro se houver ordem duplicada)
    try {
        const gestorId = this.auth.currentUserValue?.id ?? 'unknown';
        this.taskService.create(data, gestorId);
        this.refresh();
        this.closeModal();
    } catch (e: any) {
        alert(e.message);
    }
  }

  onDropped(event: CdkDragDrop<TaskModel[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      // Salva reordenação
      if(event.container.id === 'ready') this.taskService.setReady(event.container.data);
      if(event.container.id === 'inprogress') this.taskService.setInProgress(event.container.data);
      if(event.container.id === 'done') this.taskService.setDone(event.container.data);
    } else {
      // Movimento entre colunas - VALIDAR REGRAS PRIMEIRO
      const task = event.previousContainer.data[event.previousIndex];
      let targetState = EstadoAtual.ToDo;
      if(event.container.id === 'inprogress') targetState = EstadoAtual.Doing;
      if(event.container.id === 'done') targetState = EstadoAtual.Done;

      const result = this.taskService.moveTask(task.id, targetState);

      if (!result.ok) {
        // Se falhar, ALERTA e não move visualmente (Angular CDK reverte auto se não mudarmos os dados)
        alert('Movimento bloqueado: ' + result.error);
        return; 
      }
      
      // Se sucesso, atualiza visualmente
      transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
      this.refresh(); // Garante consistência total
    }
  }
}