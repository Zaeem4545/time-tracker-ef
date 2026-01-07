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

  // Current admin info
  currentAdminId: number | null = null;
  currentAdminEmail: string | null = null;

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
    this.currentAdminId = this.authService.getUserId();
    this.currentAdminEmail = this.authService.getEmail();
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
        // Filter projects: created by admin OR assigned to admin (manager_id) OR all projects (since admin can create projects)
        // Since projects don't have created_by field, we show all projects for admin
        // But filter to show projects where admin is manager OR projects without a manager (likely created by admin)
        const adminProjects = projects.filter((project: any) => {
          // Check if project is assigned to admin (manager_id)
          const isAssignedToAdmin = project.manager_id === this.currentAdminId;
          
          // Check if project is created by admin (no manager assigned, likely created by admin)
          const isLikelyCreatedByAdmin = !project.manager_id || project.manager_id === null;
          
          // Also check if there's a created_by field (for backward compatibility)
          const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                    project.created_by === this.currentAdminId ||
                                    project.created_by_id === this.currentAdminId;
          
          return isCreatedByAdmin || isAssignedToAdmin || isLikelyCreatedByAdmin;
        });

        this.totalProjects = adminProjects.length;
        this.myProjects = adminProjects.filter((p: any) => p.manager_id === this.currentAdminId).length;
        
        // Get 5 most recent projects
        this.recentProjects = adminProjects
          .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
          .slice(0, 5);
      },
      error: (err) => {
        console.error('Error loading projects:', err);
      }
    });
  }

  loadTasks(): void {
    // First get admin's projects to filter tasks from
    this.adminService.getProjects().subscribe({
      next: (allProjects) => {
        // Filter projects: created by admin OR assigned to admin OR projects without manager (likely created by admin)
        const adminProjects = allProjects.filter((project: any) => {
          const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                    project.created_by === this.currentAdminId ||
                                    project.created_by_id === this.currentAdminId;
          const isAssignedToAdmin = project.manager_id === this.currentAdminId;
          const isLikelyCreatedByAdmin = !project.manager_id || project.manager_id === null;
          return isCreatedByAdmin || isAssignedToAdmin || isLikelyCreatedByAdmin;
        });

        if (adminProjects.length === 0) {
          this.totalTasks = 0;
          this.recentTasks = [];
          return;
        }

        const allTasks: any[] = [];
        let loadedProjects = 0;

        adminProjects.forEach((project: any) => {
          this.adminService.getTasks(project.id).subscribe({
            next: (tasks) => {
              // Filter tasks: created by admin OR assigned by admin OR assigned to admin
              const adminTasks = tasks.filter((task: any) => {
                const isCreatedByAdmin = task.created_by === this.currentAdminEmail || 
                                         task.created_by === this.currentAdminId ||
                                         task.created_by_id === this.currentAdminId;
                const isAssignedByAdmin = task.assigned_by === this.currentAdminEmail;
                const isAssignedToAdmin = task.assigned_to === this.currentAdminId;
                
                return isCreatedByAdmin || isAssignedByAdmin || isAssignedToAdmin;
              });

              allTasks.push(...adminTasks);
              loadedProjects++;
              
              if (loadedProjects === adminProjects.length) {
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
              if (loadedProjects === adminProjects.length) {
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
    // First get admin's projects to filter time entries
    this.adminService.getProjects().subscribe({
      next: (allProjects) => {
        // Filter projects: created by admin OR assigned to admin OR projects without manager (likely created by admin)
        const adminProjects = allProjects.filter((project: any) => {
          const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                    project.created_by === this.currentAdminId ||
                                    project.created_by_id === this.currentAdminId;
          const isAssignedToAdmin = project.manager_id === this.currentAdminId;
          const isLikelyCreatedByAdmin = !project.manager_id || project.manager_id === null;
          return isCreatedByAdmin || isAssignedToAdmin || isLikelyCreatedByAdmin;
        });

        const adminProjectIds = adminProjects.map((p: any) => p.id);

        // Get admin's tasks from those projects
        const adminTaskNames = new Set<string>();
        let loadedProjects = 0;

        if (adminProjectIds.length === 0) {
          // No admin projects, so only show entries where admin logged time
          this.adminService.getTimeEntries().subscribe({
            next: (entries) => {
              const adminTimeEntries = entries.filter((entry: any) => {
                return entry.user_id === this.currentAdminId;
              });
              this.totalTimeEntries = adminTimeEntries.length || 0;
            },
            error: (err) => {
              console.error('Error loading time entries:', err);
              this.totalTimeEntries = 0;
            }
          });
          return;
        }

        adminProjects.forEach((project: any) => {
          this.adminService.getTasks(project.id).subscribe({
            next: (tasks) => {
              // Filter tasks: created by admin OR assigned by admin OR assigned to admin
              const adminTasks = tasks.filter((task: any) => {
                const isCreatedByAdmin = task.created_by === this.currentAdminEmail || 
                                         task.created_by === this.currentAdminId ||
                                         task.created_by_id === this.currentAdminId;
                const isAssignedByAdmin = task.assigned_by === this.currentAdminEmail;
                const isAssignedToAdmin = task.assigned_to === this.currentAdminId;
                return isCreatedByAdmin || isAssignedByAdmin || isAssignedToAdmin;
              });

              adminTasks.forEach((task: any) => {
                if (task.title) {
                  adminTaskNames.add(task.title);
                }
              });

              loadedProjects++;
              
              if (loadedProjects === adminProjects.length) {
                // Now filter time entries
                this.adminService.getTimeEntries().subscribe({
                  next: (entries) => {
                    // Filter time entries:
                    // 1. Worked by admin (user_id === adminId)
                    // 2. For admin's projects
                    // 3. For admin's tasks
                    const adminTimeEntries = entries.filter((entry: any) => {
                      // Worked by admin
                      if (entry.user_id === this.currentAdminId) {
                        return true;
                      }
                      
                      // For admin's projects
                      if (adminProjectIds.includes(entry.project_id)) {
                        // If task name matches admin's tasks, include it
                        if (entry.task_name && adminTaskNames.has(entry.task_name)) {
                          return true;
                        }
                        // If no task name but it's admin's project, include it
                        if (!entry.task_name) {
                          return true;
                        }
                      }
                      
                      return false;
                    });
                    
                    this.totalTimeEntries = adminTimeEntries.length || 0;
                  },
                  error: (err) => {
                    console.error('Error loading time entries:', err);
                    this.totalTimeEntries = 0;
                  }
                });
              }
            },
            error: (err) => {
              console.error(`Error loading tasks for project ${project.id}:`, err);
              loadedProjects++;
              if (loadedProjects === adminProjects.length) {
                // Still filter time entries even if some tasks failed to load
                this.adminService.getTimeEntries().subscribe({
                  next: (entries) => {
                    const adminTimeEntries = entries.filter((entry: any) => {
                      if (entry.user_id === this.currentAdminId) {
                        return true;
                      }
                      if (adminProjectIds.includes(entry.project_id)) {
                        if (entry.task_name && adminTaskNames.has(entry.task_name)) {
                          return true;
                        }
                        if (!entry.task_name) {
                          return true;
                        }
                      }
                      return false;
                    });
                    this.totalTimeEntries = adminTimeEntries.length || 0;
                  },
                  error: (err) => {
                    console.error('Error loading time entries:', err);
                    this.totalTimeEntries = 0;
                  }
                });
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Error loading projects for time entries:', err);
        // Fallback: only show entries where admin logged time
        this.adminService.getTimeEntries().subscribe({
          next: (entries) => {
            const adminTimeEntries = entries.filter((entry: any) => {
              return entry.user_id === this.currentAdminId;
            });
            this.totalTimeEntries = adminTimeEntries.length || 0;
          },
          error: (err2) => {
            console.error('Error loading time entries:', err2);
            this.totalTimeEntries = 0;
          }
        });
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
