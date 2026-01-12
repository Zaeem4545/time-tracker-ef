import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor(public auth: AuthService, private router: Router) {}

  goToDashboard() {
    const role = this.auth.getRole();
    const roleLower = role?.toLowerCase();
    
    // Navigate to role-specific dashboard
    if (roleLower === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else if (roleLower === 'head manager') {
      this.router.navigate(['/head-manager']);
    } else if (roleLower === 'manager') {
      this.router.navigate(['/manager']);
    } else if (roleLower === 'engineer') {
      this.router.navigate(['/employee']);
    } else {
      // Default to engineer dashboard
      this.router.navigate(['/employee']);
    }
  }

  logout() {
    const confirmLogout = window.confirm('Do you want to logout?');
    if (confirmLogout) {
      // Get role before logout
      const role = this.auth.getRole();
      const roleLower = role?.toLowerCase();
      
      // Logout first
      this.auth.logout();
      
      // Redirect to login, then after login will redirect to role-specific dashboard
      this.router.navigate(['/login']).then(() => {
        history.replaceState({}, '', '/login');
      });
    } 
    // else: do nothing, stay on the same page
  }
}
