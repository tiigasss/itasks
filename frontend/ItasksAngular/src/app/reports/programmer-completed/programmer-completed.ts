import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';
import { TaskModel } from '../../models/task';

@Component({
  selector: 'app-programmer-completed',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="p-4">
    <h2 class="text-white mb-3">Minhas Tarefas Concluídas</h2>
    <table class="w-full text-white">
      <thead class="text-neutral-300"><tr><th>Descrição</th><th>Início</th><th>Fim</th><th>Dias</th></tr></thead>
      <tbody>
        <tr *ngFor="let r of rows">
          <td>{{ r.descricao }}</td>
          <td>{{ r.dataRealInicio | date:'short' }}</td>
          <td>{{ r.dataRealFim | date:'short' }}</td>
          <td>{{ r.days }}</td>
        </tr>
      </tbody>
    </table>
  </div>`
})
export class ProgrammerCompletedComponent {
  rows: any[] = [];
  constructor(private taskService: TaskService, private auth: AuthService) {
    const me = auth.currentUserValue;
    if (!me) return;
    const all = taskService.getAll().filter(t => t.estado === 'Done' && t.programadorId === me.id);
    this.rows = all.map(t => ({
      descricao: t.descricao,
      dataRealInicio: t.dataRealInicio,
      dataRealFim: t.dataRealFim,
      days: t.dataRealInicio && t.dataRealFim ? Math.ceil((new Date(t.dataRealFim!).getTime()-new Date(t.dataRealInicio!).getTime())/(1000*60*60*24)) : '-'
    }));
  }
}
