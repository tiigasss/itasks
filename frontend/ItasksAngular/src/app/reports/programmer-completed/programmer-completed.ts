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
  <div class="p-6 max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold text-white mb-6">Meu Histórico</h2>
    <div class="bg-[#0e1621] rounded-lg border border-gray-800">
      <table class="w-full text-left text-sm text-gray-300">
        <thead class="bg-gray-800 text-xs font-bold text-gray-400">
          <tr><th class="px-6 py-4">Tarefa</th><th class="px-6 py-4">Duração</th></tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows" class="border-t border-gray-800">
            <td class="px-6 py-4">{{ r.descricao }}</td>
            <td class="px-6 py-4">{{ r.duracao }} dias</td>
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

    // CORREÇÃO: Subscrever
    this.taskService.getAll().subscribe((tasks: TaskModel[]) => {
      const myTasks = tasks.filter(t => t.estado === 'Done' && t.programadorId === me.id);
      this.rows = myTasks.map(t => ({
        descricao: t.descricao,
        duracao: this.calcDuration(t)
      }));
    });
  }

  calcDuration(t: TaskModel): string {
    if (t.dataRealInicio && t.dataRealFim) {
      const start = new Date(t.dataRealInicio).getTime();
      const end = new Date(t.dataRealFim).getTime();
      return ((end - start) / (1000 * 3600 * 24)).toFixed(1);
    }
    return '0';
  }
}