import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { NotificationService } from '../../services/notification.service';
import { ToastNotificationService } from '../../services/toast-notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-head-manager-dashboard',
  templateUrl: './head-manager-dashboard.component.html',
  styleUrls: ['./head-manager-dashboard.component.scss']
})
export class HeadManagerDashboardComponent implements OnInit {
  private currentUserId: number | null = null;
  private currentUserEmail: string | null = null;
  users: any[] = [];

  // Dashboard properties
  totalProjects: number = 0;
  myProjects: number = 0;
  totalTasks: number = 0;
  totalTimeEntries: number = 0;
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
  
  // Track projects and tasks worked on by head manager
  workedOnProjectIds: Set<number> = new Set();
  workedOnTaskNames: Set<string> = new Set();
  adminEmails: Set<string> = new Set();

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
    // Get current user ID
    this.currentUserId = this.authService.getUserId();
    this.currentUserEmail = this.authService.getEmail();
    
    // Load dashboard data
    this.loadDashboardData();
    // Check for notifications when dashboard loads
    this.checkForNewNotifications();
    
    // Load customers and managers for edit modals
    this.loadCustomers();
    this.loadManagers();
    this.loadUsers();
  }
  
  loadCustomers(): void {
    this.adminService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers || [];
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.customers = [];
      }
    });
  }
  
  loadManagers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users || [];
        this.managers = users.filter((user: any) => 
          user.role && user.role.toLowerCase() === 'manager'
        );
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.managers = [];
      }
    });
  }

  loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users || [];
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.users = [];
      }
    });
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

  // Dashboard methods
  loadDashboardData(): void {
    // First load admin emails
    this.loadAdminEmails();
    // Then load time entries to get worked-on projects and tasks
    this.loadTimeEntries();
    // Then load projects and tasks (they will use the worked-on data)
    this.loadProjects();
    this.loadTasks();
  }
  
  loadAdminEmails(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        // Filter admin users and collect their emails
        const admins = users.filter((user: any) => user.role?.toLowerCase() === 'admin');
        this.adminEmails = new Set(admins.map((admin: any) => admin.email?.toLowerCase()));
      },
      error: (err) => {
        console.error('Error loading admin emails:', err);
      }
    });
  }

  loadProjects(): void {
    const headManagerEmail = this.authService.getEmail();
    
    // Get selected projects (projects selected by this head manager)
    this.adminService.getSelectedProjects().subscribe({
      next: (selectedProjects) => {
        // Also get all projects to check for projects assigned by admin or created by head manager
        this.adminService.getProjects().subscribe({
          next: (allProjects) => {
            // Filter projects: 
            // 1. Selected by head manager
            // 2. Assigned to head manager (manager_id matches)
            // 3. Created by head manager (selected_by_head_manager_id matches)
            // 4. Worked on by head manager (from time entries)
            // 5. Recently created projects (within last 7 days) that aren't selected by any head manager
            const relevantProjects = allProjects.filter((project: any) => {
              // Check if project is selected by this head manager
              const isSelected = selectedProjects.some((sp: any) => sp.id === project.id);
              // Check if project is assigned to this head manager (assigned by admin)
              const isAssigned = project.manager_id === this.currentUserId;
              // Check if project was created by this head manager
              const isCreatedByHeadManager = project.selected_by_head_manager_id === this.currentUserId;
              // Check if project was worked on by head manager (from time entries)
              const isWorkedOn = this.workedOnProjectIds.has(project.id);
              // Check if project was recently created (within last 7 days) and not selected by any head manager
              // This helps catch projects created by this head manager before auto-selection was implemented
              let isRecentlyCreatedUnselected = false;
              if (project.created_at && !project.selected_by_head_manager_id) {
                const createdDate = new Date(project.created_at);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                isRecentlyCreatedUnselected = createdDate >= sevenDaysAgo;
              }
              
              return isSelected || isAssigned || isCreatedByHeadManager || isWorkedOn || isRecentlyCreatedUnselected;
            });
            
            this.totalProjects = relevantProjects.length;
            this.myProjects = relevantProjects.filter((p: any) => p.manager_id === this.currentUserId).length;
            
            // Get 5 most recent projects
            this.recentProjects = relevantProjects
              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
              .slice(0, 5);
          },
          error: (err) => {
            console.error('Error loading all projects:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error loading selected projects:', err);
        // Fallback: load all projects if getSelectedProjects fails
        this.adminService.getProjects().subscribe({
          next: (projects) => {
            // Filter to include projects created by head manager, assigned to them, or worked on by them
            const relevantProjects = projects.filter((project: any) => {
              const isAssigned = project.manager_id === this.currentUserId;
              const isCreatedByHeadManager = project.selected_by_head_manager_id === this.currentUserId;
              const isWorkedOn = this.workedOnProjectIds.has(project.id);
              const hasManagerAssigned = project.manager_id !== null && project.manager_id !== undefined;
              return isAssigned || isCreatedByHeadManager || isWorkedOn || hasManagerAssigned;
            });
            
            this.totalProjects = relevantProjects.length;
            this.myProjects = relevantProjects.filter((p: any) => p.manager_id === this.currentUserId).length;
            this.recentProjects = relevantProjects
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
    const headManagerEmail = this.authService.getEmail();
    
    // Get selected projects first
    this.adminService.getSelectedProjects().subscribe({
      next: (selectedProjects) => {
        // Also get all projects to check for projects assigned by admin or created by head manager
        this.adminService.getProjects().subscribe({
          next: (allProjects) => {
            // Filter projects: selected by head manager OR assigned to head manager by admin OR created by head manager
            const relevantProjects = allProjects.filter((project: any) => {
              const isSelected = selectedProjects.some((sp: any) => sp.id === project.id);
              const isAssigned = project.manager_id === this.currentUserId;
              const isCreatedByHeadManager = project.selected_by_head_manager_id === this.currentUserId;
              return isSelected || isAssigned || isCreatedByHeadManager;
            });

            const allTasks: any[] = [];
            const taskMap = new Map<number, any>(); // Use Map to avoid duplicates
            let loadedProjects = 0;

            // Load tasks from relevant projects
            if (relevantProjects.length === 0) {
              // If no relevant projects, still check all projects for tasks created by head manager, worked on by head manager, or assigned by admin
              allProjects.forEach((project: any) => {
                this.adminService.getTasks(project.id).subscribe({
                  next: (tasks) => {
                    // Filter tasks: created by head manager, worked on by head manager, or assigned by admin
                    tasks.forEach((task: any) => {
                      const isCreatedByHeadManager = task.assigned_by?.toLowerCase() === headManagerEmail?.toLowerCase();
                      const isWorkedOn = this.workedOnTaskNames.has(task.title?.toLowerCase());
                      const isAssignedByAdmin = task.assigned_by && this.adminEmails.has(task.assigned_by.toLowerCase());
                      
                      if (isCreatedByHeadManager || isWorkedOn || isAssignedByAdmin) {
                        taskMap.set(task.id, task);
                      }
                    });
                    loadedProjects++;
                    
                    if (loadedProjects === allProjects.length) {
                      this.totalTasks = taskMap.size;
                      this.recentTasks = Array.from(taskMap.values())
                        .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                        .slice(0, 5);
                    }
                  },
                  error: (err) => {
                    console.error(`Error loading tasks for project ${project.id}:`, err);
                    loadedProjects++;
                    if (loadedProjects === allProjects.length) {
                      this.totalTasks = taskMap.size;
                      this.recentTasks = Array.from(taskMap.values())
                        .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                        .slice(0, 5);
                    }
                  }
                });
              });
              return;
            }

            relevantProjects.forEach((project: any) => {
              this.adminService.getTasks(project.id).subscribe({
                next: (tasks) => {
                  // Include all tasks from relevant projects (since the project itself is relevant)
                  tasks.forEach((task: any) => {
                    taskMap.set(task.id, task);
                  });
                  loadedProjects++;
                  
                  if (loadedProjects === relevantProjects.length) {
                    // Also check all other projects for tasks created by head manager, worked on by head manager, or assigned by admin
                    const otherProjects = allProjects.filter((p: any) => !relevantProjects.some((rp: any) => rp.id === p.id));
                    let otherProjectsLoaded = 0;
                    
                    if (otherProjects.length === 0) {
                      this.totalTasks = taskMap.size;
                      this.recentTasks = Array.from(taskMap.values())
                        .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                        .slice(0, 5);
                      return;
                    }
                    
                    otherProjects.forEach((project: any) => {
                      this.adminService.getTasks(project.id).subscribe({
                        next: (tasks) => {
                          // Add tasks created by head manager, worked on by head manager, or assigned by admin
                          tasks.forEach((task: any) => {
                            const isCreatedByHeadManager = task.assigned_by?.toLowerCase() === headManagerEmail?.toLowerCase();
                            const isWorkedOn = this.workedOnTaskNames.has(task.title?.toLowerCase());
                            const isAssignedByAdmin = task.assigned_by && this.adminEmails.has(task.assigned_by.toLowerCase());
                            
                            if (isCreatedByHeadManager || isWorkedOn || isAssignedByAdmin) {
                              taskMap.set(task.id, task);
                            }
                          });
                          otherProjectsLoaded++;
                          
                          if (otherProjectsLoaded === otherProjects.length) {
                            this.totalTasks = taskMap.size;
                            this.recentTasks = Array.from(taskMap.values())
                              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                              .slice(0, 5);
                          }
                        },
                        error: (err) => {
                          console.error(`Error loading tasks for project ${project.id}:`, err);
                          otherProjectsLoaded++;
                          if (otherProjectsLoaded === otherProjects.length) {
                            this.totalTasks = taskMap.size;
                            this.recentTasks = Array.from(taskMap.values())
                              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                              .slice(0, 5);
                          }
                        }
                      });
                    });
                  }
                },
                error: (err) => {
                  console.error(`Error loading tasks for project ${project.id}:`, err);
                  loadedProjects++;
                  if (loadedProjects === relevantProjects.length) {
                    this.totalTasks = taskMap.size;
                    this.recentTasks = Array.from(taskMap.values())
                      .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                      .slice(0, 5);
                  }
                }
              });
            });
          },
          error: (err) => {
            console.error('Error loading all projects:', err);
          }
        });
      },
      error: (err) => {
        console.error('Error loading selected projects:', err);
        // Fallback: load tasks from all projects, filter for tasks created by head manager
        this.adminService.getProjects().subscribe({
          next: (projects) => {
            // Filter to include projects created by head manager or assigned to them
            const relevantProjects = projects.filter((project: any) => {
              const isAssigned = project.manager_id === this.currentUserId;
              const isCreatedByHeadManager = project.selected_by_head_manager_id === this.currentUserId;
              return isAssigned || isCreatedByHeadManager;
            });
            
            const allTasks: any[] = [];
            const taskMap = new Map<number, any>();
            let loadedProjects = 0;

            if (relevantProjects.length === 0) {
              this.totalTasks = 0;
              this.recentTasks = [];
              return;
            }

            relevantProjects.forEach((project: any) => {
              this.adminService.getTasks(project.id).subscribe({
                next: (tasks) => {
                  tasks.forEach((task: any) => {
                    taskMap.set(task.id, task);
                  });
                  loadedProjects++;
                  
                  if (loadedProjects === relevantProjects.length) {
                    this.totalTasks = taskMap.size;
                    this.recentTasks = Array.from(taskMap.values())
                      .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
                      .slice(0, 5);
                  }
                },
                error: (err2) => {
                  console.error(`Error loading tasks for project ${project.id}:`, err2);
                  loadedProjects++;
                  if (loadedProjects === relevantProjects.length) {
                    this.totalTasks = taskMap.size;
                    this.recentTasks = Array.from(taskMap.values())
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
    this.adminService.getTimeEntries().subscribe({
      next: (entries) => {
        // Filter to only show time entries created by or worked on by this head manager
        const headManagerEntries = entries.filter((entry: any) => {
          // Check if the time entry was created/worked on by this head manager
          return entry.user_id === this.currentUserId;
        });
        
        // Collect project IDs and task names that head manager worked on
        headManagerEntries.forEach((entry: any) => {
          if (entry.project_id) {
            this.workedOnProjectIds.add(entry.project_id);
          }
          if (entry.task_name) {
            this.workedOnTaskNames.add(entry.task_name.toLowerCase());
          }
        });
        
        // Store all time entries for modal, sorted by date (newest first)
        this.allTimeEntries = headManagerEntries.sort((a: any, b: any) => {
          const dateA = new Date(a.date || a.entry_date || a.start_time || 0).getTime();
          const dateB = new Date(b.date || b.entry_date || b.start_time || 0).getTime();
          return dateB - dateA; // Newest first
        });
        this.totalTimeEntries = headManagerEntries.length;
      },
      error: (err) => {
        console.error('Error loading time entries:', err);
      }
    });
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
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
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('on-track') || statusLower.includes('in_progress') || statusLower.includes('in-progress')) {
      return 'status-on-track';
    } else if (statusLower.includes('completed')) {
      return 'status-completed';
    } else if (statusLower.includes('on-hold') || statusLower.includes('on hold')) {
      return 'status-on-hold';
    } else if (statusLower.includes('pending')) {
      return 'status-pending';
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

    // Prepare update data
    const updateData: any = {
      title: task.title,
      description: task.description || null,
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || null,
      due_date: task.due_date || null
    };

    // Include optional fields if they exist
    if (task.allocated_time) {
      updateData.allocated_time = task.allocated_time;
    }

    this.adminService.updateTask(task.id, updateData).subscribe({
      next: () => {
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

  // Modal states
  showProjectDetailsModal: boolean = false;
  selectedProjectForDetails: any | null = null;
  showTaskDetailsModal: boolean = false;
  selectedTaskForDetails: any | null = null;
  showEditProjectModal: boolean = false;
  selectedProjectForEdit: any | null = null;
  showEditTaskModal: boolean = false;
  selectedTaskForEdit: any | null = null;
  
  // Edit form data
  editProjectData: any = {};
  editTaskData: any = {};
  editProjectError: string = '';
  editTaskError: string = '';
  selectedAttachmentFile: File | null = null;
  
  // Dropdown options
  customers: any[] = [];
  managers: any[] = [];
  
  // Comments
  projectComments: any[] = [];
  taskComments: any[] = [];
  newProjectComment: string = '';
  newTaskComment: string = '';
  loadingProjectComments: boolean = false;
  loadingTaskComments: boolean = false;
  editingProjectCommentId: number | null = null;
  editingTaskCommentId: number | null = null;
  editingProjectCommentText: string = '';
  editingTaskCommentText: string = '';
  
  // History modals
  showProjectHistoryModal: boolean = false;
  showTaskHistoryModalForTask: boolean = false;
  projectHistory: any[] = [];
  taskHistory: any[] = [];
  loadingProjectHistory: boolean = false;
  loadingTaskHistory: boolean = false;
  selectedTaskForHistory: any | null = null;

  viewProjectDetails(project: any): void {
    // Load full project details and open modal
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const fullProject = projects.find((p: any) => p.id === project.id);
        if (fullProject) {
          this.selectedProjectForDetails = fullProject;
          this.showProjectDetailsModal = true;
          this.loadProjectComments(fullProject.id);
        } else {
          this.selectedProjectForDetails = project;
          this.showProjectDetailsModal = true;
          this.loadProjectComments(project.id);
        }
      },
      error: (err) => {
        console.error('Error loading project details:', err);
        this.selectedProjectForDetails = project;
        this.showProjectDetailsModal = true;
        this.loadProjectComments(project.id);
      }
    });
  }

  closeProjectDetailsModal(): void {
    this.showProjectDetailsModal = false;
    this.selectedProjectForDetails = null;
    this.projectComments = [];
    this.newProjectComment = '';
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
  }
  
  loadProjectComments(projectId: number): void {
    this.loadingProjectComments = true;
    this.adminService.getProjectComments(projectId).subscribe({
      next: (response: any) => {
        this.projectComments = response.comments || [];
        this.loadingProjectComments = false;
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.projectComments = [];
        this.loadingProjectComments = false;
      }
    });
  }
  
  addProjectComment(): void {
    if (!this.selectedProjectForDetails || !this.newProjectComment.trim()) return;
    
    this.loadingProjectComments = true;
    this.adminService.createProjectComment(this.selectedProjectForDetails.id, this.newProjectComment.trim()).subscribe({
      next: () => {
        this.newProjectComment = '';
        this.loadProjectComments(this.selectedProjectForDetails!.id);
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        this.loadingProjectComments = false;
        this.toastService.show('Failed to add comment', 'error');
      }
    });
  }
  
  startEditingProjectComment(comment: any): void {
    this.editingProjectCommentId = comment.id;
    this.editingProjectCommentText = comment.comment;
  }
  
  cancelEditingProjectComment(): void {
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
  }
  
  saveProjectComment(comment: any): void {
    if (!this.selectedProjectForDetails || !this.editingProjectCommentText.trim()) return;
    
    this.adminService.updateProjectComment(this.selectedProjectForDetails.id, comment.id, this.editingProjectCommentText.trim()).subscribe({
      next: () => {
        this.editingProjectCommentId = null;
        this.editingProjectCommentText = '';
        this.loadProjectComments(this.selectedProjectForDetails!.id);
      },
      error: (err) => {
        console.error('Error updating comment:', err);
        this.toastService.show('Failed to update comment', 'error');
      }
    });
  }
  
  deleteProjectComment(comment: any): void {
    if (!this.selectedProjectForDetails) return;
    
    if (confirm('Are you sure you want to delete this comment?')) {
      this.adminService.deleteProjectComment(this.selectedProjectForDetails.id, comment.id).subscribe({
        next: () => {
          this.loadProjectComments(this.selectedProjectForDetails!.id);
        },
        error: (err) => {
          console.error('Error deleting comment:', err);
          this.toastService.show('Failed to delete comment', 'error');
        }
      });
    }
  }
  
  isOwnProjectComment(comment: any): boolean {
    const currentUserEmail = this.authService.getEmail();
    return comment.user_email === currentUserEmail;
  }
  
  openProjectHistoryModal(): void {
    if (!this.selectedProjectForDetails) return;
    this.loadProjectHistory(this.selectedProjectForDetails.id);
    this.showProjectHistoryModal = true;
  }
  
  closeProjectHistoryModal(): void {
    this.showProjectHistoryModal = false;
    this.projectHistory = [];
  }
  
  loadProjectHistory(projectId: number): void {
    this.loadingProjectHistory = true;
    this.adminService.getProjectHistory(projectId).subscribe({
      next: (response: any) => {
        this.projectHistory = response.history || [];
        this.loadingProjectHistory = false;
      },
      error: (err) => {
        console.error('Error loading project history:', err);
        this.projectHistory = [];
        this.loadingProjectHistory = false;
      }
    });
  }
  
  getUserNameFromEmail(email: string | null | undefined): string {
    if (!email) return 'Unknown User';
    const user = this.users.find(u => u.email === email);
    return user?.name || email.split('@')[0] || 'Unknown User';
  }
  
  formatCommentDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  getAttachmentFileName(attachmentPath: string): string {
    if (!attachmentPath) return '';
    const parts = attachmentPath.split('/');
    return parts[parts.length - 1] || attachmentPath;
  }
  
  onAttachmentChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedAttachmentFile = file;
    }
  }
  
  formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatAllocatedTime(allocatedTime: any): string {
    if (!allocatedTime) return '';
    if (typeof allocatedTime === 'string' && allocatedTime.includes(':')) {
      return allocatedTime;
    }
    if (typeof allocatedTime === 'number') {
      const totalSeconds = Math.round(allocatedTime * 3600);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return allocatedTime ? String(allocatedTime) : '';
  }

  formatDateForDisplay(date: any): string {
    if (!date) return '-';
    let dateStr = date;
    if (typeof date === 'string') {
      if (date.includes('T')) {
        dateStr = date.split('T')[0];
      } else if (date.includes(' ')) {
        dateStr = date.split(' ')[0];
      }
    }
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  timeToSeconds(timeStr: string): number {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseInt(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    } else if (parts.length === 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 3600 + minutes * 60;
    }
    return 0;
  }

  secondsToTime(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds < 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  getRemainingAllocatedTime(project: any): string {
    if (!project || !project.allocated_time) return '';
    const projectSeconds = this.timeToSeconds(project.allocated_time);
    if (projectSeconds === 0) return '';
    return '';
  }

  getProjectCustomFields(project: any): any {
    if (!project) return null;
    const standardFields = ['id', 'name', 'description', 'status', 'start_date', 'end_date', 
                           'allocated_time', 'attachment', 'manager_id', 'head_manager_id', 
                           'customer_id', 'created_at', 'updated_at', 'archived', 'created_by'];
    const customFields: any = {};
    for (const key in project) {
      if (project.hasOwnProperty(key) && !standardFields.includes(key) && project[key] !== null && project[key] !== undefined && project[key] !== '') {
        customFields[key] = project[key];
      }
    }
    return Object.keys(customFields).length > 0 ? customFields : null;
  }

  formatCustomFieldKey(key: any): string {
    if (!key) return '';
    return String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getTaskCustomFields(task: any): any {
    if (!task) return null;
    const standardFields = ['id', 'title', 'description', 'status', 'due_date', 'allocated_time',
                           'assigned_to', 'assigned_by', 'project_id', 'created_at', 'updated_at'];
    const customFields: any = {};
    for (const key in task) {
      if (task.hasOwnProperty(key) && !standardFields.includes(key) && task[key] !== null && task[key] !== undefined && task[key] !== '') {
        customFields[key] = task[key];
      }
    }
    return Object.keys(customFields).length > 0 ? customFields : null;
  }

  getAssignedUserName(userId: any, task: any): string {
    if (!userId) return 'Not assigned';
    if (task && task.assigned_to_email) {
      return task.assigned_to_email;
    }
    return `User ${userId}`;
  }
  
  formatHistoryValue(fieldName: string, value: any): string {
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    
    if (fieldName.includes('date') || fieldName.includes('Date')) {
      return this.formatDate(value);
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  }
  
  formatHistoryDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  editProject(project: any): void {
    // Load full project details and open edit modal
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const fullProject = projects.find((p: any) => p.id === project.id);
        if (fullProject) {
          this.selectedProjectForEdit = fullProject;
          this.editProjectData = {
            name: fullProject.name || '',
            description: fullProject.description || '',
            status: fullProject.status || 'on-track',
            start_date: this.extractDateOnly(fullProject.start_date) || '',
            end_date: this.extractDateOnly(fullProject.end_date) || '',
            customer_id: fullProject.customer_id ? fullProject.customer_id.toString() : null,
            allocated_time: fullProject.allocated_time || ''
          };
          this.selectedAttachmentFile = null;
          this.showEditProjectModal = true;
          this.editProjectError = '';
        } else {
          this.selectedProjectForEdit = project;
          this.editProjectData = {
            name: project.name || '',
            description: project.description || '',
            status: project.status || 'on-track',
            start_date: this.extractDateOnly(project.start_date) || '',
            end_date: this.extractDateOnly(project.end_date) || '',
            customer_id: project.customer_id ? project.customer_id.toString() : null,
            allocated_time: project.allocated_time || ''
          };
          this.selectedAttachmentFile = null;
          this.showEditProjectModal = true;
          this.editProjectError = '';
        }
      },
      error: (err) => {
        console.error('Error loading project details:', err);
        this.selectedProjectForEdit = project;
        this.editProjectData = {
          name: project.name || '',
          description: project.description || '',
          status: project.status || 'on-track',
          start_date: this.extractDateOnly(project.start_date) || '',
          end_date: this.extractDateOnly(project.end_date) || '',
          manager_id: project.manager_id || null,
          customer_id: project.customer_id ? project.customer_id.toString() : null,
          allocated_time: project.allocated_time || '',
          region: project.region || ''
        };
        this.showEditProjectModal = true;
        this.editProjectError = '';
      }
    });
  }
  
  closeEditProjectModal(): void {
    this.showEditProjectModal = false;
    this.selectedProjectForEdit = null;
    this.editProjectData = {};
    this.editProjectError = '';
    this.selectedAttachmentFile = null;
  }
  
  saveProject(): void {
    if (!this.selectedProjectForEdit) return;
    
    const projectId = this.selectedProjectForEdit.id;
    const data = this.editProjectData;
    
    // Validation
    if (!data.name || data.name.trim() === '') {
      this.editProjectError = 'Project name is required';
      return;
    }
    if (!data.description || data.description.trim() === '') {
      this.editProjectError = 'Description is required';
      return;
    }
    if (!data.customer_id || data.customer_id === '' || data.customer_id === null) {
      this.editProjectError = 'Customer is required';
      return;
    }
    
    // Prepare update data
    const customerId = typeof data.customer_id === 'string' ? parseInt(data.customer_id) : data.customer_id;
    // Preserve existing manager_id (not editable in dashboard)
    const managerId = this.selectedProjectForEdit.manager_id || null;
    
    // Handle attachment upload
    if (this.selectedAttachmentFile) {
      this.adminService.uploadFile(this.selectedAttachmentFile).subscribe({
        next: (uploadResponse) => {
          if (uploadResponse.success && uploadResponse.file) {
            const updateData: any = {
              name: data.name,
              description: data.description,
              status: data.status || 'on-track',
              customer_id: customerId,
              manager_id: managerId,
              start_date: data.start_date || null,
              end_date: data.end_date || null,
              allocated_time: data.allocated_time || null,
              attachment: uploadResponse.file.path
            };
            this.updateProjectWithData(projectId, updateData);
          } else {
            this.editProjectError = 'Failed to upload attachment';
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.message || err?.message || 'Failed to upload attachment';
          this.editProjectError = errorMessage;
        }
      });
      return;
    }
    
    // No new attachment, preserve existing or set to null
    const existingAttachment = this.selectedProjectForEdit.attachment || null;
    const updateData: any = {
      name: data.name,
      description: data.description,
      status: data.status || 'on-track',
      customer_id: customerId,
      manager_id: managerId,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      allocated_time: data.allocated_time || null,
      attachment: existingAttachment
    };
    
    this.updateProjectWithData(projectId, updateData);
  }
  
  private updateProjectWithData(projectId: number, updateData: any): void {
    this.adminService.updateProject(projectId, updateData).subscribe({
      next: () => {
        this.toastService.show('Project updated successfully', 'success');
        this.closeEditProjectModal();
        // Reload dashboard data
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Error updating project:', err);
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to update project';
        this.editProjectError = errorMessage;
      }
    });
  }
  
  extractDateOnly(dateString: any): string {
    if (!dateString) return '';
    if (typeof dateString === 'string') {
      const match = dateString.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : '';
    }
    return '';
  }

  viewTaskDetails(task: any): void {
    // Load full task details and open modal
    if (task.project_id) {
      this.adminService.getTasks(task.project_id).subscribe({
        next: (tasks) => {
          const fullTask = tasks.find((t: any) => t.id === task.id);
          if (fullTask) {
            this.selectedTaskForDetails = fullTask;
            this.showTaskDetailsModal = true;
            this.loadTaskComments(fullTask.id);
          } else {
            this.selectedTaskForDetails = task;
            this.showTaskDetailsModal = true;
            this.loadTaskComments(task.id);
          }
        },
        error: (err) => {
          console.error('Error loading task details:', err);
          this.selectedTaskForDetails = task;
          this.showTaskDetailsModal = true;
          this.loadTaskComments(task.id);
        }
      });
    } else {
      this.selectedTaskForDetails = task;
      this.showTaskDetailsModal = true;
      this.loadTaskComments(task.id);
    }
  }

  closeTaskDetailsModal(): void {
    this.showTaskDetailsModal = false;
    this.selectedTaskForDetails = null;
    this.taskComments = [];
    this.newTaskComment = '';
    this.editingTaskCommentId = null;
    this.editingTaskCommentText = '';
  }
  
  loadTaskComments(taskId: number): void {
    this.loadingTaskComments = true;
    this.adminService.getTaskComments(taskId).subscribe({
      next: (response: any) => {
        this.taskComments = response.comments || [];
        this.loadingTaskComments = false;
      },
      error: (err) => {
        console.error('Error loading task comments:', err);
        this.taskComments = [];
        this.loadingTaskComments = false;
      }
    });
  }
  
  addTaskComment(): void {
    if (!this.selectedTaskForDetails || !this.newTaskComment.trim()) return;
    
    this.loadingTaskComments = true;
    this.adminService.createTaskComment(this.selectedTaskForDetails.id, this.newTaskComment.trim()).subscribe({
      next: () => {
        this.newTaskComment = '';
        this.loadTaskComments(this.selectedTaskForDetails!.id);
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        this.loadingTaskComments = false;
        this.toastService.show('Failed to add comment', 'error');
      }
    });
  }
  
  startEditingTaskComment(comment: any): void {
    this.editingTaskCommentId = comment.id;
    this.editingTaskCommentText = comment.comment;
  }
  
  cancelEditingTaskComment(): void {
    this.editingTaskCommentId = null;
    this.editingTaskCommentText = '';
  }
  
  saveTaskComment(comment: any): void {
    if (!this.selectedTaskForDetails || !this.editingTaskCommentText.trim()) return;
    
    this.adminService.updateTaskComment(this.selectedTaskForDetails.id, comment.id, this.editingTaskCommentText.trim()).subscribe({
      next: () => {
        this.editingTaskCommentId = null;
        this.editingTaskCommentText = '';
        this.loadTaskComments(this.selectedTaskForDetails!.id);
      },
      error: (err) => {
        console.error('Error updating comment:', err);
        this.toastService.show('Failed to update comment', 'error');
      }
    });
  }
  
  deleteTaskComment(comment: any): void {
    if (!this.selectedTaskForDetails) return;
    
    if (confirm('Are you sure you want to delete this comment?')) {
      this.adminService.deleteTaskComment(this.selectedTaskForDetails.id, comment.id).subscribe({
        next: () => {
          this.loadTaskComments(this.selectedTaskForDetails!.id);
        },
        error: (err) => {
          console.error('Error deleting comment:', err);
          this.toastService.show('Failed to delete comment', 'error');
        }
      });
    }
  }
  
  isOwnTaskComment(comment: any): boolean {
    const currentUserEmail = this.authService.getEmail();
    return comment.user_email === currentUserEmail;
  }
  
  openTaskHistoryModalForTask(): void {
    if (!this.selectedTaskForDetails) return;
    this.selectedTaskForHistory = this.selectedTaskForDetails;
    this.loadTaskHistory(this.selectedTaskForDetails.id);
    this.showTaskHistoryModalForTask = true;
  }
  
  closeTaskHistoryModalForTask(): void {
    this.showTaskHistoryModalForTask = false;
    this.selectedTaskForHistory = null;
    this.taskHistory = [];
  }
  
  loadTaskHistory(taskId: number): void {
    this.loadingTaskHistory = true;
    this.adminService.getTaskHistory(taskId).subscribe({
      next: (response: any) => {
        this.taskHistory = response.history || [];
        this.loadingTaskHistory = false;
      },
      error: (err) => {
        console.error('Error loading task history:', err);
        this.taskHistory = [];
        this.loadingTaskHistory = false;
      }
    });
  }

  editTask(task: any): void {
    // Load full task details and open edit modal
    if (task.project_id) {
      this.adminService.getTasks(task.project_id).subscribe({
        next: (tasks) => {
          const fullTask = tasks.find((t: any) => t.id === task.id);
          if (fullTask) {
            this.selectedTaskForEdit = fullTask;
            this.editTaskData = {
              title: fullTask.title || '',
              description: fullTask.description || '',
              status: fullTask.status || 'pending',
              assigned_to: fullTask.assigned_to || null,
              due_date: this.extractDateOnly(fullTask.due_date) || '',
              allocated_time: fullTask.allocated_time || ''
            };
            this.showEditTaskModal = true;
            this.editTaskError = '';
          } else {
            this.selectedTaskForEdit = task;
            this.editTaskData = {
              title: task.title || '',
              description: task.description || '',
              status: task.status || 'pending',
              assigned_to: task.assigned_to || null,
              due_date: this.extractDateOnly(task.due_date) || '',
              allocated_time: task.allocated_time || ''
            };
            this.showEditTaskModal = true;
            this.editTaskError = '';
          }
        },
        error: (err) => {
          console.error('Error loading task details:', err);
          this.selectedTaskForEdit = task;
          this.editTaskData = {
            title: task.title || '',
            description: task.description || '',
            status: task.status || 'pending',
            assigned_to: task.assigned_to || null,
            due_date: this.extractDateOnly(task.due_date) || '',
            allocated_time: task.allocated_time || ''
          };
          this.showEditTaskModal = true;
          this.editTaskError = '';
        }
      });
    } else {
      this.selectedTaskForEdit = task;
      this.editTaskData = {
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'pending',
        assigned_to: task.assigned_to || null,
        due_date: this.extractDateOnly(task.due_date) || '',
        allocated_time: task.allocated_time || ''
      };
      this.showEditTaskModal = true;
      this.editTaskError = '';
    }
  }
  
  closeEditTaskModal(): void {
    this.showEditTaskModal = false;
    this.selectedTaskForEdit = null;
    this.editTaskData = {};
    this.editTaskError = '';
  }
  
  saveTask(): void {
    if (!this.selectedTaskForEdit) return;
    
    const taskId = this.selectedTaskForEdit.id;
    const data = this.editTaskData;
    
    // Validation
    if (!data.title || data.title.trim() === '') {
      this.editTaskError = 'Task title is required';
      return;
    }
    
    // Normalize status
    let normalizedStatus = data.status;
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }
    
    // Prepare update data
    const assignedTo = data.assigned_to ? (typeof data.assigned_to === 'string' ? parseInt(data.assigned_to) : data.assigned_to) : null;
    
    const updateData: any = {
      title: data.title,
      description: data.description || '',
      status: normalizedStatus,
      assigned_to: assignedTo,
      due_date: data.due_date || null,
      allocated_time: data.allocated_time || null
    };
    
    this.adminService.updateTask(taskId, updateData).subscribe({
      next: () => {
        this.toastService.show('Task updated successfully', 'success');
        this.closeEditTaskModal();
        // Reload dashboard data
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Error updating task:', err);
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to update task';
        this.editTaskError = errorMessage;
      }
    });
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

  openTimeEntriesModal(): void {
    console.log('Opening time entries modal, total entries:', this.allTimeEntries.length);
    this.showTimeEntriesModal = true;
  }

  closeTimeEntriesModal(): void {
    this.showTimeEntriesModal = false;
  }

  getAssignedByName(assignedBy: any): string {
    if (!assignedBy) return 'Unknown';
    
    // If it's an email, try to find user by email
    if (typeof assignedBy === 'string' && assignedBy.includes('@')) {
      const user = this.users.find(u => u.email === assignedBy);
      return user ? (user.name || assignedBy.split('@')[0]) : assignedBy.split('@')[0];
    }
    
    // If it's a user ID, try to find user by ID
    if (typeof assignedBy === 'number') {
      const user = this.users.find(u => u.id === assignedBy);
      return user ? (user.name || user.email || `User ${assignedBy}`) : `User ${assignedBy}`;
    }
    
    return String(assignedBy);
  }

  getTaskTypeLabel(task: any): string {
    // Check if created by current user
    const isCreatedByCurrentUser = task.created_by === this.currentUserEmail || 
                                   task.created_by === this.currentUserId ||
                                   task.created_by_id === this.currentUserId;
    
    if (isCreatedByCurrentUser) {
      return 'Created by me';
    } else if (task.assigned_by) {
      // Get the name of the user who assigned it
      const assignedByName = this.getAssignedByName(task.assigned_by);
      return `Assigned by ${assignedByName}`;
    }
    return 'Not Assigned';
  }

  getTaskTypeClass(task: any): string {
    const isCreatedByCurrentUser = task.created_by === this.currentUserEmail || 
                                   task.created_by === this.currentUserId ||
                                   task.created_by_id === this.currentUserId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (task.assigned_by) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }

  getProjectTypeLabel(project: any): string {
    // Check if created by current user (check created_by field or if user is the manager/head manager)
    const isCreatedByCurrentUser = project.created_by === this.currentUserEmail || 
                                   project.created_by === this.currentUserId ||
                                   project.created_by_id === this.currentUserId ||
                                   project.manager_id === this.currentUserId ||
                                   project.head_manager_id === this.currentUserId;
    
    if (isCreatedByCurrentUser) {
      return 'Created by me';
    } else if (project.manager_id && project.manager_id !== this.currentUserId) {
      // Get manager name
      const manager = this.users.find(u => u.id === project.manager_id);
      const managerName = manager ? (manager.name || manager.email || `User ${project.manager_id}`) : `User ${project.manager_id}`;
      return `Assigned by ${managerName}`;
    } else if (project.head_manager_id && project.head_manager_id !== this.currentUserId) {
      // Get head manager name
      const headManager = this.users.find(u => u.id === project.head_manager_id);
      const headManagerName = headManager ? (headManager.name || headManager.email || `User ${project.head_manager_id}`) : `User ${project.head_manager_id}`;
      return `Assigned by ${headManagerName}`;
    }
    return 'Not Assigned';
  }

  getProjectTypeClass(project: any): string {
    const isCreatedByCurrentUser = project.created_by === this.currentUserEmail || 
                                   project.created_by === this.currentUserId ||
                                   project.created_by_id === this.currentUserId ||
                                   project.manager_id === this.currentUserId ||
                                   project.head_manager_id === this.currentUserId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (project.manager_id || project.head_manager_id) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }
}

