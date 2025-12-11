import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CdkDragDrop, CdkDropList, DragDropModule } from "@angular/cdk/drag-drop";
import { Card } from '../card/card';
import { TaskModel } from '../models/task';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth-service'; // Importar AuthService

@Component({
  selector: 'app-column',
  standalone: true,
  imports: [CdkDropList, DragDropModule, Card, CommonModule],
  templateUrl: './column.html',
  styleUrl: './column.css'
})
export class Column {
  @Input() title!: string;
  @Input() tasks!: TaskModel[];
  @Input() id!: string;
  @Input() connectedTo: string[] = [];
  @Input() usersMap: { [key: string]: string } = {};

  @Output() dropped = new EventEmitter<CdkDragDrop<TaskModel[]>>();

  // Injetar o Auth para saber quem está logado
  private auth = inject(AuthService);
  currentUser = this.auth.currentUserValue;

  trackById(index: number, item: TaskModel) { return item.id; }

  // Função para verificar se o Drag deve ser bloqueado
  isDisabled(task: TaskModel): boolean {
    if (!this.currentUser) return true; // Se não houver user, bloqueia tudo
    
    // Gestor pode mexer em tudo (Regra geral, ou podes restringir aos dele)
    if (this.currentUser.role === 'Gestor') return false; 

    // Programador SÓ pode mexer nas SUAS tarefas (Req 11)
    if (this.currentUser.role === 'Programador') {
        return task.programadorId !== this.currentUser.id;
    }
    
    return true;
  }
}