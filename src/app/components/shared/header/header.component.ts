import { Component, OnInit, HostListener, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { AdminService } from '../../../services/admin.service';
import { ToastNotificationService } from '../../../services/toast-notification.service';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
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
  userName: string | null = null;
  profilePictureUrl: string | null = null;
  showChangePasswordModal: boolean = false;
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordMismatch: boolean = false;
  passwordError: string = '';
  @ViewChild('fileInput') fileInput!: ElementRef;

  private routeTitles: { [key: string]: string } = {
    '/dashboard': 'Dashboard',
    '/admin-dashboard': 'Admin Dashboard',
    '/admin': 'Create User',
    '/manager': 'Add Engineer',
    '/head-manager': 'Select Team Leads',
    '/employee': 'Engineer Dashboard',
    '/projects': 'Manage Projects',
    '/my-projects-tasks': 'My Projects and Tasks',
    '/calendar': 'Calendar',
    '/timesheet': 'Timesheet',
    '/customer-details': 'Add Customer',
    '/employee-details': 'Engineer Details'
  };

  constructor(
    public auth: AuthService, 
    private router: Router,
    private notificationService: NotificationService,
    private adminService: AdminService,
    private toastService: ToastNotificationService,
    private confirmationService: ConfirmationModalService
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
    this.loadUserName();
    this.loadProfilePicture();
    
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
    
    // For head managers on create-project route, show "Projects"
    if (route === '/create-project' && this.auth.getRole()?.toLowerCase() === 'head manager') {
      title = 'Projects';
    }
    
    // For head managers on dashboard route, show "Select Team Leads"
    if (route === '/head-manager' || (route === '/dashboard' && this.auth.getRole()?.toLowerCase() === 'head manager')) {
      title = 'Select Team Leads';
    }
    
    this.pageTitle = title;
  }

  logout(): void {
    this.confirmationService.show({
      title: 'Logout',
      message: 'Do you want to logout?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      type: 'warning'
    }).then(confirmed => {
      if (confirmed) {
        this.auth.logout();
        this.router.navigate(['/login']).then(() => {
          history.replaceState({}, '', '/login');
        });
      }
    });
  }

  loadUserName(): void {
    const userId = this.auth.getUserId();
    const userEmail = this.auth.getEmail();
    
    // First try to get name from token
    const tokenName = this.auth.getName();
    if (tokenName) {
      this.userName = tokenName;
      return;
    }
    
    // If not in token, fetch from API
    if (userId || userEmail) {
      this.adminService.getUsers().subscribe({
        next: (users) => {
          const currentUser = users.find((u: any) => 
            (userId && u.id === userId) || (userEmail && u.email === userEmail)
          );
          if (currentUser && currentUser.name) {
            this.userName = currentUser.name;
          } else {
            // Fallback to role if name not found
            this.userName = null;
          }
        },
        error: () => {
          this.userName = null;
        }
      });
    }
  }

  getUserDisplayName(): string {
    // First use the loaded user name
    if (this.userName) {
      return this.userName;
    }
    
    // Try to get name from token
    const tokenName = this.auth.getName();
    if (tokenName) {
      return tokenName;
    }
    
    // Final fallback to role
    const role = this.auth.getRole();
    if (!role) return 'User';
    
    // Map role to display name
    const roleLower = role.toLowerCase();
    if (roleLower === 'manager') {
      return 'Team Lead';
    } else if (roleLower === 'head manager') {
      return 'Project Manager';
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

  goToDashboard(): void {
    const role = this.auth.getRole();
    const roleLower = role?.toLowerCase();
    
    // Navigate to role-specific dashboard
    if (roleLower === 'admin') {
      this.router.navigate(['/admin-dashboard']);
    } else if (roleLower === 'head manager') {
      this.router.navigate(['/head-manager']);
    } else if (roleLower === 'manager') {
      this.router.navigate(['/dashboard']);
    } else if (roleLower === 'engineer') {
      this.router.navigate(['/employee']);
    } else {
      // Default to general dashboard
      this.router.navigate(['/dashboard']);
    }
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

  openChangePasswordModal(): void {
    this.showMenu = false;
    this.showChangePasswordModal = true;
    this.passwordData = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordMismatch = false;
    this.passwordError = '';
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
    this.passwordData = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.passwordMismatch = false;
    this.passwordError = '';
  }

  changePassword(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    // Reset errors
    this.passwordMismatch = false;
    this.passwordError = '';

    // Validate fields
    if (!this.passwordData.currentPassword || !this.passwordData.newPassword || !this.passwordData.confirmPassword) {
      this.passwordError = 'All fields are required';
      return;
    }

    // Check if passwords match
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.passwordMismatch = true;
      this.passwordError = 'New passwords do not match';
      return;
    }

    // Check if new password is different from current
    if (this.passwordData.currentPassword === this.passwordData.newPassword) {
      this.passwordError = 'New password must be different from current password';
      return;
    }

    const userId = this.auth.getUserId();
    if (!userId) {
      this.passwordError = 'User ID not found';
      return;
    }

    // Call API to change password
    this.adminService.updateUserPassword(userId, {
      currentPassword: this.passwordData.currentPassword,
      password: this.passwordData.newPassword
    }).subscribe({
      next: () => {
        this.toastService.show('Password changed successfully', 'success');
        this.closeChangePasswordModal();
      },
      error: (err) => {
        this.passwordError = err?.error?.message || err?.message || 'Failed to change password';
      }
    });
  }

  openProfilePictureUpload(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  openChangeProfilePicture(): void {
    this.showMenu = false;
    this.openProfilePictureUpload();
  }

  onProfilePictureChange(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.show('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.show('Image size must be less than 5MB', 'error');
      return;
    }

    // Upload file
    this.adminService.uploadFile(file).subscribe({
      next: (response) => {
        if (response.success && response.file) {
          // Store profile picture URL (you may want to save this to user profile in database)
          this.profilePictureUrl = response.file.path;
          // Save to localStorage for now (you can update this to save to database)
          if (this.profilePictureUrl) {
            localStorage.setItem('profilePicture', this.profilePictureUrl);
          }
          this.toastService.show('Profile picture updated successfully', 'success');
        }
      },
      error: (err) => {
        this.toastService.show('Failed to upload profile picture: ' + (err?.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  loadProfilePicture(): void {
    // Load from localStorage (you can update this to load from database)
    const savedPicture = localStorage.getItem('profilePicture');
    if (savedPicture) {
      this.profilePictureUrl = savedPicture;
    } else {
      // Try to get from user data
      const userId = this.auth.getUserId();
      if (userId) {
        this.adminService.getUsers().subscribe({
        next: (users) => {
          const currentUser = users.find((u: any) => u.id === userId);
          if (currentUser && currentUser.profile_picture) {
            this.profilePictureUrl = currentUser.profile_picture;
            if (this.profilePictureUrl) {
              localStorage.setItem('profilePicture', this.profilePictureUrl);
            }
          }
        },
          error: () => {
            // Silently fail
          }
        });
      }
    }
  }
}

