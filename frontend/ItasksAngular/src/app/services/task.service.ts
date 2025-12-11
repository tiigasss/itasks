import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TaskModel, EstadoAtual } from '../models/task';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private apiUrl = 'http://localhost:5000/api/tasks';
  private statsUrl = 'http://localhost:5000/api/stats'; // Nova URL base

  constructor(private http: HttpClient) {}

  getAll(): Observable<TaskModel[]> {
    return this.http.get<TaskModel[]>(this.apiUrl);
  }

  create(partial: Partial<TaskModel>, gestorId: string): Observable<any> {
    const payload = {
        descricao: partial.descricao,
        tipoId: partial.tipoId,
        gestorId: gestorId,
        programadorId: partial.programadorId,
        ordem: partial.ordem,
        storyPoints: partial.storyPoints,
        dataPrevistaInicio: partial.dataPrevistaInicio,
        dataPrevistaFim: partial.dataPrevistaFim
    };
    return this.http.post(this.apiUrl, payload);
  }

  moveTask(taskId: string, novoEstado: EstadoAtual, role: string): Observable<any> {
    const url = `${this.apiUrl}/${taskId}/move`;
    return this.http.put(url, { estado: novoEstado, role: role });
  }

  // --- ESTE É O MÉTODO QUE ESTÁ A FALTAR ---
  getPrediction(): Observable<{ totalDays: number }> {
    return this.http.get<{ totalDays: number }>(`${this.statsUrl}/prediction`);
  }
}