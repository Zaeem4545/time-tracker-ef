import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ToastNotificationService } from '../../services/toast-notification.service';

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
  newProjectComment: string = '';
  newTaskComment: string = '';
  loadingProjectComments: boolean = false;
  loadingTaskComments: boolean = false;
  editingProjectCommentId: number | null = null;
  editingProjectCommentText: string = '';
  editingTaskCommentId: number | null = null;
  editingTaskCommentText: string = '';
  
  // History
  showProjectHistoryModal: boolean = false;
  showTaskHistoryModal: boolean = false;
  projectHistory: any[] = [];
  taskHistory: any[] = [];
  loadingProjectHistory: boolean = false;
  loadingTaskHistory: boolean = false;
  selectedTaskForHistory: any | null = null;
  
  // Edit form data
  editProjectData: any = {};
  editTaskData: any = {};
  editProjectError: string = '';
  editTaskError: string = '';

  // Current admin info
  currentAdminId: number | null = null;
  currentAdminEmail: string | null = null;
  currentAdminName: string | null = null;
  users: any[] = [];
  showWelcomeMessage = false;
  welcomeUserName = '';
  
  // Track projects and tasks worked on by admin
  workedOnProjectIds: Set<number> = new Set();
  workedOnTaskNames: Set<string> = new Set();

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
    private router: Router,
    private toastService: ToastNotificationService
  ) {}

  ngOnInit(): void {
    this.currentAdminId = this.authService.getUserId();
    this.currentAdminEmail = this.authService.getEmail();
    this.loadUsers();
    this.loadDashboardData();
  }

  checkAndShowWelcome(): void {
    const justLoggedIn = sessionStorage.getItem('justLoggedIn');
    if (justLoggedIn === 'true') {
      this.loadUserAndShowWelcome();
      sessionStorage.removeItem('justLoggedIn');
    }
  }

  loadUserAndShowWelcome(): void {
    if (this.users.length > 0) {
      const currentUser = this.users.find(u => u.id === this.currentAdminId || u.email === this.currentAdminEmail);
      if (currentUser && currentUser.name) {
        this.welcomeUserName = currentUser.name;
        this.showWelcomeMessage = true;
        setTimeout(() => {
          this.showWelcomeMessage = false;
        }, 3000);
        return;
      }
    }

    this.adminService.getUsers().subscribe({
      next: (users) => {
        const currentUser = users.find((u: any) => u.id === this.currentAdminId || u.email === this.currentAdminEmail);
        if (currentUser && currentUser.name) {
          this.welcomeUserName = currentUser.name;
        } else {
          this.welcomeUserName = this.currentAdminEmail?.split('@')[0] || 'User';
        }
        this.showWelcomeMessage = true;
        setTimeout(() => {
          this.showWelcomeMessage = false;
        }, 3000);
      },
      error: () => {
        this.welcomeUserName = this.currentAdminEmail?.split('@')[0] || 'User';
        this.showWelcomeMessage = true;
        setTimeout(() => {
          this.showWelcomeMessage = false;
        }, 3000);
      }
    });
  }

  loadDashboardData(): void {
    // Load time entries first to get projects/tasks admin has worked on
    this.loadTimeEntries();
    // Then load projects and tasks (they will use worked-on data)
    this.loadProjects();
    this.loadTasks();
  }

  loadProjects(): void {
    // Load projects and filter: only show projects created by or assigned to the admin
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        // Filter projects: Show projects where admin is manager, head manager, assigned to admin, or created by admin
        const adminProjects = projects.filter((project: any) => {
          // Check if project is assigned to this admin (manager_id)
          const isAssignedToAdmin = project.manager_id === this.currentAdminId;
          
          // Check if project is assigned to admin (assigned_to field)
          const isAssignedTo = project.assigned_to === this.currentAdminId;
          
          // Check if project has head_manager_id and it matches this admin
          const isHeadManager = project.head_manager_id === this.currentAdminId;
          
          // Check if there's a created_by field (for backward compatibility)
          const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                    project.created_by === this.currentAdminId ||
                                    project.created_by_id === this.currentAdminId;
          
          // Show projects where admin is assigned or created
          return isAssignedToAdmin || isAssignedTo || isHeadManager || isCreatedByAdmin;
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
  }

  loadTasks(): void {
    // Load admin's projects first to filter tasks from
    this.adminService.getProjects().subscribe({
      next: (allProjects) => {
        // Filter projects: Show projects where admin is manager, head manager, assigned to admin, created by admin, or worked on by admin
        const adminProjects = allProjects.filter((project: any) => {
          const isCreatedByAdmin = project.created_by === this.currentAdminEmail || 
                                    project.created_by === this.currentAdminId ||
                                    project.created_by_id === this.currentAdminId;
          const isAssignedToAdmin = project.manager_id === this.currentAdminId;
          const isAssignedTo = project.assigned_to === this.currentAdminId;
          const isHeadManager = project.head_manager_id === this.currentAdminId;
          // Check if admin has worked on this project (has time entries)
          const isWorkedOn = this.workedOnProjectIds.has(project.id);
          // Show projects where admin is assigned, created, or worked on
          return isCreatedByAdmin || isAssignedToAdmin || isAssignedTo || isHeadManager || isWorkedOn;
        });

        if (adminProjects.length === 0) {
          this.totalTasks = 0;
          this.recentTasks = [];
          this.allTasks = [];
          return;
        }

        const allTasks: any[] = [];
        let loadedProjects = 0;

        adminProjects.forEach((project: any) => {
          this.adminService.getTasks(project.id).subscribe({
            next: (tasks) => {
              // Filter tasks: created/assigned by admin, assigned to admin, or worked on by admin
              // Note: Tasks use 'assigned_by' (name) not 'created_by', so we check assigned_by against user name
              const adminTasks = tasks.filter((task: any) => {
                // Check if task was assigned by the admin (created/assigned by them)
                // assigned_by stores the name of the person who assigned/created the task
                const isAssignedByAdmin = task.assigned_by === this.currentAdminName ||
                                         task.assigned_by === this.currentAdminEmail;
                // Check if task was created by admin (legacy check for created_by field if it exists)
                const isCreatedByAdmin = task.created_by === this.currentAdminEmail || 
                                         task.created_by === this.currentAdminId ||
                                         task.created_by_id === this.currentAdminId;
                // Check if task is assigned to admin
                const isAssignedToAdmin = task.assigned_to === this.currentAdminId;
                
                // Check if admin has worked on this task (has time entries with this task name)
                const isWorkedOn = task.title && this.workedOnTaskNames.has(task.title.toLowerCase());
                
                return isAssignedByAdmin || isCreatedByAdmin || isAssignedToAdmin || isWorkedOn;
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
                this.allTasks = allTasks;
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
    // Load time entries first to collect worked-on projects and tasks
    this.adminService.getTimeEntries().subscribe({
      next: (entries) => {
        // Filter to only get current admin's time entries
        const currentAdminEntries = entries.filter((entry: any) => {
          return entry.user_id === this.currentAdminId;
        });
        
        // Collect project IDs and task names that admin worked on
        this.workedOnProjectIds.clear();
        this.workedOnTaskNames.clear();
        currentAdminEntries.forEach((entry: any) => {
          if (entry.project_id) {
            this.workedOnProjectIds.add(entry.project_id);
          }
          if (entry.task_name) {
            this.workedOnTaskNames.add(entry.task_name.toLowerCase());
          }
        });
        
        // Store all time entries for modal, sorted by date (newest first)
        this.allTimeEntries = entries.sort((a: any, b: any) => {
          const dateA = new Date(a.date || a.entry_date || a.start_time || 0).getTime();
          const dateB = new Date(b.date || b.entry_date || b.start_time || 0).getTime();
          return dateB - dateA; // Newest first
        });
        
        // Count only admin's entries for dashboard
        this.totalTimeEntries = currentAdminEntries.length;
        
        // Reload projects and tasks now that we have worked-on data
        this.loadProjects();
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error loading time entries:', err);
        this.allTimeEntries = [];
        this.totalTimeEntries = 0;
        // Still try to load projects and tasks
        this.loadProjects();
        this.loadTasks();
      }
    });
  }

  // Modal methods
  openProjectsModal(): void {
    this.showProjectsModal = true;
  }

  closeProjectsModal(): void {
    this.showProjectsModal = false;
  }

  openTasksModal(): void {
    this.showTasksModal = true;
  }

  closeTasksModal(): void {
    this.showTasksModal = false;
  }

  openTimeEntriesModal(): void {
    this.showTimeEntriesModal = true;
  }

  closeTimeEntriesModal(): void {
    this.showTimeEntriesModal = false;
  }

  // Project helper methods
  isProjectCompleted(project: any): boolean {
    const status = (project.status || '').toLowerCase().trim();
    return status === 'completed';
  }

  isProjectArchived(project: any): boolean {
    return project.archived === 1 || project.archived === true || project.archived === '1' || project.archived === 'true';
  }

  shouldShowArchiveButton(project: any): boolean {
    return this.isProjectCompleted(project) && !this.isProjectArchived(project);
  }

  isProjectInMaintenance(project: any): boolean {
    const status = (project.status || '').toLowerCase().trim();
    return status === 'maintenance';
  }

  archiveProject(project: any): void {
    const newArchivedStatus = true;
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: project.status || 'on-track',
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      archived: newArchivedStatus
    };
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        project.archived = 1;
        this.toastService.show('Project moved to archived', 'success');
        this.loadProjects();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to archive project';
        this.toastService.show('Error archiving project: ' + errorMessage, 'error');
      }
    });
  }

  removeFromMaintenance(project: any): void {
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: 'on-track',
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      archived: project.archived || false
    };
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        project.status = 'on-track';
        this.toastService.show('Project removed from maintenance', 'success');
        this.loadProjects();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to remove from maintenance';
        this.toastService.show('Error removing from maintenance: ' + errorMessage, 'error');
      }
    });
  }

  viewProjectDetails(project: any): void {
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

  editProject(project: any): void {
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
            allocated_time: fullProject.allocated_time || '',
            region: fullProject.region || '',
            assigned_to: fullProject.assigned_to || null
          };
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
            allocated_time: project.allocated_time || '',
            assigned_to: project.assigned_to || null
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
    
    const customerId = typeof data.customer_id === 'string' ? parseInt(data.customer_id) : data.customer_id;
    const managerId = this.selectedProjectForEdit.manager_id || null;
    
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
              assigned_to: data.assigned_to || null,
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
      assigned_to: data.assigned_to || null,
      attachment: existingAttachment
    };
    
    this.updateProjectWithData(projectId, updateData);
  }

  private updateProjectWithData(projectId: number, updateData: any): void {
    this.adminService.updateProject(projectId, updateData).subscribe({
      next: () => {
        this.toastService.show('Project updated successfully', 'success');
        this.closeEditProjectModal();
        this.loadProjects();
      },
      error: (err) => {
        console.error('Error updating project:', err);
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to update project';
        this.editProjectError = errorMessage;
      }
    });
  }

  viewTaskDetails(task: any): void {
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

  editTask(task: any): void {
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
    
    if (!data.title || data.title.trim() === '') {
      this.editTaskError = 'Task title is required';
      return;
    }
    
    let normalizedStatus = data.status;
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }
    
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
        this.loadTasks();
      },
      error: (err) => {
        console.error('Error updating task:', err);
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to update task';
        this.editTaskError = errorMessage;
      }
    });
  }

  // Utility methods
  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  }

  calculateTimeSpent(entry: any): string {
    if (entry.total_time !== null && entry.total_time !== undefined) {
      const totalMinutes = entry.total_time;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    
    if (entry.start_time && entry.end_time) {
      const start = new Date(entry.start_time);
      const end = new Date(entry.end_time);
      const diffMs = end.getTime() - start.getTime();
      const totalMinutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    
    return '00:00:00';
  }

  getWorkedBy(entry: any): string {
    if (entry.employee_name) return entry.employee_name;
    if (entry.employee_email) return entry.employee_email;
    if (entry.user_name) return entry.user_name;
    if (entry.user_email) return entry.user_email;
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
    this.taskStatusDropdownOpen = null;
  }

  toggleTaskStatusDropdown(taskId: number, event: Event): void {
    event.stopPropagation();
    this.taskStatusDropdownOpen = this.taskStatusDropdownOpen === taskId ? null : taskId;
    this.projectStatusDropdownOpen = null;
  }

  updateProjectStatus(project: any, newStatus: string): void {
    if (project.status === newStatus) {
      this.projectStatusDropdownOpen = null;
      return;
    }

    if (!project.name || (typeof project.name === 'string' && project.name.trim() === '')) {
      this.toastService.show('Project name is required', 'error');
      this.projectStatusDropdownOpen = null;
      return;
    }

    let customerId: number | null = null;
    if (project.customer_id !== null && project.customer_id !== undefined && project.customer_id !== '') {
      customerId = typeof project.customer_id === 'string' ? parseInt(project.customer_id) : Number(project.customer_id);
      if (isNaN(customerId) || customerId <= 0) {
        customerId = null;
      }
    }

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

    if (project.region) {
      updateData.region = project.region;
    }
    if (project.allocated_time) {
      updateData.allocated_time = project.allocated_time;
    }
    
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
    let normalizedStatus = newStatus;
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }

    if (task.status === normalizedStatus || task.status === newStatus) {
      this.taskStatusDropdownOpen = null;
      return;
    }

    if (!task.title || task.title.trim() === '') {
      this.toastService.show('Task title is required', 'error');
      this.taskStatusDropdownOpen = null;
      return;
    }

    let assignedToValue = task.assigned_to;
    if (assignedToValue !== null && assignedToValue !== undefined && assignedToValue !== '') {
      assignedToValue = typeof assignedToValue === 'string' ? parseInt(assignedToValue) : Number(assignedToValue);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }

    const updateData: any = {
      title: task.title,
      description: task.description || null,
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || null,
      due_date: task.due_date || null
    };

    if (task.allocated_time) {
      updateData.allocated_time = task.allocated_time;
    }
    if (task.custom_fields) {
      let customFields = task.custom_fields;
      if (typeof customFields === 'string') {
        try {
          customFields = JSON.parse(customFields);
        } catch (e) {
          customFields = null;
        }
      }
      if (customFields && typeof customFields === 'object' && Object.keys(customFields).length > 0) {
        updateData.custom_fields = customFields;
      }
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

  getProjectTypeClass(project: any): string {
    const isCreatedByCurrentUser = project.created_by === this.currentAdminEmail || 
                                   project.created_by === this.currentAdminId ||
                                   project.created_by_id === this.currentAdminId ||
                                   project.manager_id === this.currentAdminId ||
                                   project.head_manager_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (project.manager_id || project.head_manager_id) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }

  getProjectTypeLabel(project: any): string {
    const isCreatedByCurrentUser = project.created_by === this.currentAdminEmail || 
                                   project.created_by === this.currentAdminId ||
                                   project.created_by_id === this.currentAdminId ||
                                   project.manager_id === this.currentAdminId ||
                                   project.head_manager_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'Created by me';
    } else if (project.manager_id && project.manager_id !== this.currentAdminId) {
      const manager = this.users.find(u => u.id === project.manager_id);
      const managerName = manager ? (manager.name || manager.email || `User ${project.manager_id}`) : `User ${project.manager_id}`;
      return `Assigned by ${managerName}`;
    } else if (project.head_manager_id && project.head_manager_id !== this.currentAdminId) {
      const headManager = this.users.find(u => u.id === project.head_manager_id);
      const headManagerName = headManager ? (headManager.name || headManager.email || `User ${project.head_manager_id}`) : `User ${project.head_manager_id}`;
      return `Assigned by ${headManagerName}`;
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

  getTaskTypeLabel(task: any): string {
    const isCreatedByCurrentUser = task.created_by === this.currentAdminEmail || 
                                   task.created_by === this.currentAdminId ||
                                   task.created_by_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'Created by me';
    } else if (task.assigned_by) {
      const assignedByName = this.getAssignedByName(task.assigned_by);
      return `Assigned by ${assignedByName}`;
    }
    return 'Not Assigned';
  }

  extractDateOnly(dateString: any): string {
    if (!dateString) return '';
    if (typeof dateString === 'string') {
      const match = dateString.match(/(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : '';
    }
    return '';
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

  addComment(): void {
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

  openTaskHistoryModal(): void {
    if (!this.selectedTaskForEdit) return;
    this.loadTaskHistory(this.selectedTaskForEdit.id);
    this.showTaskHistoryModal = true;
  }

  closeTaskHistoryModal(): void {
    this.showTaskHistoryModal = false;
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

  getRemainingAllocatedTime(project: any): string {
    if (!project || !project.allocated_time) return '';
    const projectSeconds = this.timeToSeconds(project.allocated_time);
    if (projectSeconds === 0) return '';
    return '';
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

  getAssignedByNameForProject(project: any): string {
    if (project && project.created_by_name) {
      return project.created_by_name;
    }
    if (project && project.manager_name) {
      return project.manager_name;
    }
    return '';
  }

  getAssignedByName(assignedBy: any): string {
    if (!assignedBy) return 'Unknown';
    
    if (typeof assignedBy === 'string' && assignedBy.includes('@')) {
      const user = this.users.find(u => u.email === assignedBy);
      return user ? (user.name || assignedBy.split('@')[0]) : assignedBy.split('@')[0];
    }
    
    if (typeof assignedBy === 'number') {
      const user = this.users.find(u => u.id === assignedBy);
      return user ? (user.name || user.email || `User ${assignedBy}`) : `User ${assignedBy}`;
    }
    
    return String(assignedBy);
  }

  getAssignedUserName(userId: any, task: any): string {
    if (!userId) return 'Not assigned';
    if (task && task.assigned_to_email) {
      return task.assigned_to_email;
    }
    return `User ${userId}`;
  }

  getAttachmentFileName(attachmentPath: string): string {
    if (!attachmentPath) return '';
    const parts = attachmentPath.split('/');
    return parts[parts.length - 1] || attachmentPath;
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

  formatCustomFieldKey(key: any): string {
    if (!key) return '';
    return String(key).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
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

  loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.users = [];
      }
    });
  }
}
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

  // Check if project status is completed (case-insensitive)
  isProjectCompleted(project: any): boolean {
    const status = (project.status || '').toLowerCase().trim();
    return status === 'completed';
  }

  // Check if project is archived
  isProjectArchived(project: any): boolean {
    return project.archived === 1 || project.archived === true || project.archived === '1' || project.archived === 'true';
  }

  // Check if project should show "Set to Archived" button
  shouldShowArchiveButton(project: any): boolean {
    return this.isProjectCompleted(project) && !this.isProjectArchived(project);
  }

  // Check if project is in maintenance
  isProjectInMaintenance(project: any): boolean {
    const status = (project.status || '').toLowerCase().trim();
    return status === 'maintenance';
  }

  // Check if project should show "Go to Maintenance" button
  shouldShowMaintenanceButton(project: any): boolean {
    return !this.isProjectInMaintenance(project) && !this.isProjectArchived(project) && !this.isProjectCompleted(project);
  }

  // Archive project
  archiveProject(project: any): void {
    const newArchivedStatus = true;
    
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: project.status || 'on-track',
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      region: project.region || null,
      allocated_time: project.allocated_time || null,
      archived: newArchivedStatus
    };
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        project.archived = 1;
        this.toastService.show('Project moved to archived', 'success');
        this.loadDashboardData();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to archive project';
        this.toastService.show('Error archiving project: ' + errorMessage, 'error');
      }
    });
  }

  // Set project to maintenance
  goToMaintenance(project: any): void {
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: 'maintenance',
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      region: project.region || null,
      allocated_time: project.allocated_time || null,
      archived: project.archived || false
    };
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        project.status = 'maintenance';
        this.toastService.show('Project moved to maintenance', 'success');
        this.loadDashboardData();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to set project to maintenance';
        this.toastService.show('Error setting project to maintenance: ' + errorMessage, 'error');
      }
    });
  }

  // Remove project from maintenance
  removeFromMaintenance(project: any): void {
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: 'on-track',
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      region: project.region || null,
      allocated_time: project.allocated_time || null,
      archived: project.archived || false
    };
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        project.status = 'on-track';
        this.toastService.show('Project removed from maintenance', 'success');
        this.loadDashboardData();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to remove from maintenance';
        this.toastService.show('Error removing from maintenance: ' + errorMessage, 'error');
      }
    });
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
            allocated_time: fullProject.allocated_time || '',
            assigned_to: fullProject.assigned_to || null
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
            allocated_time: project.allocated_time || '',
            assigned_to: project.assigned_to || null
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
      allocated_time: this.modalEditProjectData.allocated_time || null,
      assigned_to: this.modalEditProjectData.assigned_to || null
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
        // Check welcome message after users are loaded
        this.checkAndShowWelcome();
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.users = [];
        // Still check welcome message even if users load fails
        this.checkAndShowWelcome();
      }
    });
  }

  getAssignedByNameForProject(project: any): string {
    // First check if project has created_by_name from backend
    if (project && project.created_by_name) {
      return project.created_by_name;
    }
    // Fallback to manager_name (the manager who assigned the project)
    if (project && project.manager_name) {
      return project.manager_name;
    }
    return '';
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
    // Check if created by current user (check created_by field or if user is the manager/head manager)
    const isCreatedByCurrentUser = project.created_by === this.currentAdminEmail || 
                                   project.created_by === this.currentAdminId ||
                                   project.created_by_id === this.currentAdminId ||
                                   project.manager_id === this.currentAdminId ||
                                   project.head_manager_id === this.currentAdminId;
    
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
                                   project.created_by_id === this.currentAdminId ||
                                   project.manager_id === this.currentAdminId ||
                                   project.head_manager_id === this.currentAdminId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (project.manager_id || project.head_manager_id) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }
}
