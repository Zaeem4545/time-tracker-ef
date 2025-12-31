import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const role = this.auth.getRole();
    if (role === 'Admin') {
      return true;
    } else {
      this.router.navigate(['/access-denied']); // or dashboard
      return false;
    }
  }
}
