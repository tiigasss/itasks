import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService } from '../../services/task.service';

@Component({
  selector: 'app-manager-estimates-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50 p-4">
      <div class="bg-[#1c2532] p-6 rounded-lg max-w-lg w-full border border-gray-700 shadow-2xl relative">
        
        <h3 class="text-xl font-bold text-white mb-4">Estimativa de Tempo (ToDo)</h3>
        
        <div *ngIf="loading" class="text-center py-8 text-blue-400 animate-pulse">
           A calcular previsões com base no histórico...
        </div>

        <div *ngIf="!loading && data" class="bg-gray-800 p-4 rounded mb-4 text-center border border-gray-700">
          <p class="text-gray-400 text-sm uppercase tracking-wider">Tempo Total Previsto</p>
          <div class="text-5xl font-bold text-emerald-400 mt-2">
             {{ data.totalDays }} <span class="text-xl text-gray-500 font-normal">dias</span>
          </div>
        </div>

        <p class="text-gray-400 text-xs mb-6 text-center italic">
          *Cálculo baseado na média histórica de dias gastos por Story Points de tarefas já concluídas.
        </p>

        <div class="flex justify-end pt-4 border-t border-gray-700">
          <button (click)="close.emit()" class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
            Fechar
          </button>
        </div>

      </div>
    </div>
  `
})
export class ManagerEstimatesModal implements OnInit {
  @Output() close = new EventEmitter<void>();
  
  data: { totalDays: number } | null = null;
  loading = true;

  constructor(private taskService: TaskService) {}

  ngOnInit() {
    this.taskService.getPrediction().subscribe({
      next: (res: { totalDays: number }) => { // Correção: Tipo explícito
        this.data = res;
        this.loading = false;
      },
      error: (err: any) => { // Correção: Tipo explícito
        console.error(err);
        this.data = { totalDays: 0 };
        this.loading = false;
      }
    });
  }
}