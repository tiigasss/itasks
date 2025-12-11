  import { Component } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { TaskService } from '../../services/task.service';
  import { AuthService } from '../../auth/auth-service';
  import { UserService } from '../../services/user.service';
  import { TaskModel } from '../../models/task';

  @Component({
    selector: 'app-manager-pending',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="p-6">
      <h2 class="text-2xl font-bold text-white mb-4">Tarefas Pendentes</h2>
      <div class="bg-gray-800 rounded p-4 text-white">
        <ul>
          <li *ngFor="let r of rows" class="mb-2">
              <span class="font-bold">{{ r.estado }}:</span> {{ r.descricao }}
          </li>
        </ul>
      </div>
    </div>`
  })
  export class ManagerPendingComponent {
    rows: any[] = [];
    
    constructor(private taskService: TaskService, private auth: AuthService, private users: UserService) {
      const me = this.auth.currentUserValue; 
      if (!me) return;

      this.taskService.getAll().subscribe({
          next: (tasks: TaskModel[]) => {
              const list = tasks.filter(t => t.gestorId === me.id && t.estado !== 'Done');
              this.rows = list.map(t => ({ descricao: t.descricao, estado: t.estado }));
          },
          error: (e) => console.error(e)
      });
    }
  }