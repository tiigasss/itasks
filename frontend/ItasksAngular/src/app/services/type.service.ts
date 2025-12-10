import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TaskType } from '../models/task';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TypeService {
  private apiUrl = 'http://localhost:5000/api/types';
  private types: TaskType[] = [];

  constructor(private http: HttpClient) { this.refresh(); }

  refresh() {
    this.http.get<TaskType[]>(this.apiUrl).subscribe(data => this.types = data);
  }

  getAll(): TaskType[] { return this.types; }
  getById(id: string) { return this.types.find(x => x.id === id); }

  create(partial: Partial<TaskType>): Observable<any> {
    return this.http.post(this.apiUrl, partial).pipe(tap(() => this.refresh()));
  }
  
  update(t: TaskType) {}
  delete(id: string) {}
}