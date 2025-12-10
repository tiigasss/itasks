import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms'
import { AuthService } from '../../auth/auth-service';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  form!: FormGroup;
  loading = false
  errorMessage: string | null = null


    ngOnInit() {
        this.form = this.fb.group({
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(3)]]
    });
    }


    constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {}

  get username() { return this.form.get('username') }
  get password() { return this.form.get('password')}

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.errorMessage = null;
    const { username, password } = this.form.value

    this.auth.login(username!, password!)
    .pipe(
      catchError(err => {
        this.errorMessage = err?.message ?? 'Erro no login';

        this.loading = false;
        return of(null);
      })
    )
    .subscribe(res => {
      this.loading = false;
      if (res && res.user) {
        this.router.navigate(['/board']);
      }
    })
  }
}
