import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragDrop, CdkDropList, CdkDropListGroup, DragDropModule, moveItemInArray, transferArrayItem } from "@angular/cdk/drag-drop";
import { Card } from '../card/card';
import { TaskModel } from '../models/task';

@Component({
  selector: 'app-column',
  imports: [CdkDropList, DragDropModule, Card],
  templateUrl: './column.html',
  styles: ``,
})
export class Column {
  @Input() title!: string;
  @Input() tasks!: TaskModel[];
  @Input() id!: string;
  @Output() dropped = new EventEmitter<CdkDragDrop<TaskModel[]>>();

  trackById(index: number, item: TaskModel) { return item.id; }

  emitDrop(event: CdkDragDrop<TaskModel[]>) {
      console.log('🟢 Column emitted drop event', event);
    this.dropped.emit(event);
  }

  // dropped(event: CdkDragDrop<Task[]>) {
  //   if (event.previousContainer === event.container) {
  //     moveItemInArray(event.container.data, event.previousIndex, event.currentIndex)
  //   } else {
  //     transferArrayItem(
  //       event.previousContainer.data,
  //       event.container.data,
  //       event.previousIndex,
  //       event.currentIndex
  //     )
  //   }
  // }
}
