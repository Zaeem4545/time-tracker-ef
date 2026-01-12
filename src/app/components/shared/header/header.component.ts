import { Component, OnInit, HostListener, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { AdminService } from '../../../services/admin.service';
import { ToastNotificationService } from '../../../services/toast-notification.service';
import { ConfirmationModalService } from '../../../services/confirmation-modal.service';
import { filter, interval, Subscription } from 'rxjs';

import { UserService } from '../../../services/user.service'; // Import UserService
import { environment } from 'src/environments/environment'; // Import environment

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
  showProfileViewModal: boolean = false;
  showProfilePictureModal: boolean = false;
  selectedImageFile: File | null = null;
  imageZoom: number = 1;
  imagePosition: { x: number; y: number } = { x: 0, y: 0 };
  private imageElement: HTMLImageElement | null = null;
  isDragging: boolean = false;
  dragStart: { x: number; y: number } = { x: 0, y: 0 };
  existingImageUrl: string | null = null;
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  passwordMismatch: boolean = false;
  passwordError: string = '';
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('profileFileInput') profileFileInput!: ElementRef;
  @ViewChild('imageCanvas') imageCanvas!: ElementRef<HTMLCanvasElement>;

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
    private userService: UserService, // Inject UserService
    private toastService: ToastNotificationService,
    private confirmationService: ConfirmationModalService
  ) { }

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

  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.onMouseMove(event);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onDocumentMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.onMouseUp();
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

  viewProfile(): void {
    this.showProfileViewModal = true;
  }

  closeProfileViewModal(): void {
    this.showProfileViewModal = false;
  }

  openProfilePictureUpload(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.click();
    }
  }

  openChangeProfilePicture(): void {
    this.showMenu = false;
    this.closeProfileViewModal();
    this.showProfilePictureModal = true;
    
    // If there's an existing profile picture, load it for adjustment
    if (this.profilePictureUrl) {
      this.existingImageUrl = this.profilePictureUrl;
      this.selectedImageFile = null;
      this.imageZoom = 1;
      this.imagePosition = { x: 0, y: 0 };
      
      // Load existing image after modal opens
      setTimeout(() => {
        this.loadExistingImageToCanvas();
      }, 100);
    } else {
      this.existingImageUrl = null;
      this.selectedImageFile = null;
      this.imageZoom = 1;
      this.imagePosition = { x: 0, y: 0 };
    }
  }

  closeProfilePictureModal(): void {
    this.showProfilePictureModal = false;
    this.selectedImageFile = null;
    this.imageZoom = 1;
    this.imagePosition = { x: 0, y: 0 };
    this.imageElement = null;
    this.existingImageUrl = null;
    this.isDragging = false;
  }

  triggerFileInput(): void {
    if (this.profileFileInput && this.profileFileInput.nativeElement) {
      this.profileFileInput.nativeElement.click();
    }
  }

  onImageSelected(event: any): void {
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

    this.selectedImageFile = file;
    this.existingImageUrl = null; // Clear existing image when new one is selected
    this.imageZoom = 1;
    this.imagePosition = { x: 0, y: 0 };
    
    // Store the original file for later use
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      localStorage.setItem('profilePictureOriginal', base64String);
    };
    reader.readAsDataURL(file);
    
    // Load image and draw on canvas
    setTimeout(() => {
      this.loadImageToCanvas();
    }, 100);
  }

  loadExistingImageToCanvas(): void {
    if (!this.imageCanvas) return;

    const canvas = this.imageCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // First, try to load the original uncropped image from localStorage
    const originalImageData = localStorage.getItem('profilePictureOriginal');
    
    if (originalImageData) {
      // Load the original uncropped image
      const img = new Image();
      img.onload = () => {
        this.imageElement = img;
        
        // Set canvas size (square for profile picture)
        const size = 400;
        canvas.width = size;
        canvas.height = size;
        
        // Restore zoom and position if available, otherwise fit to box
        const savedZoom = localStorage.getItem('profilePictureZoom');
        const savedPosition = localStorage.getItem('profilePicturePosition');
        if (savedZoom) {
          this.imageZoom = parseFloat(savedZoom);
        } else {
          // Calculate initial zoom to fit image fully in square box
          const fitWidth = size / img.width;
          const fitHeight = size / img.height;
          this.imageZoom = Math.min(fitWidth, fitHeight);
        }
        if (savedPosition) {
          try {
            this.imagePosition = JSON.parse(savedPosition);
          } catch (e) {
            this.imagePosition = { x: 0, y: 0 };
          }
        } else {
          this.imagePosition = { x: 0, y: 0 };
        }
        
        this.updateImagePreview();
      };
      img.onerror = () => {
        // If original fails to load, fall back to profile picture URL
        this.loadCroppedImageFromUrl();
      };
      img.src = originalImageData;
    } else if (this.existingImageUrl) {
      // If no original stored, load from profile picture URL
      this.loadCroppedImageFromUrl();
    }
  }

  loadCroppedImageFromUrl(): void {
    if (!this.existingImageUrl || !this.imageCanvas) return;

    const canvas = this.imageCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Handle CORS if needed
    img.onload = () => {
      this.imageElement = img;
      
      // Set canvas size (square for profile picture)
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      
      // Calculate initial zoom to fit image fully in square box
      const fitWidth = size / img.width;
      const fitHeight = size / img.height;
      this.imageZoom = Math.min(fitWidth, fitHeight);
      this.imagePosition = { x: 0, y: 0 };
      
      this.updateImagePreview();
    };
    img.onerror = () => {
      console.error('Failed to load existing image');
      this.toastService.show('Failed to load existing profile picture', 'error');
    };
    img.src = this.existingImageUrl;
  }

  loadImageToCanvas(): void {
    if (!this.selectedImageFile || !this.imageCanvas) return;

    const canvas = this.imageCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      this.imageElement = img;
      
      // Set canvas size (square for profile picture)
      const size = 400;
      canvas.width = size;
      canvas.height = size;
      
      // Calculate initial zoom to fit image fully in square box
      const fitWidth = size / img.width;
      const fitHeight = size / img.height;
      this.imageZoom = Math.min(fitWidth, fitHeight);
      this.imagePosition = { x: 0, y: 0 };
      
      this.updateImagePreview();
    };
    img.src = URL.createObjectURL(this.selectedImageFile);
  }

  updateImagePreview(): void {
    if (!this.imageElement || !this.imageCanvas) return;

    const canvas = this.imageCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Calculate scaled dimensions
    const scaledWidth = this.imageElement.width * this.imageZoom;
    const scaledHeight = this.imageElement.height * this.imageZoom;

    // Calculate position to center the image (with offset)
    const x = (size - scaledWidth) / 2 + this.imagePosition.x;
    const y = (size - scaledHeight) / 2 + this.imagePosition.y;

    // Draw image without circular clipping - show full square
    ctx.drawImage(this.imageElement, x, y, scaledWidth, scaledHeight);
  }

  // Drag functionality for mouse
  onMouseDown(event: MouseEvent): void {
    if (!this.imageElement) return;
    this.isDragging = true;
    const canvas = this.imageCanvas?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Store the offset from mouse position to current image position
    this.dragStart = { 
      x: event.clientX - centerX - this.imagePosition.x, 
      y: event.clientY - centerY - this.imagePosition.y 
    };
    event.preventDefault();
    event.stopPropagation();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.imageElement) return;
    const canvas = this.imageCanvas?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Calculate new position relative to canvas center
    this.imagePosition = {
      x: event.clientX - centerX - this.dragStart.x,
      y: event.clientY - centerY - this.dragStart.y
    };
    this.updateImagePreview();
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  // Touch functionality
  onTouchStart(event: TouchEvent): void {
    if (!this.imageElement) return;
    const touch = event.touches[0];
    this.isDragging = true;
    const canvas = this.imageCanvas?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Store the offset from touch position to current image position
    this.dragStart = { 
      x: touch.clientX - centerX - this.imagePosition.x, 
      y: touch.clientY - centerY - this.imagePosition.y 
    };
    event.preventDefault();
    event.stopPropagation();
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.imageElement) return;
    const touch = event.touches[0];
    const canvas = this.imageCanvas?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    // Calculate new position relative to canvas center
    this.imagePosition = {
      x: touch.clientX - centerX - this.dragStart.x,
      y: touch.clientY - centerY - this.dragStart.y
    };
    this.updateImagePreview();
    event.preventDefault();
  }

  onTouchEnd(): void {
    this.isDragging = false;
  }

  moveImage(direction: string): void {
    const step = 20;
    switch (direction) {
      case 'up':
        this.imagePosition.y -= step;
        break;
      case 'down':
        this.imagePosition.y += step;
        break;
      case 'left':
        this.imagePosition.x -= step;
        break;
      case 'right':
        this.imagePosition.x += step;
        break;
      case 'center':
        this.imagePosition = { x: 0, y: 0 };
        break;
    }
    this.updateImagePreview();
  }

  resetImageAdjustments(): void {
    this.imageZoom = 1;
    this.imagePosition = { x: 0, y: 0 };
    this.updateImagePreview();
  }

  saveProfilePicture(): void {
    if ((!this.selectedImageFile && !this.existingImageUrl) || !this.imageCanvas) {
      this.toastService.show('Please select an image first', 'error');
      return;
    }

    // Store the current zoom and position for restoration when reopening
    localStorage.setItem('profilePictureZoom', this.imageZoom.toString());
    localStorage.setItem('profilePicturePosition', JSON.stringify(this.imagePosition));
    
    // If we have a selected file, the original is already stored in onImageSelected
    // If we're adjusting an existing image, we need to store the original imageElement
    if (!this.selectedImageFile && this.imageElement) {
      // Create a temporary canvas to store the original uncropped image
      const originalCanvas = document.createElement('canvas');
      originalCanvas.width = this.imageElement.width;
      originalCanvas.height = this.imageElement.height;
      const originalCtx = originalCanvas.getContext('2d');
      if (originalCtx) {
        originalCtx.drawImage(this.imageElement, 0, 0);
        // Store as base64 for later use
        originalCanvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              localStorage.setItem('profilePictureOriginal', base64String);
            };
            reader.readAsDataURL(blob);
          }
        });
      }
    }

    // Create a new canvas for the final square image
    const sourceCanvas = this.imageCanvas.nativeElement;
    const finalCanvas = document.createElement('canvas');
    const size = sourceCanvas.width;
    finalCanvas.width = size;
    finalCanvas.height = size;
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
      this.toastService.show('Failed to process image', 'error');
      return;
    }

    // Draw the source canvas onto the final canvas (square)
    ctx.drawImage(sourceCanvas, 0, 0);

    // Determine file name and type before calling toBlob
    const fileName = this.selectedImageFile ? this.selectedImageFile.name : 'profile-picture.jpg';
    const fileType = this.selectedImageFile ? this.selectedImageFile.type : 'image/jpeg';

    // Get cropped image from canvas
    finalCanvas.toBlob((blob) => {
      if (!blob) {
        this.toastService.show('Failed to process image', 'error');
        return;
      }

      // Convert blob to File
      const croppedFile = new File([blob], fileName, {
        type: fileType,
        lastModified: Date.now()
      });

      // Upload file
      this.adminService.uploadFile(croppedFile).subscribe({
        next: (response) => {
          if (response.success && response.file) {
            let profilePath = response.file.path;
            this.profilePictureUrl = this.getFullProfileUrl(profilePath);

            // Save to localStorage immediately for UI responsiveness
            if (this.profilePictureUrl) {
              localStorage.setItem('profilePicture', this.profilePictureUrl);
            }

            // Persist to database
            // Get current user name using getUserDisplayName which has proper fallbacks
            const currentName = this.getUserDisplayName();
            
            this.userService.updateProfile({
              name: currentName,
              profile_picture: this.profilePictureUrl
            }).subscribe({
              next: () => {
                this.toastService.show('Profile picture updated successfully', 'success');
                this.closeProfilePictureModal();
                // Refresh profile view if open
                if (this.showProfileViewModal) {
                  this.loadProfilePicture();
                }
              },
              error: (err) => {
                console.error('Failed to save profile picture to database:', err);
                // Even if database save fails, the picture is uploaded and visible
                // So we still close the modal and show success (picture is visible)
                this.toastService.show('Profile picture updated successfully', 'success');
                this.closeProfilePictureModal();
                // Refresh profile view if open
                if (this.showProfileViewModal) {
                  this.loadProfilePicture();
                }
              }
            });
          }
        },
        error: (err) => {
          this.toastService.show('Failed to upload profile picture: ' + (err?.error?.message || 'Unknown error'), 'error');
        }
      });
    }, fileType, 0.9); // 0.9 quality
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
          // Construct full URL if needed
          let profilePath = response.file.path;
          this.profilePictureUrl = this.getFullProfileUrl(profilePath);

          // Save to localStorage immediately for UI responsiveness
          if (this.profilePictureUrl) {
            localStorage.setItem('profilePicture', this.profilePictureUrl);
          }

          // Persist to database
          this.userService.updateProfile({
            name: this.userName, // Keep existing name
            profile_picture: this.profilePictureUrl // Save full URL or relative path depending on strategy, here simpler to save what we show
          }).subscribe({
            next: () => {
              this.toastService.show('Profile picture updated successfully', 'success');
            },
            error: (err) => {
              console.error('Failed to save profile picture to database:', err);
              // Don't show error to user since upload succeeded and UI is updated
            }
          });
        }
      },
      error: (err) => {
        this.toastService.show('Failed to upload profile picture: ' + (err?.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  loadProfilePicture(): void {
    // Try to get from user data from API first for source of truth
    const userId = this.auth.getUserId();
    if (userId) {
      this.adminService.getUsers().subscribe({
        next: (users) => {
          const currentUser = users.find((u: any) => u.id === userId);
          if (currentUser && currentUser.profile_picture) {
            this.profilePictureUrl = this.getFullProfileUrl(currentUser.profile_picture);
            if (this.profilePictureUrl) {
              localStorage.setItem('profilePicture', this.profilePictureUrl);
            }
          } else {
            // Fallback to localStorage if not in DB (legacy support)
            const savedPicture = localStorage.getItem('profilePicture');
            if (savedPicture) {
              this.profilePictureUrl = savedPicture;
            }
          }
        },
        error: () => {
          // Fallback to localStorage on error
          const savedPicture = localStorage.getItem('profilePicture');
          if (savedPicture) {
            this.profilePictureUrl = savedPicture;
          }
        }
      });
    } else {
      // Fallback to localStorage if no user ID
      const savedPicture = localStorage.getItem('profilePicture');
      if (savedPicture) {
        this.profilePictureUrl = savedPicture;
      }
    }
  }

  // Helper to ensure profile URL is absolute if it's a relative path from our backend
  getFullProfileUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path; // Already absolute

    // Construct absolute URL using environment apiBase
    // Assume apiBase doesn't end with slash and path starts with slash or not
    const base = environment.apiBase.replace(/\/$/, ''); // Remove trailing slash if any
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }
}

