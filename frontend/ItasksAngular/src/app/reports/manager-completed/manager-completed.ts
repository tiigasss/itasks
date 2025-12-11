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
  <div class="p-6 max-w-5xl mx-auto">
    
    <div class="flex justify-between items-center mb-6 border-b border-gray-700 pb-2">
       <h2 class="text-2xl font-bold text-white">Tarefas Concluídas (Minha Equipa)</h2>
       <button (click)="downloadCSV()" class="bg-green-700 hover:bg-green-800 hover:cursor-pointer text-white px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors">
           📥 Exportar CSV
       </button>
    </div>
    
    <div class="bg-[#0e1621] rounded-lg shadow-lg overflow-hidden border border-gray-800">
        <table class="w-full text-left text-sm text-gray-300">
          <thead class="bg-gray-800 text-xs uppercase font-semibold text-gray-400">
            <tr>
              <th class="px-6 py-4">Programador</th>
              <th class="px-6 py-4">Descrição da Tarefa</th>
              <th class="px-6 py-4 text-center">Previsto (dias)</th>
              <th class="px-6 py-4 text-center">Real (dias)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            <tr *ngFor="let r of rows" class="hover:bg-gray-800/50 transition-colors">
              <td class="px-6 py-4 font-medium text-white">{{ r.programmer }}</td>
              <td class="px-6 py-4">{{ r.descricao }}</td>
              <td class="px-6 py-4 text-center">
                <span class="bg-gray-700 text-gray-300 px-2 py-1 rounded">{{ r.plannedDays }}</span>
              </td>
              <td class="px-6 py-4 text-center">
                <span [ngClass]="{
                    'text-emerald-400': r.realDays <= r.plannedDays, 
                    'text-rose-400': r.realDays > r.plannedDays
                }" class="font-bold">
                    {{ r.realDays }}
                </span>
              </td>
            </tr>
            <tr *ngIf="rows.length === 0">
                <td colspan="4" class="px-6 py-8 text-center text-gray-500 italic">Nenhuma tarefa concluída encontrada.</td>
            </tr>
          </tbody>
        </table>
    </div>
  </div>`
})
export class ManagerCompletedComponent {
  rows: any[] = [];

  constructor(
    private taskService: TaskService, 
    private auth: AuthService, 
    private users: UserService
  ) {
    this.loadData();
  }

  loadData() {
    const me = this.auth.currentUserValue;
    if (!me) return;
    
    // Filtra tarefas Done e criadas por este gestor
    const list = this.taskService.getAll().filter(t => t.estado === 'Done' && t.gestorId === me.id);
    
    this.rows = list.map(t => {
      const prog = this.users.getById(t.programadorId ?? '')?.displayName ?? '-';
      
      const planned = (t.dataPrevistaInicio && t.dataPrevistaFim) 
        ? Math.ceil((new Date(t.dataPrevistaFim!).getTime() - new Date(t.dataPrevistaInicio!).getTime())/(1000*60*60*24)) : 0;
      
      const real = (t.dataRealInicio && t.dataRealFim) 
        ? Math.ceil((new Date(t.dataRealFim!).getTime() - new Date(t.dataRealInicio!).getTime())/(1000*60*60*24)) : 0;
      
      return { 
          programmer: prog, 
          descricao: t.descricao, 
          plannedDays: planned || '-', 
          realDays: real || '-' 
      };
    });
  }

  downloadCSV() {
    const me = this.auth.currentUserValue;
    if(!me) return;
    
    // Cabeçalho conforme requisito do enunciado
    const headers = ['Programador', 'Descricao', 'DataPrevistaInicio', 'DataPrevista', 'TipoTarefa', 'DataRealInicio', 'DataRealFim'];
    
    // Buscar dados brutos
    const tasks = this.taskService.getAll().filter(t => t.estado === 'Done' && t.gestorId === me.id);
    
    const csvRows = tasks.map(t => {
       const progName = this.users.getById(t.programadorId ?? '')?.displayName ?? 'N/A';
       
       // Limpar quebras de linha e ponto e vírgula da descrição para não partir o CSV
       const cleanDesc = (t.descricao || '').replace(/;/g, ',').replace(/\n/g, ' '); 
       
       return [
         progName,
         cleanDesc,
         t.dataPrevistaInicio || '',
         t.dataPrevistaFim || '', // Mapeado para 'DataPrevista'
         t.tipoId,
         t.dataRealInicio || '',
         t.dataRealFim || ''
       ].join(';'); // Separador por ponto e vírgula
    });

    const csvContent = [headers.join(';'), ...csvRows].join('\n');
    
    // Criar ficheiro e forçar download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio_tarefas_concluidas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}