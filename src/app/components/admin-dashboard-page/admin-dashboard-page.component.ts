import { Component, OnInit, HostListener } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-dashboard-page',
  templateUrl: './admin-dashboard-page.component.html',
  styleUrls: ['./admin-dashboard-page.component.scss']
})
export class AdminDashboardPageComponent implements OnInit {
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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loadProjects();
    this.loadTasks();
    this.loadTimeEntries();
  }

  loadProjects(): void {
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        this.totalProjects = projects.length;
        this.myProjects = 0; // Admin sees all projects, so "My Projects" is 0 or could be total
        // Get 5 most recent projects
        this.recentProjects = projects
          .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
          .slice(0, 5);
      },
      error: (err) => {
        console.error('Error loading projects:', err);
      }
    });
  }

  loadTasks(): void {
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const allTasks: any[] = [];
        let loadedProjects = 0;

        if (projects.length === 0) {
          this.totalTasks = 0;
          this.recentTasks = [];
          return;
        }

        projects.forEach((project: any) => {
          this.adminService.getTasks(project.id).subscribe({
            next: (tasks) => {
              allTasks.push(...tasks);
              loadedProjects++;
              if (loadedProjects === projects.length) {
                this.totalTasks = allTasks.length;
                // Get 5 most recent tasks
                this.recentTasks = allTasks
                  .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                  .slice(0, 5);
              }
            },
            error: (err) => {
              console.error(`Error loading tasks for project ${project.id}:`, err);
              loadedProjects++;
              if (loadedProjects === projects.length) {
                this.totalTasks = allTasks.length;
                this.recentTasks = allTasks
                  .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                  .slice(0, 5);
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Error loading projects for tasks:', err);
      }
    });
  }

  loadTimeEntries(): void {
    this.adminService.getTimeEntries().subscribe({
      next: (entries) => {
        this.totalTimeEntries = entries.length || 0;
      },
      error: (err) => {
        console.error('Error loading time entries:', err);
        this.totalTimeEntries = 0;
      }
    });
  }

  formatDate(date: string | null): string {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-on-track';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('completed')) {
      return 'status-completed';
    } else if (statusLower.includes('at-risk')) {
      return 'status-at-risk';
    } else if (statusLower.includes('off-track')) {
      return 'status-off-track';
    } else if (statusLower.includes('on-hold')) {
      return 'status-on-hold';
    } else if (statusLower.includes('in-progress')) {
      return 'status-in-progress';
    } else if (statusLower.includes('pending')) {
      return 'status-pending';
    } else if (statusLower.includes('maintenance')) {
      return 'status-maintenance';
    }
    return 'status-on-track';
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
  }

  toggleTaskStatusDropdown(taskId: number, event: Event): void {
    event.stopPropagation();
    this.taskStatusDropdownOpen = this.taskStatusDropdownOpen === taskId ? null : taskId;
  }

  updateProjectStatus(project: any, newStatus: string): void {
    const updateData = {
      name: project.name,
      description: project.description || '',
      status: newStatus,
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      region: project.region || null,
      allocated_time: project.allocated_time || null,
      archived: project.archived || 0
    };

    this.adminService.updateProject(project.id, updateData).subscribe({
      next: () => {
        project.status = newStatus;
        this.projectStatusDropdownOpen = null;
      },
      error: (err) => {
        console.error('Error updating project status:', err);
      }
    });
  }

  updateTaskStatus(task: any, newStatus: string): void {
    const updateData = {
      title: task.title,
      description: task.description || '',
      status: newStatus,
      due_date: task.due_date || null,
      project_id: task.project_id,
      assigned_to: task.assigned_to || null,
      assigned_by: task.assigned_by || null
    };

    this.adminService.updateTask(task.id, updateData).subscribe({
      next: () => {
        task.status = newStatus;
        this.taskStatusDropdownOpen = null;
      },
      error: (err) => {
        console.error('Error updating task status:', err);
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('.status-dropdown-container')) {
      this.projectStatusDropdownOpen = null;
      this.taskStatusDropdownOpen = null;
    }
  }
}
