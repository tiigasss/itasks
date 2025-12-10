import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppUser } from '../models/task';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = 'http://localhost:5000/api/users';
  private users: AppUser[] = [];

  constructor(private http: HttpClient) { this.refresh(); }

  refresh() {
    this.http.get<AppUser[]>(this.apiUrl).subscribe(data => this.users = data);
  }

  getAll(): AppUser[] { return this.users; }
  
  getById(id: string | undefined | null): AppUser | undefined {
    if (!id) return undefined;
    return this.users.find(u => u.id === id);
  }

  create(data: Partial<AppUser>): Observable<any> {
    return this.http.post(this.apiUrl, data).pipe(tap(() => this.refresh()));
  }
  
  // Implementar update/delete conforme necessário chamando http.put/delete
  update(u: AppUser) {}
  delete(id: string) {}
}