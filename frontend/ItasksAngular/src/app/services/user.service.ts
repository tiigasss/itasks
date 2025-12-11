// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { AppUser } from '../models/task';
import { safeGetItem, safeSetItem } from '../utils/storage';

@Injectable({ providedIn: 'root' })
export class UserService {
  private KEY = 'kanban_users_v1';

  constructor() {
    const raw = safeGetItem(this.KEY);
    if (!raw) {
      const seed: AppUser[] = [
        { id: 'u1', username: 'alice', password: 'password123', displayName: 'Alice', role: 'Gestor' },
        { id: 'u2', username: 'bob', password: '123456', displayName: 'Bob', role: 'Programador', gestorId: 'u1' }
      ];
      safeSetItem(this.KEY, JSON.stringify(seed));
    }
  }

  private load(): AppUser[] {
    return JSON.parse(safeGetItem(this.KEY) ?? '[]') as AppUser[];
  }
  private save(arr: AppUser[]) { safeSetItem(this.KEY, JSON.stringify(arr)); }

  getAll(): AppUser[] { return this.load(); }
  getById(id: string | undefined | null): AppUser | undefined {
    if (!id) return undefined;
    return this.load().find(u => u.id === id);
  }

  create(data: Partial<AppUser>) {
    const all = this.load();
    if (!data.username) throw new Error('Username obrigatório');
    if (all.some(x => x.username === data.username)) throw new Error('Username já existe');
    const novo: AppUser = {
      id: 'u' + Date.now(),
      username: data.username!,
      password: data.password ?? '123456',
      displayName: data.displayName ?? data.username!,
      role: data.role ?? 'Programador',
      gestorId: data.gestorId ?? null
    };
    all.push(novo); this.save(all); return novo;
  }

  update(u: AppUser) {
    const all = this.load();
    const i = all.findIndex(x => x.id === u.id);
    if (i === -1) throw new Error('Não encontrado');
    all[i] = u; this.save(all); return u;
  }

  delete(id: string) {
    const filtered = this.load().filter(x => x.id !== id);
    this.save(filtered);
  }
}
