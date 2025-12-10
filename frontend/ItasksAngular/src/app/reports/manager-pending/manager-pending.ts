import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-manager-pending',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="p-4">
    <h2 class="text-white mb-3">Tarefas não concluídas (minhas)</h2>
    <table class="w-full text-white">
      <thead class="text-neutral-300"><tr><th>Estado</th><th>Ordem</th><th>Programador</th><th>Tempo</th></tr></thead>
      <tbody>
        <tr *ngFor="let r of rows">
          <td>{{ r.estado }}</td>
          <td>{{ r.ordem }}</td>
          <td>{{ r.programmer }}</td>
          <td>{{ r.delta }}</td>
        </tr>
      </tbody>
    </table>
  </div>`
})
export class ManagerPendingComponent {
  rows: any[] = [];
  constructor(private taskService: TaskService, private auth: AuthService, private users: UserService) {
    const me = auth.currentUserValue; if (!me) return;
    const list = taskService.getAll().filter(t => t.gestorId === me.id && t.estado !== 'Done')
      .sort((a,b)=> a.estado.localeCompare(b.estado));
    this.rows = list.map(t => {
      const prog = this.users.getById(t.programadorId ?? '')?.displayName ?? '-';
      let delta = '-';
      if (t.dataPrevistaFim) {
        const daysLeft = Math.ceil((new Date(t.dataPrevistaFim).getTime() - Date.now())/(1000*60*60*24));
        delta = daysLeft >= 0 ? `${daysLeft} dias` : `${Math.abs(daysLeft)} dias atraso`;
      }
      return { estado: t.estado, ordem: t.ordem, programmer: prog, delta };
    });
  }
}
