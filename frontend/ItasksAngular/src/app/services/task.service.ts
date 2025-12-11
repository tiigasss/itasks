import { Injectable } from '@angular/core';
import { TaskModel, EstadoAtual } from '../models/task';
import { safeGetItem, safeSetItem } from '../utils/storage';
import { AuthService } from '../auth/auth-service';
import { AppUser } from '../models/task';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private KEY = 'kanban_tasks_v2';

  constructor(private auth: AuthService) {
    // Inicialização segura
    if (!safeGetItem(this.KEY)) safeSetItem(this.KEY, JSON.stringify([]));
  }

  private load(): TaskModel[] { return JSON.parse(safeGetItem(this.KEY) ?? '[]') as TaskModel[]; }
  private save(arr: TaskModel[]) { safeSetItem(this.KEY, JSON.stringify(arr)); }

  private getCurrentUser(): AppUser | null {
    return this.auth.currentUserValue;
  }

  getAll(): TaskModel[] { return this.load(); }
  getById(id: string) { return this.load().find(t => t.id === id); }

  getReadyValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.ToDo).sort((a,b) => a.ordem - b.ordem); }
  getInProgressValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.Doing).sort((a,b) => a.ordem - b.ordem); }
  getReviewValue(): TaskModel[] { return []; }
  getDoneValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.Done); }

  /**
   * Cria tarefa. Apenas Gestor pode criar tarefas.
   * Se ordem não for fornecida, atribui a ordem seguinte para esse programador (ou 1).
   */
  create(partial: Partial<TaskModel>, gestorId: string): TaskModel {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Operação requer autenticação');
    if (current.role !== 'Gestor') throw new Error('Apenas Gestores podem criar tarefas');

    const arr = this.load();

    // Se programador definido e ordem não foi passada, definir ordem = max+1
    let ordemToUse = partial.ordem;
    if (partial.programadorId) {
      if (ordemToUse === undefined || ordemToUse === null) {
        const progTasks = arr.filter(t => t.programadorId === partial.programadorId && t.estado !== EstadoAtual.Done);
        const maxOrdem = progTasks.reduce((m, t) => Math.max(m, t.ordem), 0);
        ordemToUse = maxOrdem + 1;
      } else {
        // Validação Req 17: Gestor não pode inserir duas tarefas com mesma ordem para mesmo prog
        const existe = arr.find(t => t.programadorId === partial.programadorId && t.ordem === ordemToUse && t.estado !== EstadoAtual.Done);
        if (existe) throw new Error(`O programador já tem uma tarefa ativa com a ordem ${ordemToUse}`);
      }
    } else {
      // Se sem programador, garantir ordem mínima
      if (ordemToUse === undefined || ordemToUse === null) ordemToUse = 1;
    }

    const novo: TaskModel = {
      id: 'task' + Date.now(),
      descricao: partial.descricao ?? '',
      tipoId: partial.tipoId ?? '',
      gestorId,
      programadorId: partial.programadorId ?? null,
      ordem: ordemToUse ?? 1,
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

  /**
   * Atualiza tarefa. Programadores só podem atualizar as suas próprias tarefas
   * e não podem alterar campos sensíveis (ex.: programadorId / gestorId).
   * Gestor pode atualizar tudo (exceto tarefas Done).
   */
  update(u: TaskModel) {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Operação requer autenticação');

    const arr = this.load();
    const i = arr.findIndex(x => x.id === u.id);
    if (i === -1) throw new Error('Não encontrado');
    if (arr[i].estado === EstadoAtual.Done) throw new Error('Tarefa Done não pode ser alterada'); // Req 14

    // Se for Programador, limitar alterações
    if (current.role === 'Programador') {
      if (arr[i].programadorId !== current.id) throw new Error('Não pode alterar tarefas de outros programadores');
      // Proibir alteração de programadorId/gestorId por programador
      const original = arr[i];
      if (original.programadorId !== u.programadorId || original.gestorId !== u.gestorId) {
        throw new Error('Não autorizado a alterar atribuições (programador/gestor)');
      }
      // Permitir alterações parciais em campos livres (descricao, storyPoints, datas, ordem?) 
      // Para ordem, permitir apenas reorder via setReady/setInProgress (ver saveStateArray)
    }

    arr[i] = { ...arr[i], ...u }; this.save(arr); return arr[i];
  }

  delete(id: string) {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Operação requer autenticação');
    if (current.role !== 'Gestor') throw new Error('Apenas Gestores podem eliminar tarefas');

    this.save(this.load().filter(x => x.id !== id));
  }

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
            const minhasTasks = allTasks
                .filter(t => t.programadorId === task.programadorId && t.estado !== EstadoAtual.Done)
                .sort((a, b) => a.ordem - b.ordem);
            
            const existeMenorEmToDo = minhasTasks.some(t => t.ordem < task.ordem && t.estado === EstadoAtual.ToDo && t.id !== task.id);
            
            if (existeMenorEmToDo) return { ok: false, error: `Deve concluir as tarefas por ordem. Existe uma tarefa de ordem inferior pendente.` };
        }
    }
    return { ok: true };
  }

  /**
   * moveTask valida permissões e regras de negócio antes de aplicar mudança de estado.
   * Gestor pode mover qualquer tarefa. Programador só as suas.
   */
  moveTask(taskId: string, novoEstado: EstadoAtual): { ok: boolean, error?: string } {
      const current = this.getCurrentUser();
      if (!current) return { ok: false, error: 'Operação requer autenticação' };

      const arr = this.load();
      const taskIndex = arr.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return { ok: false, error: 'Tarefa não encontrada' };
      const task = arr[taskIndex];

      // Permissões: se Programador só pode mover as suas tarefas
      if (current.role === 'Programador' && task.programadorId !== current.id) {
        return { ok: false, error: 'Não autorizado a mover tarefas de outros programadores' };
      }

      // Verificar regras de negócio
      const check = this.canMoveTo(task, novoEstado, arr);
      if (!check.ok) return check;

      // Aplicar mudança
      task.estado = novoEstado;
      const now = new Date().toISOString();
      
      // Req 19: Datas Reais
      if (novoEstado === EstadoAtual.Doing && !task.dataRealInicio) task.dataRealInicio = now;
      if (novoEstado === EstadoAtual.Done) task.dataRealFim = now;

      // Se moveu para ToDo/Doing/Done, e o task.programadorId existe, podemos recalcular ordens daquele programador
      // Para manter consistência, vamos garantir que cada lista (ToDo/Doing/Done) do programador tem ordens sequenciais.
      if (task.programadorId) {
        this.normalizeOrdersForProgrammer(arr, task.programadorId);
      }

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

      // 2. Calcular estimativa para ToDo (apenas do gestor)
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

      const message = todo.length === 0 ? 'Sem tarefas ToDo para este gestor.' : `Estimativa total para ${todo.length} tarefas ToDo: ${totalTime.toFixed(1)} dias (baseado em histórico)`;

      return { 
          totalHours: totalTime, 
          message
      };
  }

  // Setters diretos usados apenas para reordenar DENTRO da mesma coluna
  setReady(arr: TaskModel[]) { this.saveStateArray(arr, EstadoAtual.ToDo); }
  setInProgress(arr: TaskModel[]) { this.saveStateArray(arr, EstadoAtual.Doing); }
  setDone(arr: TaskModel[]) { this.saveStateArray(arr, EstadoAtual.Done); }

  /**
   * Persiste o array recebido para um estado, garantindo:
   * - atualiza campo `estado` em cada task
   * - atualiza o campo `ordem` com base na posição no array (1..N)
   * - mantém as tarefas dos outros estados intactas
   */
  private saveStateArray(newArr: TaskModel[], state: EstadoAtual) {
      const all = this.load();
      // Remove tarefas desse estado do array geral antigo
      const others = all.filter(t => t.estado !== state);

      // Garante que o estado e a ordem estão corretos nas novas
      const updated = newArr.map((t, idx) => ({ ...t, estado: state, ordem: idx + 1 }));

      // Rejuntar e salvar
      this.save([...others, ...updated]);

      // Opcional: normalizar ordens por programador para evitar colisões cross-state
      // (chamamos normalize por cada programador encontrado nas updated)
      const programadores = Array.from(new Set(updated.map(t => t.programadorId).filter(Boolean))) as string[];
      programadores.forEach(pid => this.normalizeOrdersForProgrammer(this.load(), pid));
  }

  /**
   * Normaliza as ordens (ordem: 1..N) das tarefas ativas (ToDo/Doing) por programador.
   * Recebe o array completo e reescreve as ordens sequenciais para esse programador.
   */
  private normalizeOrdersForProgrammer(allArr: TaskModel[], programadorId: string) {
      const arr = allArr;
      // Selecionar tarefas NÃO Done para esse programador, ordenadas por estado + ordem
      const filtradas = arr
        .filter(t => t.programadorId === programadorId && t.estado !== EstadoAtual.Done)
        .sort((a,b) => a.ordem - b.ordem);

      // Reatribuir ordens sequenciais
      filtradas.forEach((t, idx) => {
        t.ordem = idx + 1;
      });

      this.save(arr);
  }
}
