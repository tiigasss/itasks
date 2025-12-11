import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { AppUser } from '../models/task';
import { UserService } from '../services/user.service';
import { safeGetItem, safeSetItem, isBrowser } from '../utils/storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private STORAGE_KEY = 'kanban_current_user_v2';
  private _currentUser$ = new BehaviorSubject<AppUser | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  constructor(private users: UserService) {
    const raw = safeGetItem(this.STORAGE_KEY);
    if (raw) {
      try {
        this._currentUser$.next(JSON.parse(raw) as AppUser);
      } catch {
        if (isBrowser()) sessionStorage.removeItem(this.STORAGE_KEY);
      }
    }
  }

  login(username: string, password: string) {
    const found = this.users.getAll().find(
      u => u.username === username && u.password === password
    );

    if (!found) return throwError(() => new Error('Credenciais inválidas'));

    safeSetItem(this.STORAGE_KEY, JSON.stringify(found));
    this._currentUser$.next(found);

    return of({ user: found }).pipe(delay(200));
  }

  logout() {
    if (isBrowser()) sessionStorage.removeItem(this.STORAGE_KEY);
    this._currentUser$.next(null);
  }

  get currentUserValue(): AppUser | null {
    return this._currentUser$.value;
  }
}
