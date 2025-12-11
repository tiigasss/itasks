import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AppUser } from '../models/task';
import { UserService } from '../services/user.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private STORAGE_KEY = 'kanban_current_user_v2';
  private _currentUser$ = new BehaviorSubject<AppUser | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  constructor(private users: UserService) {
    // Proteção para rodar apenas no browser
    if (typeof window !== 'undefined' && sessionStorage) {
      const raw = sessionStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        try {
          this._currentUser$.next(JSON.parse(raw) as AppUser);
        } catch {
          sessionStorage.removeItem(this.STORAGE_KEY);
        }
      }
    }
  }

  login(username: string, password: string) {
    const found = this.users.getAll().find(u => u.username === username && u.password === password);
    if (!found) return throwError(() => new Error('Credenciais inválidas'));
    
    if (typeof window !== 'undefined' && sessionStorage) {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(found));
    }
    
    this._currentUser$.next(found);
    return of({ user: found }).pipe(delay(200));
  }

  logout() {
    if (typeof window !== 'undefined' && sessionStorage) {
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
    this._currentUser$.next(null);
  }

  get currentUserValue(): AppUser | null { return this._currentUser$.value; }
}
