import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';
import { UserService } from '../../services/user.service';
import { TaskModel } from '../../models/task';

@Component({
  selector: 'app-manager-completed',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="p-6 max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold text-white mb-6">Tarefas Concluídas</h2>
    <div class="bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-gray-900 text-xs uppercase font-semibold text-gray-400">
            <tr>
              <th class="px-6 py-4">Programador</th>
              <th class="px-6 py-4">Descrição</th>
              <th class="px-6 py-4 text-center">Dias Real</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-700">
            <tr *ngFor="let r of rows">
              <td class="px-6 py-4 font-medium text-white">{{ r.programmer }}</td>
              <td class="px-6 py-4">{{ r.descricao }}</td>
              <td class="px-6 py-4 text-center">{{ r.realDays }}</td>
            </tr>
          </tbody>
        </table>
    </div>
  </div>`
})
export class ManagerCompletedComponent {
  rows: any[] = [];

  constructor(private taskService: TaskService, private auth: AuthService, private users: UserService) {
    this.loadData();
  }

  loadData() {
    const me = this.auth.currentUserValue;
    if (!me) return;
    
    this.taskService.getAll().subscribe({
      next: (tasks: TaskModel[]) => {
        // Lógica simplificada
        const list = tasks.filter(t => t.estado === 'Done' && t.gestorId === me.id);
        
        this.rows = list.map(t => {
          const prog = this.users.getById(t.programadorId || '')?.displayName || '-';
          return { programmer: prog, descricao: t.descricao, realDays: '-' };
        });
      },
      error: (e) => console.error(e)
    });
  }
  
  downloadCSV() {}
}