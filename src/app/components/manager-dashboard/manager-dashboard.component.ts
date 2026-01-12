import { Component, OnInit } from '@angular/core';
import { ManagerService } from '../../services/manager.service';
import { NotificationService } from '../../services/notification.service';
import { ToastNotificationService } from '../../services/toast-notification.service';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.scss']
})
export class ManagerDashboardComponent implements OnInit {
  teamMembers: any[] = [];
  availableEmployees: any[] = [];
  selectedEmployeeId: number | null = null;
  showAddEmployeeForm: boolean = false;

  constructor(
    private managerService: ManagerService,
    private notificationService: NotificationService,
    private toastService: ToastNotificationService
  ) {}

  ngOnInit(): void {
    this.loadTeamMembers();
    this.loadAvailableEmployees();
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

  loadTeamMembers() {
    this.managerService.getTeamMembers().subscribe({
      next: (res) => {
        this.teamMembers = res;
        this.loadAvailableEmployees(); // Reload available employees after team members change
      },
      error: (err) => {
        console.error('Error loading team members:', err);
      }
    });
  }

  loadAvailableEmployees() {
    this.managerService.getAllEmployees().subscribe({
      next: (response: any) => {
        if (response.success) {
          // Filter out employees already in team
          const teamMemberIds = new Set(this.teamMembers.map(m => m.id));
          this.availableEmployees = response.employees.filter((emp: any) => !teamMemberIds.has(emp.id));
        }
      },
      error: (err) => {
        console.error('Error loading available employees:', err);
      }
    });
  }

  toggleAddEmployeeForm() {
    this.showAddEmployeeForm = !this.showAddEmployeeForm;
    if (this.showAddEmployeeForm) {
      this.loadAvailableEmployees();
    }
  }

  addEmployee() {
    if (!this.selectedEmployeeId) {
      alert('Please select an engineer');
      return;
    }

    this.managerService.assignEmployee(this.selectedEmployeeId).subscribe({
      next: (response: any) => {
        if (response.success) {
          alert('Engineer added to team successfully');
          this.selectedEmployeeId = null;
          this.showAddEmployeeForm = false;
          this.loadTeamMembers();
        }
      },
      error: (err) => {
        alert('Error adding engineer: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }

  removeEmployee(employeeId: number) {
    if (confirm('Are you sure you want to remove this engineer from your team?')) {
      this.managerService.removeEmployee(employeeId).subscribe({
        next: (response: any) => {
          if (response.success) {
            alert('Engineer removed from team successfully');
            this.loadTeamMembers();
          }
        },
        error: (err) => {
          alert('Error removing engineer: ' + (err.error?.message || 'Unknown error'));
        }
      });
    }
  }
}
