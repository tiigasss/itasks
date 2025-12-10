import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/auth-service';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './user-menu.html'
})
export class UserMenuComponent {
  user: any = null;
  constructor(private auth: AuthService, private router: Router) {
    this.user = this.auth.currentUserValue;
  }
  logout(){ this.auth.logout(); this.router.navigate(['/login']); }
}
