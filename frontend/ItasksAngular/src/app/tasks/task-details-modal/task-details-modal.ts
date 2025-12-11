import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskForm } from '../task-form/task-form';
import { TaskModel } from '../../models/task';

@Component({
  selector: 'app-task-details-modal',
  standalone: true,
  imports: [CommonModule, TaskForm],
  templateUrl: './task-details-modal.html'
})
export class TaskDetailsModal {
  @Input() task!: TaskModel;
  @Output() closed = new EventEmitter<void>();

  onClose() {
    this.closed.emit();
  }
}
