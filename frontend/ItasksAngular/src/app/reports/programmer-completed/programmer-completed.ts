import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-programmer-completed',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="p-6 max-w-5xl mx-auto">
    <h2 class="text-2xl font-bold text-white mb-6 border-b border-gray-700 pb-2">Meu Histórico</h2>
    
    <div class="bg-[#0e1621] rounded-lg shadow-lg overflow-hidden border border-gray-800">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-gray-800 text-xs uppercase font-semibold text-gray-400">
            <tr>
              <th class="px-6 py-4">Descrição</th>
              <th class="px-6 py-4">Início Real</th>
              <th class="px-6 py-4">Fim Real</th>
              <th class="px-6 py-4 text-center">Duração</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr *ngFor="let r of rows" class="hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4 font-medium text-white">{{ r.descricao }}</td>
              <td class="px-6 py-4">{{ r.dataRealInicio | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="px-6 py-4">{{ r.dataRealFim | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="px-6 py-4 text-center">
                <span class="bg-emerald-900/30 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded text-xs font-bold">
                    {{ r.days }} dias
                </span>
              </td>
            </tr>
             <tr *ngIf="rows.length === 0">
                <td colspan="4" class="px-6 py-8 text-center text-gray-500 italic">Ainda não concluíste nenhuma tarefa.</td>
            </tr>
          </tbody>
        </table>
    </div>
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
      days: t.dataRealInicio && t.dataRealFim 
        ? Math.ceil((new Date(t.dataRealFim!).getTime()-new Date(t.dataRealInicio!).getTime())/(1000*60*60*24)) 
        : 0
    }));
  }
}