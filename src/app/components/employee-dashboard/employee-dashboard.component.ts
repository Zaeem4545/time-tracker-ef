import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service';
import { ToastNotificationService } from '../../services/toast-notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-employee-dashboard',
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss']
})
export class EmployeeDashboardComponent implements OnInit {
  projects: any[] = [];
  employeeTasks: any[] = [];
  currentUserId: number | null = null;
  
  // Summary metrics
  totalProjects: number = 0;
  myProjects: number = 0;
  totalTasks: number = 0;
  totalTimeEntries: number = 0;
  
  // Recent data
  recentProjects: any[] = [];
  recentTasks: any[] = [];
  
  // Status dropdown tracking
  projectStatusDropdownOpen: number | null = null;
  taskStatusDropdownOpen: number | null = null;
  
  // Project status options
  projectStatusOptions = [
    { value: 'on-track', label: 'On Track' },
    { value: 'at-risk', label: 'At Risk' },
    { value: 'off-track', label: 'Off Track' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'maintenance', label: 'Maintenance' }
  ];
  
  // Task status options
  taskStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' }
  ];

  constructor(
    private adminService: AdminService,
    private notificationService: NotificationService,
    private toastService: ToastNotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getUserId();
    // Load time entries first to determine which projects employee has worked on
    this.loadTimeEntries();
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

  loadProjects() {
    this.adminService.getProjects().subscribe(projects => {
      // Show all projects (not filtered)
      this.projects = projects;
      this.totalProjects = projects.length;
      this.myProjects = projects.filter((p: any) => p.manager_id === this.currentUserId).length;
      
      // Get 5 most recent projects
      this.recentProjects = projects
        .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
        .slice(0, 5);
      
      // After projects load, load all tasks from all projects
      this.loadEmployeeTasks();
    });
  }

  loadEmployeeTasks() {
    if (!this.currentUserId || this.projects.length === 0) {
      this.employeeTasks = [];
      this.totalTasks = 0;
      this.recentTasks = [];
      return;
    }
    
    // Load all tasks from all projects (both assigned and not assigned)
    const allTasks: any[] = [];
    let loadedProjects = 0;
    const projectIdsArray = this.projects.map((p: any) => p.id);
    
    if (projectIdsArray.length === 0) {
      this.employeeTasks = [];
      this.totalTasks = 0;
      this.recentTasks = [];
      return;
    }
    
    projectIdsArray.forEach((projectId) => {
      this.adminService.getTasks(projectId).subscribe({
        next: (tasks) => {
          // Add all tasks from this project (assigned and not assigned)
          allTasks.push(...tasks);
          loadedProjects++;
          
          if (loadedProjects === projectIdsArray.length) {
            // Normalize status values and determine task type
            this.employeeTasks = allTasks.map((task: any) => {
              const isAssignedToEmployee = task.assigned_to === this.currentUserId;
              const isCreatedByEmployee = !task.assigned_by && task.assigned_to === this.currentUserId;
              
              let taskType = 'not_assigned';
              if (isAssignedToEmployee && task.assigned_by) {
                taskType = 'assigned_by_manager';
              } else if (isCreatedByEmployee) {
                taskType = 'created_by_employee';
              } else if (isAssignedToEmployee) {
                taskType = 'assigned';
              }
              
              return {
                ...task,
                status: task.status === 'in_progress' ? 'in-progress' : task.status,
                taskType: taskType
              };
            });
            
            this.totalTasks = this.employeeTasks.length;
            
            // Get 5 most recent tasks
            this.recentTasks = this.employeeTasks
              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
              .slice(0, 5);
          }
        },
        error: (err) => {
          console.error(`Error loading tasks for project ${projectId}:`, err);
          loadedProjects++;
          if (loadedProjects === projectIdsArray.length) {
            this.employeeTasks = allTasks.map((task: any) => ({
              ...task,
              status: task.status === 'in_progress' ? 'in-progress' : task.status,
              taskType: task.assigned_to === this.currentUserId ? 'assigned' : 'not_assigned'
            }));
            this.totalTasks = this.employeeTasks.length;
            this.recentTasks = this.employeeTasks
              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
              .slice(0, 5);
          }
        }
      });
    });
  }

  loadTimeEntries(): void {
    this.adminService.getTimeEntries().subscribe({
      next: (entries) => {
        this.totalTimeEntries = entries.length;
        
        // Load all projects (not filtered by worked projects)
        this.loadProjects();
      },
      error: (err) => {
        console.error('Error loading time entries:', err);
        this.totalTimeEntries = 0;
        // Still try to load projects even if time entries fail
        this.loadProjects();
      }
    });
  }

  // Format date for display (e.g., "12/26/2025")
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('on-track') || statusLower.includes('in_progress') || statusLower.includes('in-progress')) {
      return 'status-on-track';
    } else if (statusLower.includes('completed')) {
      return 'status-completed';
    } else if (statusLower.includes('on-hold') || statusLower.includes('on hold')) {
      return 'status-on-hold';
    } else if (statusLower.includes('maintenance')) {
      return 'status-maintenance';
    }
    return 'status-default';
  }

  getStatusDisplayName(status: string): string {
    if (!status) return 'On Track';
    const statusLower = status.toLowerCase();
    
    const projectStatus = this.projectStatusOptions.find(opt => opt.value === statusLower);
    if (projectStatus) return projectStatus.label;
    
    const taskStatus = this.taskStatusOptions.find(opt => opt.value === statusLower);
    if (taskStatus) return taskStatus.label;
    
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');
  }

  toggleProjectStatusDropdown(projectId: number, event: Event): void {
    event.stopPropagation();
    this.projectStatusDropdownOpen = this.projectStatusDropdownOpen === projectId ? null : projectId;
    this.taskStatusDropdownOpen = null; // Close task dropdown if open
  }

  toggleTaskStatusDropdown(taskId: number, event: Event): void {
    event.stopPropagation();
    this.taskStatusDropdownOpen = this.taskStatusDropdownOpen === taskId ? null : taskId;
    this.projectStatusDropdownOpen = null; // Close project dropdown if open
  }

  updateProjectStatus(project: any, newStatus: string): void {
    if (project.status === newStatus) {
      this.projectStatusDropdownOpen = null;
      return;
    }

    // Ensure name is present (required field)
    if (!project.name || (typeof project.name === 'string' && project.name.trim() === '')) {
      this.toastService.show('Project name is required', 'error');
      this.projectStatusDropdownOpen = null;
      return;
    }

    // Convert customer_id to number if it's a string
    let customerId: number | null = null;
    if (project.customer_id !== null && project.customer_id !== undefined && project.customer_id !== '') {
      customerId = typeof project.customer_id === 'string' ? parseInt(project.customer_id) : Number(project.customer_id);
      if (isNaN(customerId) || customerId <= 0) {
        customerId = null;
      }
    }

    // Prepare update data
    const updateData: any = {
      name: project.name,
      description: project.description || '',
      status: newStatus,
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: customerId,
      archived: project.archived === 1 || project.archived === true
    };

    // Include optional fields if they exist
    if (project.region) {
      updateData.region = project.region;
    }
    if (project.allocated_time) {
      updateData.allocated_time = project.allocated_time;
    }
    
    // Handle custom_fields
    let customFields = null;
    if (project.custom_fields !== null && project.custom_fields !== undefined) {
      if (typeof project.custom_fields === 'string' && project.custom_fields.trim() !== '') {
        try {
          customFields = JSON.parse(project.custom_fields);
        } catch (e) {
          customFields = null;
        }
      } else if (typeof project.custom_fields === 'object') {
        customFields = project.custom_fields;
      }
    }
    
    if (customFields && typeof customFields === 'object' && Object.keys(customFields).length > 0) {
      updateData.custom_fields = customFields;
    }

    this.adminService.updateProject(project.id, updateData).subscribe({
      next: () => {
        project.status = newStatus;
        this.projectStatusDropdownOpen = null;
        this.toastService.show(`Project status updated to ${this.getStatusDisplayName(newStatus)}`, 'success');
      },
      error: (err) => {
        console.error('Error updating project status:', err);
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to update project';
        this.toastService.show(`Failed to update project status: ${errorMessage}`, 'error');
        this.projectStatusDropdownOpen = null;
      }
    });
  }

  getTaskTypeLabel(task: any): string {
    if (task.taskType === 'assigned_by_manager') {
      return 'Assigned by Manager';
    } else if (task.taskType === 'created_by_employee') {
      return 'Created by Me';
    } else if (task.taskType === 'assigned') {
      return 'Assigned';
    } else if (task.taskType === 'not_assigned') {
      return 'Not Assigned';
    }
    return 'Not Assigned';
  }

  getTaskTypeClass(task: any): string {
    if (task.taskType === 'assigned_by_manager') {
      return 'task-type-assigned';
    } else if (task.taskType === 'created_by_employee') {
      return 'task-type-created';
    } else if (task.taskType === 'assigned') {
      return 'task-type-assigned';
    } else if (task.taskType === 'not_assigned') {
      return 'task-type-not-assigned';
    }
    return 'task-type-not-assigned';
  }

  updateTaskStatus(task: any, newStatus: string): void {
    // Normalize status for backend
    let normalizedStatus = newStatus;
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }

    if (task.status === normalizedStatus || task.status === newStatus) {
      this.taskStatusDropdownOpen = null;
      return;
    }

    // Ensure assigned_to is a number or null
    let assignedToValue: number | null = null;
    if (task.assigned_to) {
      assignedToValue = typeof task.assigned_to === 'string' ? parseInt(task.assigned_to) : Number(task.assigned_to);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }

    // Preserve due_date - ensure we send the existing value if it exists
    let dueDateValue = task.due_date;
    if (dueDateValue) {
      if (typeof dueDateValue === 'string') {
        if (dueDateValue.includes('T')) {
          dueDateValue = dueDateValue.split('T')[0];
        } else if (dueDateValue.includes(' ')) {
          dueDateValue = dueDateValue.split(' ')[0];
        }
      }
    }

    // Prepare update data with only required fields
    const updateData: any = {
      title: task.title,
      description: task.description || null,
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || null,
      due_date: dueDateValue || null
    };

    // Include optional fields if they exist
    if (task.allocated_time) {
      updateData.allocated_time = task.allocated_time;
    }

    this.adminService.updateTask(task.id, updateData).subscribe({
      next: () => {
        // Update local task status for immediate UI feedback
        task.status = normalizedStatus;
        this.taskStatusDropdownOpen = null;
        this.toastService.show(`Task status updated to ${this.getStatusDisplayName(newStatus)}`, 'success');
      },
      error: (err) => {
        console.error('Error updating task status:', err);
        const errorMessage = err?.error?.message || err?.message || 'Failed to update task status';
        this.toastService.show(`Failed to update task status: ${errorMessage}`, 'error');
        this.taskStatusDropdownOpen = null;
      }
    });
  }

  viewProjectDetails(project: any): void {
    // Navigate to projects page and open project details
    this.router.navigate(['/projects'], { 
      queryParams: { viewProject: project.id },
      state: { project: project }
    });
  }

  editProject(project: any): void {
    // Navigate to projects page and open edit modal
    this.router.navigate(['/projects'], { 
      queryParams: { editProject: project.id },
      state: { project: project }
    });
  }

  viewTaskDetails(task: any): void {
    // Navigate to projects page and open task details
    if (task.project_id) {
      this.router.navigate(['/projects'], { 
        queryParams: { viewTask: task.id, projectId: task.project_id },
        state: { task: task }
      });
    } else {
      this.router.navigate(['/projects']);
    }
  }

  editTask(task: any): void {
    // Navigate to projects page and open task edit
    if (task.project_id) {
      this.router.navigate(['/projects'], { 
        queryParams: { editTask: task.id, projectId: task.project_id },
        state: { task: task }
      });
    } else {
      this.router.navigate(['/projects']);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    // Close dropdowns when clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.status-dropdown-container')) {
      this.projectStatusDropdownOpen = null;
      this.taskStatusDropdownOpen = null;
    }
  }
}

