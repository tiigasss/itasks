import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-manager-completed',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="p-4">
    <h2 class="text-white mb-3">Tarefas Concluídas (criadas por mim)</h2>
    <table class="w-full text-white">
      <thead class="text-neutral-300"><tr><th>Programador</th><th>Descrição</th><th>Previsto (dias)</th><th>Real (dias)</th></tr></thead>
      <tbody>
        <tr *ngFor="let r of rows">
          <td>{{ r.programmer }}</td>
          <td>{{ r.descricao }}</td>
          <td>{{ r.plannedDays }}</td>
          <td>{{ r.realDays }}</td>
        </tr>
      </tbody>
    </table>
  </div>`
})
export class ManagerCompletedComponent {
  rows: any[] = [];
  constructor(private taskService: TaskService, private auth: AuthService, private users: UserService) {
    const me = auth.currentUserValue;
    if (!me) return;
    const list = taskService.getAll().filter(t => t.estado === 'Done' && t.gestorId === me.id);
    this.rows = list.map(t => {
      const prog = this.users.getById(t.programadorId ?? '')?.displayName ?? '-';
      const planned = (t.dataPrevistaInicio && t.dataPrevistaFim) ? Math.ceil((new Date(t.dataPrevistaFim!).getTime() - new Date(t.dataPrevistaInicio!).getTime())/(1000*60*60*24)) : '-';
      const real = (t.dataRealInicio && t.dataRealFim) ? Math.ceil((new Date(t.dataRealFim!).getTime() - new Date(t.dataRealInicio!).getTime())/(1000*60*60*24)) : '-';
      return { programmer: prog, descricao: t.descricao, plannedDays: planned, realDays: real };
    });
  }
}
