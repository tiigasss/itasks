import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';

@Component({
  standalone: true,
  selector: 'manager-completed',
  templateUrl: './manager-completed.html',
  imports: [CommonModule]
})
export class ManagerCompleted {
  rows: any[] = [];

  constructor(
    private taskService: TaskService,
    private auth: AuthService
  ) {
    this.load();
  }

  load() {
    const user = this.auth.currentUserValue;

    this.taskService.getAll().subscribe((tasks: any[]) => {
      this.rows = tasks
        .filter(t => t.estado === 'Done' && (t.programadorId === user.id || t.gestorId === user.id))
        .map(t => ({
          descricao: t.descricao,
          programador: t.programadorId,
          dataInicio: t.dataRealInicio,
          dataFim: t.dataRealFim
        }));
    });
  }
}
