import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AppUser } from '../../models/task';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-management.html'
})
export class UserManagementComponent {
  users: AppUser[] = [];
  gestores: AppUser[] = [];
  editUser: AppUser | null = null;

  form: FormGroup;

  constructor(private userService: UserService, private fb: FormBuilder) {
    this.form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    displayName: [''],
    role: ['Programador', Validators.required],
    gestorId: ['']
  });
    this.load();
  }

  load(){ this.users = this.userService.getAll(); this.gestores = this.users.filter(u => u.role === 'Gestor'); }

  startCreate(){ this.editUser = null; this.form.reset({ role: 'Programador', password: '123456' }); }
  startEdit(u: AppUser){ this.editUser = u; this.form.patchValue(u); }

  save(){
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const dto: Partial<AppUser> = {
      username: v.username,
      password: v.password,
      displayName: v.displayName,
      role: v.role,
      gestorId: v.gestorId || null
    };

    try {
      if (this.editUser) {
        const updated: AppUser = { ...this.editUser, ...dto } as AppUser;
        this.userService.update(updated);
      } else {
        this.userService.create(dto);
      }
      this.load();
    } catch (err:any) { alert(err.message || err); }
  }

  remove(id: string){ if (confirm('Eliminar utilizador?')) { this.userService.delete(id); this.load(); } }
}
