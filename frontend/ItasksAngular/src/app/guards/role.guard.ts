import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth-service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.currentUserValue) { router.navigate(['/login']); return false; }
  return true;
};

export const roleGuard = (allowed: ('Gestor'|'Programador')[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUserValue;
    if (!user) { router.navigate(['/login']); return false; }
    if (!allowed.includes(user.role)) { router.navigate(['/']); return false; }
    return true;
  };
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.currentUserValue) {
    router.navigate(['/board']);
    return false;
  }
  return true;
}
