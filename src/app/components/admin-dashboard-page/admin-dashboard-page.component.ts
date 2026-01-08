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
  
  // Project/Task view/edit modals
  showProjectDetailsModal: boolean = false;
  showEditProjectModal: boolean = false;
  showTaskDetailsModal: boolean = false;
  showEditTaskModal: boolean = false;
  selectedProjectForDetails: any | null = null;
  selectedProjectForEdit: any | null = null;
  selectedTaskForDetails: any | null = null;
  selectedTaskForEdit: any | null = null;
  modalEditProjectData: any = {};
  modalEditTaskData: any = {};
  selectedAttachmentFile: File | null = null;
  
  // Comments
  projectComments: any[] = [];
  taskComments: any[] = [];
  newComment: string = '';
  newTaskComment: string = '';
  loadingComments: boolean = false;
  editingProjectCommentId: number | null = null;
  editingProjectCommentText: string = '';
  editingTaskCommentId: number | null = null;
  editingTaskCommentText: string = '';
  
  // History
  showProjectHistoryModal: boolean = false;
  showTaskHistoryModal: boolean = false;
  projectHistory: any[] = [];
  taskHistory: any[] = [];
  loadingHistory: boolean = false;
  loadingTaskHistory: boolean = false;

  // Current admin info
  currentAdminId: number | null = null;
  currentAdminEmail: string | null = null;
  users: any[] = [];

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
    this.loadUsers();
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

  viewProjectDetails(project: any): void {
    // Load full project details and open view modal
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const fullProject = projects.find((p: any) => p.id === project.id);
        this.selectedProjectForDetails = fullProject || project;
        this.showProjectDetailsModal = true;
      },
      error: (err) => {
        console.error('Error loading project details:', err);
        this.selectedProjectForDetails = project;
        this.showProjectDetailsModal = true;
      }
    });
  }

  closeProjectDetailsModal(): void {
    this.showProjectDetailsModal = false;
    this.selectedProjectForDetails = null;
  }

  editProject(project: any): void {
    // Load full project details and open edit modal
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const fullProject = projects.find((p: any) => p.id === project.id);
        if (fullProject) {
          this.selectedProjectForEdit = fullProject;
          this.modalEditProjectData = {
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
          // Load comments for edit modal
          this.loadProjectComments(fullProject.id);
        } else {
          // Fallback to current project data
          this.selectedProjectForEdit = project;
          this.modalEditProjectData = {
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
          // Load comments for edit modal
          this.loadProjectComments(project.id);
        }
      },
      error: (err) => {
        console.error('Error loading project details:', err);
        // Fallback to current project data
        this.selectedProjectForEdit = project;
        this.modalEditProjectData = {
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
        // Load comments for edit modal
        this.loadProjectComments(project.id);
      }
    });
  }

  closeEditProjectModal(): void {
    this.showEditProjectModal = false;
    this.selectedProjectForEdit = null;
    this.modalEditProjectData = {};
    this.selectedAttachmentFile = null;
    // Clear comments
    this.projectComments = [];
    this.newComment = '';
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
    // Close history modal if open
    this.showProjectHistoryModal = false;
    this.projectHistory = [];
  }

  viewTaskDetails(task: any): void {
    this.selectedTaskForDetails = task;
    this.showTaskDetailsModal = true;
  }

  closeTaskDetailsModal(): void {
    this.showTaskDetailsModal = false;
    this.selectedTaskForDetails = null;
  }

  editTask(task: any): void {
    this.selectedTaskForEdit = task;
    this.modalEditTaskData = {
      title: task.title || '',
      description: task.description || '',
      status: task.status || 'pending',
      due_date: this.extractDateOnly(task.due_date) || '',
      allocated_time: task.allocated_time || ''
    };
    this.showEditTaskModal = true;
    // Load task comments
    this.loadTaskComments(task.id);
  }

  closeEditTaskModal(): void {
    this.showEditTaskModal = false;
    this.selectedTaskForEdit = null;
    this.modalEditTaskData = {};
    // Clear comments
    this.taskComments = [];
    this.newTaskComment = '';
    this.editingTaskCommentId = null;
    this.editingTaskCommentText = '';
    // Close history modal if open
    this.showTaskHistoryModal = false;
    this.taskHistory = [];
  }

  extractDateOnly(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  saveProject(): void {
    if (!this.selectedProjectForEdit) return;
    
    if (!this.modalEditProjectData.name || !this.modalEditProjectData.description) {
      alert('Please fill in all required fields');
      return;
    }

    const updateData: any = {
      name: this.modalEditProjectData.name,
      description: this.modalEditProjectData.description,
      status: this.modalEditProjectData.status,
      start_date: this.modalEditProjectData.start_date || null,
      end_date: this.modalEditProjectData.end_date || null,
      allocated_time: this.modalEditProjectData.allocated_time || null
    };

    // Create FormData if attachment is selected
    const formData = new FormData();
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== null && updateData[key] !== undefined) {
        formData.append(key, updateData[key]);
      }
    });

    if (this.selectedAttachmentFile) {
      formData.append('attachment', this.selectedAttachmentFile);
    }

    this.adminService.updateProject(this.selectedProjectForEdit.id, formData).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          // Reload dashboard data
          this.loadDashboardData();
          // Update the project in recentProjects
          const index = this.recentProjects.findIndex(p => p.id === this.selectedProjectForEdit.id);
          if (index !== -1) {
            this.recentProjects[index] = { ...this.recentProjects[index], ...updateData };
          }
          this.closeEditProjectModal();
        } else {
          alert('Failed to update project: ' + ((response && response.message) || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error('Error updating project:', err);
        alert('Error updating project: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  saveTask(): void {
    if (!this.selectedTaskForEdit) return;
    
    if (!this.modalEditTaskData.title) {
      alert('Please fill in the task title');
      return;
    }

    const updateData: any = {
      title: this.modalEditTaskData.title,
      description: this.modalEditTaskData.description || '',
      status: this.modalEditTaskData.status,
      due_date: this.modalEditTaskData.due_date || null,
      allocated_time: this.modalEditTaskData.allocated_time || null
    };

    this.adminService.updateTask(this.selectedTaskForEdit.id, updateData).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          // Reload dashboard data
          this.loadDashboardData();
          // Update the task in recentTasks
          const index = this.recentTasks.findIndex(t => t.id === this.selectedTaskForEdit.id);
          if (index !== -1) {
            this.recentTasks[index] = { ...this.recentTasks[index], ...updateData };
          }
          this.closeEditTaskModal();
        } else {
          alert('Failed to update task: ' + ((response && response.message) || 'Unknown error'));
        }
      },
      error: (err) => {
        console.error('Error updating task:', err);
        alert('Error updating task: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  onAttachmentChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedAttachmentFile = file;
    }
  }

  // Comments methods
  loadProjectComments(projectId: number): void {
    this.loadingComments = true;
    this.adminService.getProjectComments(projectId).subscribe({
      next: (response: any) => {
        this.projectComments = response.comments || [];
        this.loadingComments = false;
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.projectComments = [];
        this.loadingComments = false;
      }
    });
  }

  addComment(): void {
    const project = this.selectedProjectForEdit;
    if (!project || !this.newComment.trim()) return;
    
    this.adminService.createProjectComment(project.id, this.newComment.trim()).subscribe({
      next: (response: any) => {
        if (response && response.success && response.comment) {
          this.projectComments.unshift(response.comment);
          this.newComment = '';
        }
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        alert('Failed to add comment. Please try again.');
      }
    });
  }

  isOwnProjectComment(comment: any): boolean {
    const currentUserEmail = this.authService.getEmail();
    const currentUserId = this.authService.getUserId();
    return comment.user_email === currentUserEmail || comment.user_id === currentUserId;
  }

  startEditingProjectComment(comment: any): void {
    if (!this.isOwnProjectComment(comment)) return;
    this.editingProjectCommentId = comment.id;
    this.editingProjectCommentText = comment.comment;
  }

  cancelEditingProjectComment(): void {
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
  }

  saveProjectComment(comment: any): void {
    const project = this.selectedProjectForEdit;
    if (!project || !this.editingProjectCommentText.trim()) return;
    
    this.adminService.updateProjectComment(project.id, comment.id, this.editingProjectCommentText.trim()).subscribe({
      next: (response: any) => {
        if (response && response.success && response.comment) {
          const index = this.projectComments.findIndex(c => c.id === comment.id);
          if (index !== -1) {
            this.projectComments[index] = response.comment;
          }
          this.cancelEditingProjectComment();
        }
      },
      error: (err) => {
        console.error('Error updating comment:', err);
        alert('Failed to update comment. Please try again.');
      }
    });
  }

  deleteProjectComment(comment: any): void {
    const project = this.selectedProjectForEdit;
    if (!project || !this.isOwnProjectComment(comment)) return;
    
    if (confirm('Are you sure you want to delete this comment?')) {
      this.adminService.deleteProjectComment(project.id, comment.id).subscribe({
        next: (response: any) => {
          if (response && response.success) {
            this.projectComments = this.projectComments.filter(c => c.id !== comment.id);
          }
        },
        error: (err) => {
          console.error('Error deleting comment:', err);
          alert('Failed to delete comment. Please try again.');
        }
      });
    }
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

  getUserNameFromEmail(email: string): string {
    if (!email) return '';
    return email.split('@')[0];
  }

  // Task comments
  loadTaskComments(taskId: number): void {
    // Task comments might use a different endpoint, adjust as needed
    this.loadingComments = true;
    // For now, we'll use project comments endpoint if task comments don't exist
    // You may need to add getTaskComments to adminService
    this.loadingComments = false;
  }

  addTaskComment(): void {
    // Implement if task comments are supported
  }

  // History methods
  openProjectHistoryModal(): void {
    const project = this.selectedProjectForEdit;
    if (!project) return;
    this.showProjectHistoryModal = true;
    this.loadProjectHistory(project.id);
  }

  closeProjectHistoryModal(): void {
    this.showProjectHistoryModal = false;
    this.projectHistory = [];
  }

  loadProjectHistory(projectId: number): void {
    this.loadingHistory = true;
    this.adminService.getProjectHistory(projectId).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          this.projectHistory = response.history || [];
        }
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('Error loading project history:', err);
        this.projectHistory = [];
        this.loadingHistory = false;
      }
    });
  }

  openTaskHistoryModal(): void {
    const task = this.selectedTaskForEdit;
    if (!task) return;
    this.showTaskHistoryModal = true;
    this.loadTaskHistory(task.id);
  }

  closeTaskHistoryModal(): void {
    this.showTaskHistoryModal = false;
    this.taskHistory = [];
  }

  loadTaskHistory(taskId: number): void {
    this.loadingTaskHistory = true;
    this.adminService.getTaskHistory(taskId).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          this.taskHistory = response.history || [];
        }
        this.loadingTaskHistory = false;
      },
      error: (err) => {
        console.error('Error loading task history:', err);
        this.taskHistory = [];
        this.loadingTaskHistory = false;
      }
    });
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

  formatFieldName(fieldName: string): string {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatHistoryValue(fieldName: string, value: any): string {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
  }

  formatAllocatedTime(allocatedTime: any): string {
    if (!allocatedTime) return '';
    
    // If it's already in HH:MM:SS format, return as is
    if (typeof allocatedTime === 'string' && allocatedTime.includes(':')) {
      return allocatedTime;
    }
    
    // If it's a number (decimal hours), convert to HH:MM:SS
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
    
    // Extract date part if it's a datetime string
    let dateStr = date;
    if (typeof date === 'string') {
      if (date.includes('T')) {
        dateStr = date.split('T')[0];
      } else if (date.includes(' ')) {
        dateStr = date.split(' ')[0];
      }
    }
    
    // Parse the date
    const d = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
    if (isNaN(d.getTime())) return dateStr; // Return original if invalid
    
    // Format as "MMM DD, YYYY" (e.g., "Jan 15, 2024")
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
    
    // Get all tasks for this project - we need to load them
    // For now, return empty or calculate if we have tasks
    return '';
  }

  getAttachmentFileName(attachmentPath: string): string {
    if (!attachmentPath) return '';
    const parts = attachmentPath.split('/');
    return parts[parts.length - 1] || attachmentPath;
  }

  getProjectCustomFields(project: any): any {
    if (!project) return null;
    
    // Standard fields that should not be shown as custom fields
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
    
    // Standard fields that should not be shown as custom fields
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
    // Try to get from users list if available
    // For now, return the ID or email if available
    if (task && task.assigned_to_email) {
      return task.assigned_to_email;
    }
    return `User ${userId}`;
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
    const isCreatedByCurrentUser = task.created_by === this.currentAdminEmail || 
                                   task.created_by === this.currentAdminId ||
                                   task.created_by_id === this.currentAdminId;
    
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
    const isCreatedByCurrentUser = task.created_by === this.currentAdminEmail || 
                                   task.created_by === this.currentAdminId ||
                                   task.created_by_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (task.assigned_by) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }

  getProjectTypeLabel(project: any): string {
    // Check if created by current user
    const isCreatedByCurrentUser = project.created_by === this.currentAdminEmail || 
                                   project.created_by === this.currentAdminId ||
                                   project.created_by_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'Created by me';
    } else if (project.manager_id && project.manager_id !== this.currentAdminId) {
      // Get manager name
      const manager = this.users.find(u => u.id === project.manager_id);
      const managerName = manager ? (manager.name || manager.email || `User ${project.manager_id}`) : `User ${project.manager_id}`;
      return `Assigned by ${managerName}`;
    } else if (project.head_manager_id && project.head_manager_id !== this.currentAdminId) {
      // Get head manager name
      const headManager = this.users.find(u => u.id === project.head_manager_id);
      const headManagerName = headManager ? (headManager.name || headManager.email || `User ${project.head_manager_id}`) : `User ${project.head_manager_id}`;
      return `Assigned by ${headManagerName}`;
    }
    return 'Not Assigned';
  }

  getProjectTypeClass(project: any): string {
    const isCreatedByCurrentUser = project.created_by === this.currentAdminEmail || 
                                   project.created_by === this.currentAdminId ||
                                   project.created_by_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (project.manager_id || project.head_manager_id) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }
}
