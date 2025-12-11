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
  <div class="p-6 max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Tarefas Pendentes</h2>
    
    <div class="bg-[#0e1621] rounded-lg shadow-lg overflow-hidden border border-gray-800">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-gray-800 text-xs uppercase font-semibold text-gray-400">
            <tr>
              <th class="px-6 py-4">Estado</th>
              <th class="px-6 py-4">Ordem</th>
              <th class="px-6 py-4">Programador</th>
              <th class="px-6 py-4">Descrição</th>
              <th class="px-6 py-4 text-right">Prazo</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr *ngFor="let r of rows" class="hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4">
                  <span [ngClass]="{
                    'bg-red-500/20 text-red-400 border-red-500/30': r.estado === 'ToDo',
                    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30': r.estado === 'Doing'
                  }" class="px-2 py-1 rounded text-xs font-bold border">
                    {{ r.estado }}
                  </span>
              </td>
              <td class="px-6 py-4 font-mono text-gray-500">#{{ r.ordem }}</td>
              <td class="px-6 py-4 text-white font-medium">{{ r.programmer }}</td>
              <td class="px-6 py-4 truncate max-w-[200px]">{{ r.descricao }}</td>
              <td class="px-6 py-4 text-right">
                  <span [class.text-rose-500]="r.isLate" [class.text-emerald-500]="!r.isLate">
                    {{ r.delta }}
                  </span>
              </td>
            </tr>
             <tr *ngIf="rows.length === 0">
                <td colspan="5" class="px-6 py-8 text-center text-gray-500 italic">Tudo limpo! Nenhuma tarefa pendente.</td>
            </tr>
          </tbody>
        </table>
    </div>
  </div>`
})
export class ManagerPendingComponent {
  rows: any[] = [];
  constructor(private taskService: TaskService, private auth: AuthService, private users: UserService) {
    const me = auth.currentUserValue; if (!me) return;
    const list = taskService.getAll().filter(t => t.gestorId === me.id && t.estado !== 'Done')
      .sort((a,b)=> a.estado.localeCompare(b.estado));
    
    this.rows = list.map(t => {
      const prog = this.users.getById(t.programadorId ?? '')?.displayName ?? 'Unassigned';
      let delta = '-';
      let isLate = false;
      if (t.dataPrevistaFim) {
        const daysLeft = Math.ceil((new Date(t.dataPrevistaFim).getTime() - Date.now())/(1000*60*60*24));
        if(daysLeft < 0) {
            delta = `${Math.abs(daysLeft)} dias atraso`;
            isLate = true;
        } else {
            delta = `${daysLeft} dias restantes`;
        }
      }
      return { estado: t.estado, ordem: t.ordem, programmer: prog, descricao: t.descricao, delta, isLate };
    });
  }
}