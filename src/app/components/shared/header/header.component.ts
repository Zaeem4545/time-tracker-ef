import { Component, OnInit, HostListener, OnDestroy, Output, EventEmitter } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { filter, interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() sidebarToggle = new EventEmitter<void>();
  pageTitle: string = 'Dashboard';
  showNotifications: boolean = false;
  showMenu: boolean = false;
  notifications: Notification[] = [];
  unreadCount: number = 0;
  private refreshSubscription?: Subscription;
  isMobileView: boolean = false;

  private routeTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/admin-dashboard': 'Admin Dashboard',
    '/admin': 'Create User',
    '/manager': 'Add Employee',
    '/head-manager': 'Select Team Leads',
    '/employee': 'Employee Dashboard',
    '/projects': 'Manage Projects',
    '/my-projects-tasks': 'My Projects and Tasks',
    '/calendar': 'Calendar',
    '/timesheet': 'Timesheet',
    '/create-team': 'Create Team',
    '/team-details': 'Team Details',
    '/employee-details': 'Employee Details'
  };

  constructor(
    public auth: AuthService, 
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.checkMobileView();
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.updatePageTitle(event.url);
      });
    
    this.updatePageTitle(this.router.url);
    this.loadNotifications();
    this.loadUnreadCount();
    
    // Refresh notifications every 30 seconds
    this.refreshSubscription = interval(30000).subscribe(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    });
  }

  checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  isMobile(): boolean {
    return window.innerWidth <= 768;
  }

  toggleSidebar(): void {
    this.sidebarToggle.emit();
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkMobileView();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadNotifications(): void {
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        console.log('Notifications loaded:', notifications);
        this.notifications = notifications;
      },
      error: (err) => {
        console.error('Error loading notifications:', err);
        console.error('Error details:', err.error || err.message);
        this.notifications = [];
      }
    });
  }

  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (response) => {
        console.log('Unread count loaded:', response.count);
        this.unreadCount = response.count;
      },
      error: (err) => {
        console.error('Error loading unread count:', err);
        console.error('Error details:', err.error || err.message);
        this.unreadCount = 0;
      }
    });
  }

  markAsRead(notification: Notification): void {
    if (!notification.is_read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.is_read = true;
          this.loadUnreadCount();
        },
        error: (err) => {
          console.error('Error marking notification as read:', err);
        }
      });
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // Update local state
        this.notifications.forEach(n => n.is_read = true);
        this.unreadCount = 0;
        console.log('All notifications marked as read');
        // Reload notifications and count to ensure sync with backend
        this.loadNotifications();
        this.loadUnreadCount();
      },
      error: (err) => {
        console.error('Error marking all notifications as read:', err);
        console.error('Error details:', err.error || err.message);
        alert('Error marking all notifications as read: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  updatePageTitle(url: string): void {
    const route = url.split('?')[0].split('#')[0];
    let title = this.routeTitles[route] || 'Dashboard';
    
    // For head managers, show "Assign Projects" instead of "Manage Projects"
    if (route === '/projects' && this.auth.getRole()?.toLowerCase() === 'head manager') {
      title = 'Assign Projects';
    }
    
    // For head managers on dashboard route, show "Select Team Leads"
    if (route === '/head-manager' || (route === '/dashboard' && this.auth.getRole()?.toLowerCase() === 'head manager')) {
      title = 'Select Team Leads';
    }
    
    this.pageTitle = title;
  }

  logout(): void {
    const confirmLogout = window.confirm('Do you want to logout?');
    if (confirmLogout) {
      this.auth.logout();
      this.router.navigate(['/login']).then(() => {
        history.replaceState({}, '', '/login');
      });
    }
  }

  getUserDisplayName(): string {
    const role = this.auth.getRole();
    if (!role) return 'User';
    
    // Map role to display name
    const roleLower = role.toLowerCase();
    if (roleLower === 'manager') {
      return 'Team Lead';
    } else if (roleLower === 'head manager') {
      return 'Head Manager';
    } else {
      return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.showMenu = false;
      this.loadNotifications(); // Refresh notifications when opening
      this.loadUnreadCount();
    }
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
    if (this.showMenu) {
      this.showNotifications = false;
    }
  }

  handleLogout(): void {
    this.showMenu = false;
    this.logout();
  }

  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.notifications-container') && !target.closest('.icon-btn[title="Notifications"]')) {
      this.showNotifications = false;
    }
    if (!target.closest('.menu-container') && !target.closest('.icon-btn[title="Menu"]')) {
      this.showMenu = false;
    }
  }
}

