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
  showWelcomeMessage = false;
  welcomeName = '';

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
      this.toastService.show('Please enter both email and password.', 'error');
      return;
    }

    console.log('Login clicked', this.email);
    this.auth.login(this.email, this.password).subscribe({
      next: res => {
        console.log('Login response', res);
        
        // Get user name from response or token
        const userName = res.name || res.user?.name || this.getUserNameFromToken() || this.email.split('@')[0];
        this.showWelcomeAndRedirect(userName, res.role);
      },
      error: err => {
        console.error('Login failed', err);
        const msg =
          err?.error?.message ||
          err?.message ||
          'Invalid credentials. Please check your email and password.';
        this.toastService.show(msg, 'error');
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
      this.toastService.show('Google login failed', 'error');
      return;
    }

    const googleIdToken = response.credential;

    this.auth.loginWithGoogle(googleIdToken).subscribe({
      next: (res) => {
        // Ensure navigation happens inside Angular zone
        this.ngZone.run(() => {
          // Get user name from response or token
          const userName = res?.name || res?.user?.name || this.getUserNameFromToken() || this.auth.getEmail()?.split('@')[0] || 'User';
          const role = this.auth.getRole()?.toLowerCase();
          this.showWelcomeAndRedirect(userName, role || '');
        });
      },
      error: err => {
        const msg = err?.error?.message || err?.message || 'Google login failed';
        this.toastService.show(msg, 'error');
      }
    });
  }

  // Show welcome message and redirect
  showWelcomeAndRedirect(userName: string, role: string): void {
    this.welcomeName = userName;
    this.showWelcomeMessage = true;

    // Determine target route
    const roleLower = role?.toLowerCase();
    let targetRoute = '/dashboard';
    
    if (roleLower === 'admin') {
      targetRoute = '/admin-dashboard';
    } else if (roleLower === 'head manager') {
      targetRoute = '/dashboard';
    } else if (roleLower === 'manager') {
      targetRoute = '/dashboard';
    } else if (roleLower === 'employee') {
      targetRoute = '/employee';
    }

    // Hide welcome message after 2 seconds and navigate
    setTimeout(() => {
      this.showWelcomeMessage = false;
      this.router.navigate([targetRoute]).then(() => {
        // Check for unread notifications after navigation completes
        setTimeout(() => {
          this.checkForNewNotifications();
        }, 1000); // 1 second delay to ensure page is loaded
      });
    }, 2000);
  }

  // Get user name from JWT token
  getUserNameFromToken(): string | null {
    const token = this.auth.getToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.name || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
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
