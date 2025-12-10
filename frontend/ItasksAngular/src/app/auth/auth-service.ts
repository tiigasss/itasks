import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { AppUser } from '../models/task';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // URL do Backend Python que criámos anteriormente
  private apiUrl = 'http://localhost:5000/api/login';
  private STORAGE_KEY = 'kanban_current_user_v2';
  
  private _currentUser$ = new BehaviorSubject<AppUser | null>(null);
  currentUser$ = this._currentUser$.asObservable();

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Apenas tenta aceder ao sessionStorage se estivermos no browser
    if (isPlatformBrowser(this.platformId)) {
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

  login(username: string, password: string): Observable<any> {
    // Faz o pedido POST ao servidor Python
    return this.http.post<any>(this.apiUrl, { username, password }).pipe(
      tap(response => {
        if (response.user) {
          this._currentUser$.next(response.user);
          
          // Guarda a sessão apenas no browser
          if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(response.user));
          }
        }
      })
    );
  }

  logout() {
    this._currentUser$.next(null);
    // Limpa a sessão apenas no browser
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.removeItem(this.STORAGE_KEY);
    }
  }

  get currentUserValue(): AppUser | null { 
    return this._currentUser$.value; 
  }
}