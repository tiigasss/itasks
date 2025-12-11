import { Injectable } from '@angular/core';
import { TaskModel, EstadoAtual } from '../models/task';
import { safeGetItem, safeSetItem } from '../utils/storage';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private KEY = 'kanban_tasks_v2';
  constructor() { if (!safeGetItem(this.KEY)) safeSetItem(this.KEY, JSON.stringify([])); }

  private load(): TaskModel[] { return JSON.parse(safeGetItem(this.KEY) ?? '[]') as TaskModel[]; }
  private save(arr: TaskModel[]) { safeSetItem(this.KEY, JSON.stringify(arr)); }

  getAll(): TaskModel[] { return this.load(); }
  getById(id: string) { return this.load().find(t => t.id === id); }

  getReadyValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.ToDo).sort((a,b) => a.ordem - b.ordem); }
  getInProgressValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.Doing).sort((a,b) => a.ordem - b.ordem); }
  getReviewValue(): TaskModel[] { return []; }
  getDoneValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.Done); }

  create(partial: Partial<TaskModel>, gestorId: string): TaskModel {
    const arr = this.load();
    // Validação Req 17: Gestor não pode inserir duas tarefas com mesma ordem para mesmo prog
    if (partial.programadorId) {
        const existe = arr.find(t => t.programadorId === partial.programadorId && t.ordem === partial.ordem && t.estado !== EstadoAtual.Done);
        if (existe) throw new Error(`O programador já tem uma tarefa ativa com a ordem ${partial.ordem}`);
    }

    const novo: TaskModel = {
      id: 'task' + Date.now(),
      descricao: partial.descricao ?? '',
      tipoId: partial.tipoId ?? '',
      gestorId,
      programadorId: partial.programadorId ?? null,
      ordem: partial.ordem ?? 1,
      estado: EstadoAtual.ToDo,
      dataCriacao: new Date().toISOString(),
      dataPrevistaInicio: partial.dataPrevistaInicio,
      dataPrevistaFim: partial.dataPrevistaFim,
      dataRealInicio: '',
      dataRealFim: partial.dataRealFim,
      storyPoints: partial.storyPoints
    };
    arr.push(novo); this.save(arr); return novo;
  }

  update(u: TaskModel) {
    const arr = this.load();
    const i = arr.findIndex(x => x.id === u.id);
    if (i === -1) throw new Error('Não encontrado');
    if (arr[i].estado === EstadoAtual.Done) throw new Error('Tarefa Done não pode ser alterada'); // Req 14
    arr[i] = { ...arr[i], ...u }; this.save(arr); return arr[i];
  }

  delete(id: string) { this.save(this.load().filter(x => x.id !== id)); }

  // --- LÓGICA DE MOVIMENTAÇÃO (REQ 15, 16, 39, 40) ---
  canMoveTo(task: TaskModel, novoEstado: EstadoAtual, allTasks: TaskModel[]): { ok: boolean, error?: string } {
    if (task.estado === EstadoAtual.Done) return { ok: false, error: 'Tarefas concluídas estão bloqueadas.' };
    
    // Regras para DOING
    if (novoEstado === EstadoAtual.Doing) {
        // Regra: Max 2 tarefas em Doing
        if (task.programadorId) {
            const doingCount = allTasks.filter(t => t.programadorId === task.programadorId && t.estado === EstadoAtual.Doing && t.id !== task.id).length;
            if (doingCount >= 2) return { ok: false, error: 'Limite de 2 tarefas em curso atingido.' };
        
            // Regra: Ordem Sequencial
            // Obter todas as tarefas ativas (ToDo ou Doing) deste programador, ordenadas
            const minhasTasks = allTasks
                .filter(t => t.programadorId === task.programadorId && t.estado !== EstadoAtual.Done)
                .sort((a, b) => a.ordem - b.ordem);
            
            // A tarefa atual deve ser a de menor ordem disponível que ainda não está em Doing/Done
            // (Simplificação: verificamos se existe alguma tarefa com ordem MENOR que ainda está em ToDo)
            const existeMenorEmToDo = minhasTasks.some(t => t.ordem < task.ordem && t.estado === EstadoAtual.ToDo && t.id !== task.id);
            
            if (existeMenorEmToDo) return { ok: false, error: `Deve concluir as tarefas por ordem. Existe uma tarefa de ordem inferior pendente.` };
        }
    }
    return { ok: true };
  }

  moveTask(taskId: string, novoEstado: EstadoAtual): { ok: boolean, error?: string } {
      const arr = this.load();
      const taskIndex = arr.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return { ok: false, error: 'Tarefa não encontrada' };
      const task = arr[taskIndex];

      // Verificar regras
      const check = this.canMoveTo(task, novoEstado, arr);
      if (!check.ok) return check;

      // Aplicar mudança
      task.estado = novoEstado;
      const now = new Date().toISOString();
      
      // Req 19: Datas Reais
      if (novoEstado === EstadoAtual.Doing && !task.dataRealInicio) task.dataRealInicio = now;
      if (novoEstado === EstadoAtual.Done) task.dataRealFim = now;

      this.save(arr);
      return { ok: true };
  }

  // --- REQ 28: ALGORITMO DE ESTIMATIVA ---
  getEstimationReport(gestorId: string): { totalHours: number, message: string } {
      const all = this.load();
      const done = all.filter(t => t.estado === EstadoAtual.Done && t.storyPoints && t.dataRealInicio && t.dataRealFim);
      
      // 1. Calcular média de dias por StoryPoint
      const historyMap = new Map<number, number[]>(); // SP -> [dias, dias, dias]
      
      done.forEach(t => {
          const start = new Date(t.dataRealInicio!).getTime();
          const end = new Date(t.dataRealFim!).getTime();
          // Converter ms para dias (assumindo dias de trabalho ou dias corridos conforme enunciado pede 'tempo')
          // Enunciado fala em "2h", "1.5h" no exemplo, mas pede "dias" nas tabelas. Vamos usar Dias com precisão decimal.
          const days = (end - start) / (1000 * 60 * 60 * 24); 
          
          const sp = t.storyPoints || 0;
          if (!historyMap.has(sp)) historyMap.set(sp, []);
          historyMap.get(sp)?.push(days);
      });

      // Média por SP
      const avgBySP = new Map<number, number>();
      historyMap.forEach((values, key) => {
          const sum = values.reduce((a, b) => a + b, 0);
          avgBySP.set(key, sum / values.length);
      });

      // 2. Calcular estimativa para ToDo
      const todo = all.filter(t => t.estado === EstadoAtual.ToDo && t.gestorId === gestorId);
      let totalTime = 0;

      todo.forEach(t => {
          const sp = t.storyPoints || 0;
          let estimatedTime = 0;

          if (avgBySP.has(sp)) {
              estimatedTime = avgBySP.get(sp)!;
          } else {
              // Encontrar SP mais próximo
              let closestSP = -1;
              let minDiff = Number.MAX_VALUE;
              
              for (const key of avgBySP.keys()) {
                  const diff = Math.abs(key - sp);
                  if (diff < minDiff) {
                      minDiff = diff;
                      closestSP = key;
                  }
              }

              if (closestSP !== -1) {
                  estimatedTime = avgBySP.get(closestSP)!;
              } else {
                  // Fallback se não houver histórico nenhum: 1 dia por defeito
                  estimatedTime = 1; 
              }
          }
          totalTime += estimatedTime;
      });

      return { 
          totalHours: totalTime, 
          message: `Estimativa total para ${todo.length} tarefas ToDo: ${totalTime.toFixed(1)} dias (baseado em histórico)` 
      };
  }

  // Setters diretos usados apenas para reordenar DENTRO da mesma coluna
  setReady(arr: TaskModel[]) { this.saveStateArray(arr, EstadoAtual.ToDo); }
  setInProgress(arr: TaskModel[]) { this.saveStateArray(arr, EstadoAtual.Doing); }
  setDone(arr: TaskModel[]) { this.saveStateArray(arr, EstadoAtual.Done); }

  private saveStateArray(newArr: TaskModel[], state: EstadoAtual) {
      const all = this.load();
      // Remove tarefas desse estado do array geral antigo
      const others = all.filter(t => t.estado !== state);
      // Garante que o estado está correto nas novas
      const updated = newArr.map(t => ({...t, estado: state}));
      this.save([...others, ...updated]);
  }
}