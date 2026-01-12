import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ToastNotificationService } from '../../services/toast-notification.service';

@Component({
  selector: 'app-create-team',
  templateUrl: './create-team.component.html',
  styleUrls: ['./create-team.component.scss']
})
export class CreateTeamComponent implements OnInit {
  managers: any[] = [];
  employees: any[] = [];
  selectedManagerId: number | null = null;
  selectedEmployeeIds: Set<number> = new Set();
  teamName: string = '';
  showCreateForm: boolean = false;
  currentUserRole: string | null = null;
  isAdmin: boolean = false;
  isHeadManager: boolean = false;

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private toastService: ToastNotificationService
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();
    this.isAdmin = this.currentUserRole?.toLowerCase() === 'admin';
    this.isHeadManager = this.currentUserRole?.toLowerCase() === 'head manager';
    this.loadManagers();
    this.loadEmployees();
  }

  loadManagers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.managers = (users || []).filter((user: any) => 
          user.role?.toLowerCase() === 'manager'
        );
      },
      error: (err) => {
        console.error('Error loading managers:', err);
        this.toastService.show('Error loading managers', 'error');
      }
    });
  }

  loadEmployees(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.employees = (users || []).filter((user: any) => 
          user.role?.toLowerCase() === 'engineer'
        );
      },
      error: (err) => {
        console.error('Error loading employees:', err);
        this.toastService.show('Error loading employees', 'error');
      }
    });
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (!this.showCreateForm) {
      this.resetForm();
    }
  }

  toggleEmployeeSelection(employeeId: number): void {
    if (this.selectedEmployeeIds.has(employeeId)) {
      this.selectedEmployeeIds.delete(employeeId);
    } else {
      this.selectedEmployeeIds.add(employeeId);
    }
  }

  isEmployeeSelected(employeeId: number): boolean {
    return this.selectedEmployeeIds.has(employeeId);
  }

  createTeam(): void {
    if (!this.selectedManagerId) {
      this.toastService.show('Please select a team lead', 'error');
      return;
    }

    if (this.selectedEmployeeIds.size === 0) {
      this.toastService.show('Please select at least one engineer', 'error');
      return;
    }

    // Assign each selected employee to the manager
    const employeeIds = Array.from(this.selectedEmployeeIds);
    let assignedCount = 0;
    let errorCount = 0;

    employeeIds.forEach((employeeId, index) => {
      // Use AdminService to assign employee to manager
      // Note: This assumes there's an endpoint for assigning employees to managers
      // If not, we'll need to use ManagerService.assignEmployee
      setTimeout(() => {
        // For now, we'll use a simple approach - assign employees one by one
        // In a real scenario, you might want a batch endpoint
        this.assignEmployeeToManager(employeeId, () => {
          assignedCount++;
          if (assignedCount + errorCount === employeeIds.length) {
            if (errorCount === 0) {
              this.toastService.show(`Team created successfully! ${assignedCount} engineer(s) assigned to manager.`, 'success');
              this.resetForm();
              this.loadEmployees(); // Reload to reflect changes
            } else {
              this.toastService.show(`Team partially created. ${assignedCount} assigned, ${errorCount} failed.`, 'warning');
            }
          }
        }, () => {
          errorCount++;
          if (assignedCount + errorCount === employeeIds.length) {
            if (assignedCount > 0) {
              this.toastService.show(`Team partially created. ${assignedCount} assigned, ${errorCount} failed.`, 'warning');
            } else {
              this.toastService.show('Failed to create team', 'error');
            }
          }
        });
      }, index * 100); // Small delay to avoid overwhelming the server
    });
  }

  assignEmployeeToManager(employeeId: number, onSuccess: () => void, onError: () => void): void {
    if (!this.selectedManagerId) {
      onError();
      return;
    }
    
    // Use AdminService to assign employee to manager
    this.adminService.assignEmployeeToManager(employeeId, this.selectedManagerId).subscribe({
      next: () => {
        onSuccess();
      },
      error: (err) => {
        console.error(`Error assigning employee ${employeeId}:`, err);
        onError();
      }
    });
  }

  resetForm(): void {
    this.selectedManagerId = null;
    this.selectedEmployeeIds.clear();
    this.teamName = '';
  }

  getSelectedManagerName(): string {
    const manager = this.managers.find(m => m.id === this.selectedManagerId);
    return manager ? (manager.name || manager.email) : '';
  }

  getSelectedEmployeesCount(): number {
    return this.selectedEmployeeIds.size;
  }
}

