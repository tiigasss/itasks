import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common'; // <--- Importante
import { AppUser } from '../models/task';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/login';
  private STORAGE_KEY = 'kanban_user';
  private _currentUser$ = new BehaviorSubject<AppUser | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object // <--- Injetar identificador da plataforma
  ) {
    // Só acede ao sessionStorage se estivermos no navegador
    if (isPlatformBrowser(this.platformId)) {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          this._currentUser$.next(JSON.parse(saved));
        } catch (e) {
          console.error('Erro ao ler utilizador da sessão', e);
        }
      }
    }
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(this.apiUrl, { username, password }).pipe(
      tap(res => {
        // Guardar sessão apenas no navegador
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(res.user));
        }
        this._currentUser$.next(res.user);
      })
    );
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
    this._currentUser$.next(null);
  }

  get currentUserValue() { return this._currentUser$.value; }
}