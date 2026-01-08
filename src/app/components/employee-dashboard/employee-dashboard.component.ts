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
  currentUserEmail: string | null = null;
  users: any[] = [];
  showWelcomeMessage = false;
  welcomeUserName = '';
  
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
    this.currentUserEmail = this.authService.getEmail();
    // Load users first to get name for welcome message
    this.loadUsers();
    // Load time entries first to determine which projects employee has worked on
    this.loadTimeEntries();
    // Check for notifications when dashboard loads
    this.checkForNewNotifications();
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
      const currentUser = this.users.find(u => u.id === this.currentUserId || u.email === this.currentUserEmail);
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
        const currentUser = users.find((u: any) => u.id === this.currentUserId || u.email === this.currentUserEmail);
        if (currentUser && currentUser.name) {
          this.welcomeUserName = currentUser.name;
        } else {
          this.welcomeUserName = this.currentUserEmail?.split('@')[0] || 'User';
        }
        this.showWelcomeMessage = true;
        setTimeout(() => {
          this.showWelcomeMessage = false;
        }, 3000);
      },
      error: () => {
        this.welcomeUserName = this.currentUserEmail?.split('@')[0] || 'User';
        this.showWelcomeMessage = true;
        setTimeout(() => {
          this.showWelcomeMessage = false;
        }, 3000);
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
              // Check if created by current user (could be email or ID)
              const isCreatedByCurrentUser = task.created_by === this.currentUserEmail || 
                                           task.created_by === this.currentUserId ||
                                           task.created_by_id === this.currentUserId;
              
              let taskType = 'not_assigned';
              if (isCreatedByCurrentUser) {
                taskType = 'created_by_me';
              } else if (isAssignedToEmployee && task.assigned_by) {
                taskType = 'assigned_by_user';
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
        // Store all time entries for modal, sorted by date (newest first)
        this.allTimeEntries = entries.sort((a: any, b: any) => {
          const dateA = new Date(a.date || a.entry_date || a.start_time || 0).getTime();
          const dateB = new Date(b.date || b.entry_date || b.start_time || 0).getTime();
          return dateB - dateA; // Newest first
        });
        this.totalTimeEntries = entries.length;
        
        // Load all projects (not filtered by worked projects)
        this.loadProjects();
      },
      error: (err) => {
        console.error('Error loading time entries:', err);
        this.allTimeEntries = [];
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
    if (task.taskType === 'created_by_me') {
      return 'Created by me';
    } else if (task.taskType === 'assigned_by_user') {
      // Get the name of the user who assigned it
      const assignedByName = this.getAssignedByName(task.assigned_by);
      return `Assigned by ${assignedByName}`;
    } else if (task.taskType === 'assigned') {
      return 'Assigned';
    } else if (task.taskType === 'not_assigned') {
      return 'Not Assigned';
    }
    return 'Not Assigned';
  }

  getTaskTypeClass(task: any): string {
    if (task.taskType === 'created_by_me') {
      return 'task-type-created';
    } else if (task.taskType === 'assigned_by_user' || task.taskType === 'assigned') {
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
    this.selectedProjectForDetails = project;
    this.showProjectDetailsModal = true;
  }

  closeProjectDetailsModal(): void {
    this.showProjectDetailsModal = false;
    this.selectedProjectForDetails = null;
  }

  editProject(project: any): void {
    this.selectedProjectForEdit = project;
    this.modalEditProjectData = {
      name: project.name || '',
      description: project.description || '',
      status: project.status || 'on-track',
      start_date: this.extractDateOnly(project.start_date) || '',
      end_date: this.extractDateOnly(project.end_date) || '',
      allocated_time: project.allocated_time || ''
    };
    this.showEditProjectModal = true;
    // Load comments for edit modal
    this.loadProjectComments(project.id);
  }

  closeEditProjectModal(): void {
    this.showEditProjectModal = false;
    this.selectedProjectForEdit = null;
    this.modalEditProjectData = {};
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

    this.adminService.updateProject(this.selectedProjectForEdit.id, updateData).subscribe({
      next: (response: any) => {
        if (response && response.success) {
          this.loadProjects(); // This will automatically call loadEmployeeTasks()
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
          this.loadEmployeeTasks(); // Reload tasks
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

  getProjectTypeLabel(project: any): string {
    // Check if created by current user (check created_by field or if user is the manager)
    const isCreatedByCurrentUser = project.created_by === this.currentUserEmail || 
                                   project.created_by === this.currentUserId ||
                                   project.created_by_id === this.currentUserId ||
                                   project.manager_id === this.currentUserId;
    
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
                                   project.manager_id === this.currentUserId;
    
    if (isCreatedByCurrentUser) {
      return 'task-type-created';
    } else if (project.manager_id || project.head_manager_id) {
      return 'task-type-assigned';
    }
    return 'task-type-not-assigned';
  }
}

