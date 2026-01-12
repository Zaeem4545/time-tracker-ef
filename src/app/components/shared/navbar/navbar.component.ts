import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  constructor(
    public auth: AuthService, 
    private router: Router,
    private confirmationService: ConfirmationModalService
  ) {}

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
    this.confirmationService.show({
      title: 'Logout',
      message: 'Do you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      type: 'warning'
    }).then(confirmed => {
      if (confirmed) {
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
    });
  }
}
