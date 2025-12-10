import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TaskModel, EstadoAtual } from '../models/task';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiUrl = 'http://localhost:5000/api/tasks'; // URL do Flask
  
  // Cache local simples para os getters síncronos do Board (opcional, mas o Board atual espera síncrono)
  // O ideal seria refatorizar o Board para usar Observables (AsyncPipe), mas para manter compatibilidade:
  private tasksCache: TaskModel[] = [];

  constructor(private http: HttpClient) {
    this.refresh();
  }

  refresh() {
    this.http.get<TaskModel[]>(this.apiUrl).subscribe(data => this.tasksCache = data);
  }

  // Métodos de leitura continuam a ler da cache para não partir o template do Board
  getAll(): TaskModel[] { return this.tasksCache; }
  getById(id: string) { return this.tasksCache.find(t => t.id === id); }

  getReadyValue(): TaskModel[] { return this.tasksCache.filter(t => t.estado === EstadoAtual.ToDo); }
  getInProgressValue(): TaskModel[] { return this.tasksCache.filter(t => t.estado === EstadoAtual.Doing); }
  getReviewValue(): TaskModel[] { return []; } 
  getDoneValue(): TaskModel[] { return this.tasksCache.filter(t => t.estado === EstadoAtual.Done); }

  // Métodos de escrita chamam a API e atualizam a cache
  create(partial: Partial<TaskModel>, gestorId: string): Observable<any> {
    const payload = { ...partial, gestorId };
    return this.http.post(this.apiUrl, payload).pipe(tap(() => this.refresh()));
  }

  update(u: TaskModel): Observable<any> {
    // Implementar endpoint PUT /api/tasks/:id no backend se necessário editar detalhes
    return new Observable(); // Placeholder
  }

  delete(id: string): Observable<any> {
    // Implementar endpoint DELETE no backend
    return new Observable(); // Placeholder
  }

  moveTask(taskId: string, novoEstado: EstadoAtual, actorId: string, actorRole: 'Gestor'|'Programador'): Observable<any> {
    return this.http.put(`${this.apiUrl}/${taskId}/move`, { 
      estado: novoEstado,
      role: actorRole,
      userId: actorId 
    }).pipe(tap(() => this.refresh()));
  }

  // Métodos auxiliares de drag-drop (Mantidos para compatibilidade, mas idealmente devem chamar moveTask individualmente)
  setReady(arr: TaskModel[]) { this.refresh(); }
  setInProgress(arr: TaskModel[]) { this.refresh(); }
  setReview(arr: TaskModel[]) { }
  setDone(arr: TaskModel[]) { this.refresh(); }
}