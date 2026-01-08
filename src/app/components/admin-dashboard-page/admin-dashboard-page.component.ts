import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
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
  
  // All data for modals
  allProjects: any[] = [];
  allTasks: any[] = [];
  allTimeEntries: any[] = [];
  
  // Modal states
  showProjectsModal: boolean = false;
  showTasksModal: boolean = false;
  showTimeEntriesModal: boolean = false;

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
    private authService: AuthService,
    private router: Router
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
    // First get time entries to find projects admin has worked on
    this.adminService.getTimeEntries().subscribe({
      next: (timeEntries) => {
        // Get project IDs where admin has logged time
        const workedOnProjectIds = new Set<number>();
        timeEntries.forEach((entry: any) => {
          if (entry.user_id === this.currentAdminId && entry.project_id) {
            workedOnProjectIds.add(entry.project_id);
          }
        });

        // Now get all projects and filter
        this.adminService.getProjects().subscribe({
          next: (projects) => {
            // Filter projects: Show projects where admin is manager, head manager, created, OR worked on
            const adminProjects = projects.filter((project: any) => {
              // Check if project is assigned to this admin (manager_id)
              const isAssignedToAdmin = project.manager_id === this.currentAdminId;
              
              // Check if project has head_manager_id and it matches this admin
              const isHeadManager = project.head_manager_id === this.currentAdminId;
              
              // Check if there's a created_by field (for backward compatibility)
              const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                        project.created_by === this.currentAdminId ||
                                        project.created_by_id === this.currentAdminId;
              
              // Check if admin has worked on this project (logged time entries)
              const hasWorkedOn = workedOnProjectIds.has(project.id);
              
              // Show projects where admin is assigned, created, or worked on
              return isAssignedToAdmin || isHeadManager || isCreatedByAdmin || hasWorkedOn;
            });

            // Store all projects for modal
            this.allProjects = adminProjects;
            
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
      },
      error: (err) => {
        console.error('Error loading time entries for projects:', err);
        // Fallback: just load projects without time entry check
        this.adminService.getProjects().subscribe({
          next: (projects) => {
            const adminProjects = projects.filter((project: any) => {
              const isAssignedToAdmin = project.manager_id === this.currentAdminId;
              const isHeadManager = project.head_manager_id === this.currentAdminId;
              const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                        project.created_by === this.currentAdminId ||
                                        project.created_by_id === this.currentAdminId;
              return isAssignedToAdmin || isHeadManager || isCreatedByAdmin;
            });
            this.totalProjects = adminProjects.length;
            this.myProjects = adminProjects.filter((p: any) => p.manager_id === this.currentAdminId).length;
            this.recentProjects = adminProjects
              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
              .slice(0, 5);
          },
          error: (err2) => {
            console.error('Error loading projects:', err2);
          }
        });
      }
    });
  }

  loadTasks(): void {
    // First get time entries to find tasks admin has worked on
    this.adminService.getTimeEntries().subscribe({
      next: (timeEntries) => {
        // Get project IDs and task names where admin has logged time
        const workedOnProjectIds = new Set<number>();
        const workedOnTaskNames = new Set<string>();
        timeEntries.forEach((entry: any) => {
          if (entry.user_id === this.currentAdminId) {
            if (entry.project_id) {
              workedOnProjectIds.add(entry.project_id);
            }
            if (entry.task_name) {
              workedOnTaskNames.add(entry.task_name);
            }
          }
        });

        // Now get admin's projects to filter tasks from
        this.adminService.getProjects().subscribe({
          next: (allProjects) => {
            // Filter projects: Show projects where admin is manager, head manager, created, OR worked on
            const adminProjects = allProjects.filter((project: any) => {
              const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                        project.created_by === this.currentAdminId ||
                                        project.created_by_id === this.currentAdminId;
              const isAssignedToAdmin = project.manager_id === this.currentAdminId;
              const isHeadManager = project.head_manager_id === this.currentAdminId;
              const hasWorkedOn = workedOnProjectIds.has(project.id);
              // Show projects where admin is assigned, created, or worked on
              return isCreatedByAdmin || isAssignedToAdmin || isHeadManager || hasWorkedOn;
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
              // Filter tasks: created by admin OR assigned by admin OR assigned to admin OR worked on by admin
              const adminTasks = tasks.filter((task: any) => {
                const isCreatedByAdmin = task.created_by === this.currentAdminEmail || 
                                         task.created_by === this.currentAdminId ||
                                         task.created_by_id === this.currentAdminId;
                const isAssignedByAdmin = task.assigned_by === this.currentAdminEmail;
                const isAssignedToAdmin = task.assigned_to === this.currentAdminId;
                // Check if admin has worked on this task (logged time for this task)
                const hasWorkedOn = task.title && workedOnTaskNames.has(task.title);
                
                return isCreatedByAdmin || isAssignedByAdmin || isAssignedToAdmin || hasWorkedOn;
              });

              allTasks.push(...adminTasks);
              loadedProjects++;
              
              if (loadedProjects === adminProjects.length) {
                // Store all tasks for modal
                this.allTasks = allTasks;
                
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
      },
      error: (err) => {
        console.error('Error loading time entries for tasks:', err);
        // Fallback: load tasks without time entry check
        this.adminService.getProjects().subscribe({
          next: (allProjects) => {
            const adminProjects = allProjects.filter((project: any) => {
              const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                        project.created_by === this.currentAdminId ||
                                        project.created_by_id === this.currentAdminId;
              const isAssignedToAdmin = project.manager_id === this.currentAdminId;
              const isHeadManager = project.head_manager_id === this.currentAdminId;
              return isCreatedByAdmin || isAssignedToAdmin || isHeadManager;
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
          error: (err2) => {
            console.error('Error loading projects for tasks:', err2);
          }
        });
      }
    });
  }

  loadTimeEntries(): void {
    // First get admin's projects to filter time entries
    this.adminService.getProjects().subscribe({
      next: (allProjects) => {
        // Filter projects: Only show projects where this admin is the manager or head manager
        const adminProjects = allProjects.filter((project: any) => {
          const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                    project.created_by === this.currentAdminId ||
                                    project.created_by_id === this.currentAdminId;
          const isAssignedToAdmin = project.manager_id === this.currentAdminId;
          const isHeadManager = project.head_manager_id === this.currentAdminId;
          // Only show projects where admin is explicitly assigned or created
          return isCreatedByAdmin || isAssignedToAdmin || isHeadManager;
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
              // Store all time entries for modal
              this.allTimeEntries = adminTimeEntries;
              this.totalTimeEntries = adminTimeEntries.length || 0;
            },
            error: (err) => {
              console.error('Error loading time entries:', err);
              this.allTimeEntries = [];
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
                    
                    // Store all time entries for modal, sorted by date (newest first)
                    this.allTimeEntries = adminTimeEntries.sort((a: any, b: any) => {
                      const dateA = new Date(a.date || a.entry_date || a.start_time || 0).getTime();
                      const dateB = new Date(b.date || b.entry_date || b.start_time || 0).getTime();
                      return dateB - dateA; // Newest first
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
                    // Store all time entries for modal, sorted by date (newest first)
                    this.allTimeEntries = adminTimeEntries.sort((a: any, b: any) => {
                      const dateA = new Date(a.date || a.entry_date || a.start_time || 0).getTime();
                      const dateB = new Date(b.date || b.entry_date || b.start_time || 0).getTime();
                      return dateB - dateA; // Newest first
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
            // Store all time entries for modal, sorted by date (newest first)
            this.allTimeEntries = adminTimeEntries.sort((a: any, b: any) => {
              const dateA = new Date(a.date || a.entry_date || a.start_time || 0).getTime();
              const dateB = new Date(b.date || b.entry_date || b.start_time || 0).getTime();
              return dateB - dateA; // Newest first
            });
            this.totalTimeEntries = adminTimeEntries.length || 0;
          },
          error: (err2) => {
            console.error('Error loading time entries:', err2);
            this.allTimeEntries = [];
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

  calculateTimeSpent(entry: any): string {
    // Calculate time from start_time and end_time (most accurate)
    if (entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const diffMs = end.getTime() - start.getTime();
        const seconds = Math.floor(diffMs / 1000);
        return this.formatTimeFromSeconds(seconds);
      }
    }
    
    // Fallback: use total_time (stored in minutes) if available
    if (entry.total_time !== null && entry.total_time !== undefined) {
      const seconds = entry.total_time * 60;
      return this.formatTimeFromSeconds(seconds);
    }
    
    // Fallback: use time_spent if it's already in HH:MM:SS format
    if (entry.time_spent && entry.time_spent !== '00:00:00') {
      return entry.time_spent;
    }
    
    return '00:00:00';
  }

  formatTimeFromSeconds(seconds: number): string {
    if (!seconds || seconds === 0) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  getWorkedBy(entry: any): string {
    if (entry.employee_name) {
      return entry.employee_name;
    }
    if (entry.employee_email) {
      return entry.employee_email;
    }
    if (entry.user_name) {
      return entry.user_name;
    }
    if (entry.user_email) {
      return entry.user_email;
    }
    return 'Unknown';
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

  // Modal methods
  openProjectsModal(): void {
    console.log('Opening projects modal, total projects:', this.allProjects.length);
    this.showProjectsModal = true;
  }

  closeProjectsModal(): void {
    this.showProjectsModal = false;
  }

  openTasksModal(): void {
    console.log('Opening tasks modal, total tasks:', this.allTasks.length);
    this.showTasksModal = true;
  }

  closeTasksModal(): void {
    this.showTasksModal = false;
  }

  openTimeEntriesModal(): void {
    console.log('Opening time entries modal, total entries:', this.allTimeEntries.length);
    this.showTimeEntriesModal = true;
  }

  closeTimeEntriesModal(): void {
    this.showTimeEntriesModal = false;
  }
}
