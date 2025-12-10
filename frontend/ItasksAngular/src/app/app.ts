import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Board } from './board/board';
import { Navbar } from "./navbar/navbar";
import { UserMenuComponent } from './header/user-menu/user-menu';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Board, Navbar, UserMenuComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('ItasksAngular');
}
