import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-manager-estimates-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-neutral-900 p-6 rounded-lg max-w-lg w-full border border-gray-700 shadow-2xl">
      <h3 class="text-xl font-bold text-white mb-4">Estimativa de Tempo (ToDo)</h3>
      
      <div class="bg-gray-800 p-4 rounded mb-4 text-center">
        <p class="text-gray-400 text-sm uppercase">Tempo Total Previsto</p>
        <div class="text-4xl font-bold text-emerald-400 mt-2">{{ data.totalHours.toFixed(1) }} <span class="text-lg text-gray-500">dias</span></div>
      </div>

      <p class="text-gray-400 text-sm mb-6 bg-gray-800/50 p-3 rounded italic">
        *Cálculo baseado na média histórica de dias gastos por Story Points de tarefas concluídas.
      </p>

      <div class="flex justify-end">
        <button (click)="close.emit()" class="text-white hover:text-gray-300 transition-colors">Fechar</button>
      </div>
    </div>
  `
})
export class ManagerEstimatesModal {
  @Output() close = new EventEmitter<void>();
  data: { totalHours: number, message: string };

  constructor(private taskService: TaskService, private auth: AuthService) {
    const gestorId = this.auth.currentUserValue?.id ?? '';
    this.data = this.taskService.getEstimationReport(gestorId);
  }
}