// src/app/services/type.service.ts
import { Injectable } from '@angular/core';
import { TaskType } from '../models/task';
import { safeGetItem, safeSetItem } from '../utils/storage';

@Injectable({ providedIn: 'root' })
export class TypeService {
  private KEY = 'kanban_types_v1';
  constructor() { if (!safeGetItem(this.KEY)) safeSetItem(this.KEY, JSON.stringify([])); }

  private load(): TaskType[] { return JSON.parse(safeGetItem(this.KEY) ?? '[]') as TaskType[]; }
  private save(arr: TaskType[]) { safeSetItem(this.KEY, JSON.stringify(arr)); }

  getAll(): TaskType[] { return this.load(); }
  getById(id: string) { return this.load().find(x => x.id === id); }

  create(partial: Partial<TaskType>) {
    const arr = this.load();
    const novo: TaskType = { id: 'type' + Date.now(), name: partial.name ?? 'Novo', color: partial.color ?? '#4ade80' };
    arr.push(novo); this.save(arr); return novo;
  }

  update(t: TaskType) {
    const arr = this.load();
    const i = arr.findIndex(x => x.id === t.id);
    if (i === -1) throw new Error('Not found');
    arr[i] = { ...arr[i], ...t }; this.save(arr); return arr[i];
  }

  delete(id: string) { this.save(this.load().filter(x => x.id !== id)); }
}
