import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service';
import { ToastNotificationService } from '../../services/toast-notification.service';
import { ConfirmationModalService } from '../../services/confirmation-modal.service';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = []; // Filtered users based on search
  searchTerm: string = ''; // Search input
  newUser = { email: '', password: '', role: 'Engineer', contact_number: '', name: '' };
  
  // User form expansion
  showCreateUserForm: boolean = false;
  
  // User editing
  editingUser: number | null = null;
  editingPassword: number | null = null; // Separate state for password editing
  editUserData: { [key: number]: { email: string; contact_number: string; role: string; name: string } } = {};
  editPasswordData: { [key: number]: { currentPassword: string; password: string } } = {};
  errorMessage: { [key: number]: string } = {};

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private toastService: ToastNotificationService,
    private confirmationService: ConfirmationModalService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    // Check for notifications when dashboard loads
    this.checkForNewNotifications();
  }

  // Check for new notifications
  checkForNewNotifications(): void {
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
        }
      });
    }, 500);
  }

  // Get display name for role (using utility function)
  getRoleDisplayName(role: string): string {
    if (!role) return '';
    const roleLower = role.toLowerCase().trim();
    if (roleLower === 'manager') return 'Team Lead';
    if (roleLower === 'head manager') return 'Project Manager';
    return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  }

  // User Management
  loadUsers() { 
    this.adminService.getUsers().subscribe(users => {
      // Normalize role to lowercase for consistent display
      this.users = users.map((user: any) => ({
        ...user,
        role: (user.role || '').toLowerCase()
      }));
      this.applySearch(); // Apply search filter after loading users
    });
  }

  // Search functionality
  applySearch() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredUsers = this.users; // Show all users if search is empty
      return;
    }

    const search = this.searchTerm.trim().toLowerCase();
    
    this.filteredUsers = this.users.filter(user => {
      // Search by ID (exact match or partial)
      const userId = user.id.toString().toLowerCase();
      if (userId.includes(search)) {
        return true;
      }
      
      // Search by name (partial match)
      const userName = (user.name || '').toLowerCase();
      if (userName.includes(search)) {
        return true;
      }
      
      // Search by email (partial match)
      const userEmail = (user.email || '').toLowerCase();
      if (userEmail.includes(search)) {
        return true;
      }
      
      return false;
    });
  }

  onSearchChange() {
    this.applySearch();
  }

  // Filter contact number to only allow digits
  filterContactNumber(value: string): string {
    return value.replace(/[^0-9]/g, '');
  }

  onContactNumberInput(event: any) {
    const filtered = this.filterContactNumber(event.target.value);
    this.newUser.contact_number = filtered;
    event.target.value = filtered;
  }

  onEditContactNumberInput(userId: number, event: any) {
    const filtered = this.filterContactNumber(event.target.value);
    if (this.editUserData[userId]) {
      this.editUserData[userId].contact_number = filtered;
    }
    event.target.value = filtered;
  }
  
  toggleCreateUserForm() {
    this.showCreateUserForm = !this.showCreateUserForm;
  }

  createUser() {
    if (!this.newUser.email) {
      this.toastService.show('Email is required', 'warning');
      return;
    }
    
    if (!this.newUser.name || this.newUser.name.trim() === '') {
      this.toastService.show('Name is required', 'warning');
      return;
    }
    
    if (!this.newUser.contact_number || this.newUser.contact_number.trim() === '') {
      this.toastService.show('Contact number is required', 'warning');
      return;
    }
    
    // Validate contact number contains only digits
    if (!/^\d+$/.test(this.newUser.contact_number.trim())) {
      this.toastService.show('Contact number must contain only numbers', 'warning');
      return;
    }
    
    // Normalize role to lowercase
    const userData = {
      email: this.newUser.email.trim(),
      password: this.newUser.password || '',
      role: this.newUser.role.toLowerCase(),
      contact_number: this.newUser.contact_number.trim(),
      name: this.newUser.name.trim()
    };
    
    console.log('Creating user with data:', userData);
    
    this.adminService.createUser(userData).subscribe({
      next: (response) => {
        console.log('User created successfully:', response);
        this.toastService.show('User created successfully', 'success');
        this.newUser = { email: '', password: '', role: 'Engineer', contact_number: '', name: '' };
        this.showCreateUserForm = false; // Collapse form after creation
        this.loadUsers(); // This will call applySearch() automatically
      },
      error: (err) => {
        console.error('Full error object:', err);
        console.error('Error status:', err.status);
        console.error('Error error:', err.error);
        let errorMessage = 'Unknown error';
        if (err.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (typeof err.error === 'string') {
            errorMessage = err.error;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        this.toastService.show('Error creating user: ' + errorMessage, 'error');
      }
    });
  }
  
  updateRole(user: any) { 
    // Normalize role to lowercase for backend
    const roleToUpdate = (user.role || '').toLowerCase();
    this.adminService.updateUserRole(user.id, roleToUpdate).subscribe({
      next: () => {
        this.loadUsers(); // Reload to get updated data from DB
      },
      error: (err) => {
        this.toastService.show('Error updating role: ' + (err.error?.message || 'Unknown error'), 'error');
        this.loadUsers(); // Reload to revert changes
      }
    });
  }
  
  editUser(user: any) {
    this.editingUser = user.id;
    this.editingPassword = null; // Close password edit if open
    this.editUserData[user.id] = {
      email: user.email,
      contact_number: user.contact_number || '',
      role: user.role.toLowerCase(),
      name: user.name || ''
    };
    this.errorMessage[user.id] = '';
  }
  
  cancelEdit(userId: number) {
    this.editingUser = null;
    delete this.editUserData[userId];
    delete this.errorMessage[userId];
  }

  openPasswordEdit(userId: number) {
    this.editingPassword = userId;
    this.editingUser = null; // Close user edit if open
    this.editPasswordData[userId] = {
      currentPassword: '',
      password: ''
    };
    this.errorMessage[userId] = '';
  }

  cancelPasswordEdit(userId: number) {
    this.editingPassword = null;
    delete this.editPasswordData[userId];
    delete this.errorMessage[userId];
  }

  // Check if passwords match in real-time
  checkPasswordMatch(userId: number) {
    const passwordData = this.editPasswordData[userId];
    if (!passwordData) return;
    
    // Only show error if both passwords are filled and they match
    if (passwordData.currentPassword && passwordData.currentPassword.trim() !== '' &&
        passwordData.password && passwordData.password.trim() !== '' &&
        passwordData.currentPassword.trim() === passwordData.password.trim()) {
      this.errorMessage[userId] = 'New password must be different from current password';
    } else if (this.errorMessage[userId] === 'New password must be different from current password') {
      // Clear the error if passwords are now different
      this.errorMessage[userId] = '';
    }
  }
  
  saveUser(userId: number) {
    const editData = this.editUserData[userId];
    if (!editData || !editData.email) {
      this.errorMessage[userId] = 'Email is required';
      return;
    }
    
    if (!editData.name || editData.name.trim() === '') {
      this.errorMessage[userId] = 'Name is required';
      return;
    }
    
    if (!editData.contact_number || editData.contact_number.trim() === '') {
      this.errorMessage[userId] = 'Contact number is required';
      return;
    }
    
    // Validate contact number contains only digits
    if (!/^\d+$/.test(editData.contact_number.trim())) {
      this.errorMessage[userId] = 'Contact number must contain only numbers';
      return;
    }
    
    // Clear any previous error
    this.errorMessage[userId] = '';
    
    const updateData = {
      email: editData.email.trim(),
      contact_number: editData.contact_number.trim(),
      role: editData.role.toLowerCase(),
      name: editData.name.trim()
    };
    
    this.adminService.updateUserInfo(userId, updateData).subscribe({
      next: () => {
        this.toastService.show('User updated successfully', 'success');
        this.editingUser = null;
        delete this.editUserData[userId];
        delete this.errorMessage[userId];
        this.loadUsers(); // This will call applySearch() automatically
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update user';
        this.errorMessage[userId] = errorMessage;
      }
    });
  }

  savePassword(userId: number) {
    const passwordData = this.editPasswordData[userId];
    if (!passwordData) {
      this.errorMessage[userId] = 'Password data is required';
      return;
    }
    
    if (!passwordData.currentPassword || passwordData.currentPassword.trim() === '') {
      this.errorMessage[userId] = 'Current password is required';
      return;
    }
    
    if (!passwordData.password || passwordData.password.trim() === '') {
      this.errorMessage[userId] = 'New password is required';
      return;
    }
    
    // Check if new password is different from current password
    if (passwordData.currentPassword.trim() === passwordData.password.trim()) {
      this.errorMessage[userId] = 'New password must be different from current password';
      return;
    }
    
    // Clear any previous error
    this.errorMessage[userId] = '';
    
    const updateData = {
      currentPassword: passwordData.currentPassword.trim(),
      password: passwordData.password.trim()
    };
    
    this.adminService.updateUserPassword(userId, updateData).subscribe({
      next: () => {
        this.toastService.show('Password updated successfully', 'success');
        this.editingPassword = null;
        delete this.editPasswordData[userId];
        delete this.errorMessage[userId];
        this.loadUsers(); // This will call applySearch() automatically
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update password';
        this.errorMessage[userId] = errorMessage;
      }
    });
  }
  
  deleteUser(userId: number) { 
    this.confirmationService.show({
      title: 'Delete User',
      message: 'Delete user?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.adminService.deleteUser(userId).subscribe(() => {
          this.loadUsers(); // This will call applySearch() automatically
          this.toastService.show('User deleted successfully', 'success');
        });
      }
    });
  }


}
