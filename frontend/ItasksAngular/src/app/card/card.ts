import { Component, Input } from '@angular/core';
import { TaskModel } from '../models/task';
import { CommonModule } from '@angular/common';
import { CdkDrag } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule, CdkDrag],
  templateUrl: './card.html',
  styleUrls: ['./card.css']
})
export class Card {
  @Input() task!: TaskModel;
}
