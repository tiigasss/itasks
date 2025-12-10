// src/app/board/board.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Column } from '../column/column';
import { TaskService } from '../services/task.service';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskModel, EstadoAtual } from '../models/task';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, Column, DragDropModule],
  templateUrl: './board.html'
})
export class Board {
  ready!: TaskModel[];
  inProgress!: TaskModel[];
  review!: TaskModel[];
  done!: TaskModel[];

  constructor(private taskService: TaskService) {
    this.refresh();
  }

  refresh() {
    this.ready = this.taskService.getReadyValue();
    this.inProgress = this.taskService.getInProgressValue();
    this.review = this.taskService.getReviewValue();
    this.done = this.taskService.getDoneValue();
  }

  private syncServiceArray(id: string, arr: TaskModel[]) {
    this.setServiceArrayById(id, arr);
  }


  onDropped(event: CdkDragDrop<TaskModel[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.syncServiceArray(event.container.id, event.container.data);
      this.refresh();
      return;
    }

    // transfer
    const prevArr = this.getServiceArrayById(event.previousContainer.id);
    const currArr = this.getServiceArrayById(event.container.id);

    transferArrayItem(prevArr, currArr, event.previousIndex, event.currentIndex);

    this.setServiceArrayById(event.previousContainer.id, prevArr);
    this.setServiceArrayById(event.container.id, currArr);

    this.refresh();
  }

  private getServiceArrayById(id: string): TaskModel[] {
    switch(id) {
      case 'ready': return this.ready;
      case 'inprogress': return this.inProgress;
      case 'review': return this.review;
      case 'done': return this.done;
      default: return [];
    }
  }

  private setServiceArrayById(id: string, arr: TaskModel[]) {
    switch(id) {
      case 'ready': this.taskService.setReady(arr); break;
      case 'inprogress': this.taskService.setInProgress(arr); break;
      case 'review': this.taskService.setReview(arr); break;
      case 'done': this.taskService.setDone(arr); break;
    }
  }

}
