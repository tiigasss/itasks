// src/app/services/task.service.ts
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

  // getters used by Board
  getReadyValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.ToDo); }
  getInProgressValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.Doing); }
  getReviewValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.ToDo && false); } // placeholder
  getDoneValue(): TaskModel[] { return this.load().filter(t => t.estado === EstadoAtual.Done); }

  create(partial: Partial<TaskModel>, gestorId: string): TaskModel {
    const arr = this.load();
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

    // regra 17: ordem única por gestor/programador
    if (novo.programadorId) {
      const clash = arr.find(t => t.programadorId === novo.programadorId && t.ordem === novo.ordem);
      if (clash) throw new Error('Já existe uma tarefa com essa ordem para o programador');
    }

    arr.push(novo); this.save(arr); return novo;
  }

  update(u: TaskModel) {
    const arr = this.load();
    const i = arr.findIndex(x => x.id === u.id);
    if (i === -1) throw new Error('Não encontrado');
    if (arr[i].estado === EstadoAtual.Done && u.estado !== EstadoAtual.Done) throw new Error('Tarefa Done não pode ser alterada');
    arr[i] = { ...arr[i], ...u }; this.save(arr); return arr[i];
  }

  delete(id: string) { this.save(this.load().filter(x => x.id !== id)); }

  // move logic (called by UI or parent)
  moveTask(taskId: string, novoEstado: EstadoAtual, actorId: string, actorRole: 'Gestor'|'Programador') {
    const arr = this.load();
    const t = arr.find(x => x.id === taskId);
    if (!t) return { ok:false, error: 'Task not found' };
    if (t.estado === EstadoAtual.Done) return { ok:false, error: 'Tarefa Done não pode ser alterada' };
    if (actorRole === 'Programador' && t.programadorId !== actorId) return { ok:false, error: 'Só podes mover as tuas tarefas' };

    // ordem enforcement
    if (t.programadorId) {
      const progTasks = arr.filter(x => x.programadorId === t.programadorId && x.estado !== EstadoAtual.Done).sort((a,b)=>a.ordem-b.ordem);
      const menor = progTasks.length ? progTasks[0].ordem : null;
      if (menor !== null && t.ordem !== menor && actorRole === 'Programador') {
        return { ok:false, error: 'Deves executar as tarefas pela ordem definida' };
      }
    }

    // max 2 Doing
    if (novoEstado === EstadoAtual.Doing && t.programadorId && actorRole === 'Programador') {
      const doingCount = arr.filter(x => x.programadorId === t.programadorId && x.estado === EstadoAtual.Doing).length;
      if (doingCount >= 2) return { ok:false, error: 'Limite de 2 tarefas em Doing atingido' };
    }

    // apply
    t.estado = novoEstado;
    const now = new Date().toISOString();
    if (novoEstado === EstadoAtual.Doing && (!t.dataRealInicio || t.dataRealInicio === '')) t.dataRealInicio = now;
    if (novoEstado === EstadoAtual.Done) t.dataRealFim = now;

    this.save(arr);
    return { ok:true };
  }

  // helpers used after drag-drop: set whole arrays (arr items may have estado string -> cast)
  private castEstado(arr: TaskModel[], estado: EstadoAtual) {
    return arr.map(a => ({ ...a, estado } as TaskModel));
  }

  setReady(arr: TaskModel[]) {
    const others = this.load().filter(t => t.estado !== EstadoAtual.ToDo);
    const merged = [...this.castEstado(arr, EstadoAtual.ToDo), ...others];
    this.save(merged);
  }
  setInProgress(arr: TaskModel[]) {
    const others = this.load().filter(t => t.estado !== EstadoAtual.Doing);
    const merged = [...this.castEstado(arr, EstadoAtual.Doing), ...others];
    this.save(merged);
  }
  setReview(arr: TaskModel[]) { /* opcional */ }
  setDone(arr: TaskModel[]) {
    const others = this.load().filter(t => t.estado !== EstadoAtual.Done);
    const merged = [...this.castEstado(arr, EstadoAtual.Done), ...others];
    this.save(merged);
  }
}
