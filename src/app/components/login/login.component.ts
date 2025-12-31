import { Component, AfterViewInit, NgZone } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { ToastNotificationService } from '../../services/toast-notification.service';

declare const google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements AfterViewInit {
  email = '';
  password = '';
  rememberMe = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private ngZone: NgZone,
    private notificationService: NotificationService,
    private toastService: ToastNotificationService
  ) {}

  // Email login
  login() {
    if (!this.email || !this.password) {
      alert('Please enter both email and password.');
      return;
    }

    console.log('Login clicked', this.email);
    this.auth.login(this.email, this.password).subscribe({
      next: res => {
        console.log('Login response', res);
        alert('Login successful! Role: ' + res.role);

        // Redirect users to their role-specific dashboard
        const role = res.role?.toLowerCase();
        let targetRoute = '/dashboard';
        
        if (role === 'admin') {
          targetRoute = '/admin';
        } else if (role === 'head manager') {
          targetRoute = '/dashboard';
        } else if (role === 'manager') {
          targetRoute = '/dashboard';
        } else if (role === 'employee') {
          targetRoute = '/employee';
        }

        // Navigate and check notifications after navigation
        this.router.navigate([targetRoute]).then(() => {
          // Check for unread notifications after navigation completes
          setTimeout(() => {
            this.checkForNewNotifications();
          }, 1000); // 1 second delay to ensure page is loaded
        });
      },
      error: err => {
        console.error('Login failed', err);
        const msg =
          err?.error?.message ||
          err?.message ||
          'Unknown error. Please check console/Network tab for details.';
        alert('Login failed: ' + msg);
      }
    });
  }

  // Google Sign-In initialization
  ngAfterViewInit(): void {
    this.initGoogleButton();
  }

  private initGoogleButton(retryCount: number = 0): void {
    const btnDiv = document.getElementById('googleBtn');

    // If button container not in DOM yet, or google script not ready, retry a few times
    if (!btnDiv || !(window as any).google?.accounts?.id) {
      if (retryCount < 10) {
        setTimeout(() => this.initGoogleButton(retryCount + 1), 300);
      }
      return;
    }

    const googleAny = (window as any).google;

    googleAny.accounts.id.initialize({
      client_id: '1056314389224-cm5hq01s9ncfq0n1rqpvrse0mr8ojkc5.apps.googleusercontent.com',
      callback: this.handleGoogleResponse.bind(this)
    });

    googleAny.accounts.id.renderButton(btnDiv, {
      theme: 'outline',
      size: 'large',
      width: 250
    });

    googleAny.accounts.id.prompt();
  }

  // Google login handler
  handleGoogleResponse(response: any): void {
    if (!response?.credential) {
      alert('Google login failed');
      return;
    }

    const googleIdToken = response.credential;

    this.auth.loginWithGoogle(googleIdToken).subscribe({
      next: () => {
        // Ensure navigation happens inside Angular zone
        this.ngZone.run(() => {
          // Get user role and redirect to role-specific dashboard
          const role = this.auth.getRole()?.toLowerCase();
          let targetRoute = '/dashboard';
          
          if (role === 'admin') {
            targetRoute = '/admin';
          } else if (role === 'head manager') {
            targetRoute = '/dashboard';
          } else if (role === 'manager') {
            targetRoute = '/dashboard';
          } else if (role === 'employee') {
            targetRoute = '/employee';
          }

          // Navigate and check notifications after navigation
          this.router.navigate([targetRoute]).then(() => {
            // Check for unread notifications after navigation completes
            setTimeout(() => {
              this.checkForNewNotifications();
            }, 1000); // 1 second delay to ensure page is loaded
          });
        });
      },
      error: err => alert('Google login failed: ' + err.message)
    });
  }

  // Check for new notifications after login
  checkForNewNotifications(): void {
    // Small delay to ensure token is set
    setTimeout(() => {
      this.notificationService.getUnreadCount().subscribe({
        next: (response) => {
          if (response.count > 0) {
            const message = `New notification arrived! You have ${response.count} unread notification${response.count > 1 ? 's' : ''}.`;
            this.toastService.show(message, 'info');
          }
        },
        error: (err) => {
          console.error('Error checking notifications:', err);
          // Don't show error to user, just log it
        }
      });
    }, 500); // 500ms delay to ensure token is available
  }
}
