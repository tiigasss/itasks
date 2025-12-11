// src/app/card/card.ts
import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskModel } from '../models/task';
import { TypeService } from '../services/type.service';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.html'
})
export class Card {
  @Input() task!: TaskModel;
  @Input() assigneeName: string | null = null;
  
  private typeService = inject(TypeService);

  getInitials(nameOrId: string | null): string {
    if (!nameOrId) return '?';
    return nameOrId.substring(0, 2).toUpperCase();
  }

  getTypeColor(id: string): string {
    const type = this.typeService.getById(id);
    return type ? type.color : '#cbd5e1'; // Retorna a cor ou cinzento
  }
}