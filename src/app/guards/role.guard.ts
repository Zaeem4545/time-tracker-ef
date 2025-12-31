import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // ✅ Use getToken() to check login, not isLoggedIn$ Observable
    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }

    const role = this.auth.getRole(); // role from localStorage / AuthService
    const allowedRoles = route.data['roles'] as Array<string>;

    if (!role) {
      this.router.navigate(['/login']);
      return false;
    }

    // ✅ Normalize roles to lowercase for case-insensitive comparison
    const normalizedRole = role.toLowerCase();
    const normalizedAllowedRoles = allowedRoles?.map(r => r.toLowerCase()) || [];

    // ✅ Check if user role is allowed (case-insensitive)
    if (allowedRoles && !normalizedAllowedRoles.includes(normalizedRole)) {
      alert('Access denied');

      // redirect normal users based on their role
      const roleLower = normalizedRole;
      if (roleLower === 'employee') {
        this.router.navigate(['/employee']);
      } else if (roleLower === 'manager') {
        this.router.navigate(['/manager']);
      } else if (roleLower === 'head manager') {
        this.router.navigate(['/head-manager']);
      } else if (roleLower === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/login']);
      }
      return false;
    }

    return true; // role is allowed
  }
}
