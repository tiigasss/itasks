import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserMenuComponent } from './header/user-menu/user-menu';
import { AuthService } from './auth/auth-service';
import { AsyncPipe } from '@angular/common';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UserMenuComponent, AsyncPipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ItasksAngular');
  constructor(public auth: AuthService) {}
}
