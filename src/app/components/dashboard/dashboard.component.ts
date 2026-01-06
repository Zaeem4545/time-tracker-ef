import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ToastNotificationService } from '../../services/toast-notification.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  // Summary metrics
  totalProjects: number = 0;
  myProjects: number = 0;
  totalTasks: number = 0;
  totalTimeEntries: number = 0;

  // Recent data
  recentProjects: any[] = [];
  recentTasks: any[] = [];
  
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
  users: any[] = [];
  
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

  currentUserRole: string | null = null;
  currentUserId: number | null = null;
  isManager: boolean = false;
  isAdmin: boolean = false;
  isHeadManager: boolean = false;
  isEmployee: boolean = false;

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
    private toastService: ToastNotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();
    this.currentUserId = this.authService.getUserId();
    const roleLower = this.currentUserRole?.toLowerCase();
    
    this.isManager = roleLower === 'manager';
    this.isAdmin = roleLower === 'admin';
    this.isHeadManager = roleLower === 'head manager';
    this.isEmployee = roleLower === 'employee';

    // Redirect admin to admin dashboard if they access /dashboard
    if (this.isAdmin) {
      this.router.navigate(['/admin']);
      return;
    }

    // Load dashboard data for managers
    if (this.isManager) {
      this.loadDashboardData();
    }
    
    // Load customers and managers for edit modals
    this.loadCustomers();
    this.loadManagers();
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

  loadDashboardData(): void {
    this.loadProjects();
    this.loadTasks();
    this.loadTimeEntries();
  }

  loadProjects(): void {
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        // Filter projects: show only those where manager is assigned, has tasks, or created by manager
        const managerEmail = this.authService.getEmail();
        const managerProjects: any[] = [];
        let checkedProjects = 0;

        if (projects.length === 0) {
          this.totalProjects = 0;
          this.myProjects = 0;
          this.recentProjects = [];
          return;
        }

        projects.forEach((project: any) => {
          // Check if manager is assigned to project
          if (project.manager_id === this.currentUserId) {
            managerProjects.push(project);
            checkedProjects++;
            if (checkedProjects === projects.length) {
              this.updateProjectMetrics(managerProjects);
            }
            return;
          }

          // Check if manager has tasks in this project
          this.adminService.getTasks(project.id).subscribe({
            next: (tasks) => {
              // Check if any task is assigned by this manager or created by manager
              const hasManagerTasks = tasks.some((task: any) => {
                // Task assigned by manager (assigned_by matches manager email)
                if (task.assigned_by === managerEmail) {
                  return true;
                }
                // Task created by manager (if created_by field exists)
                if (task.created_by === managerEmail || task.created_by === this.currentUserId) {
                  return true;
                }
                return false;
              });

              if (hasManagerTasks && !managerProjects.find(p => p.id === project.id)) {
                managerProjects.push(project);
              }

              checkedProjects++;
              if (checkedProjects === projects.length) {
                this.updateProjectMetrics(managerProjects);
              }
            },
            error: (err) => {
              console.error(`Error loading tasks for project ${project.id}:`, err);
              checkedProjects++;
              if (checkedProjects === projects.length) {
                this.updateProjectMetrics(managerProjects);
              }
            }
          });
        });
      },
      error: (err) => {
        console.error('Error loading projects:', err);
      }
    });
  }

  updateProjectMetrics(managerProjects: any[]): void {
    // Update total projects count to show only projects manager can work on
    this.totalProjects = managerProjects.length;
    
    // Count projects where current user is the manager (My Projects)
    this.myProjects = managerProjects.filter((p: any) => p.manager_id === this.currentUserId).length;
    
    // Get 5 most recent projects that manager can work on
    this.recentProjects = managerProjects
      .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
      .slice(0, 5);
  }

  loadTasks(): void {
    // Load tasks only from projects manager can work on
    const managerEmail = this.authService.getEmail();
    
    if (!managerEmail) {
      this.totalTasks = 0;
      this.recentTasks = [];
      return;
    }

    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const allTasks: any[] = [];
        const managerProjectIds = new Set<number>();
        let checkedProjects = 0;

        if (projects.length === 0) {
          this.totalTasks = 0;
          this.recentTasks = [];
          return;
        }

        // First, identify which projects manager can work on
        projects.forEach((project: any) => {
          // Check if manager is assigned to project
          if (project.manager_id === this.currentUserId) {
            managerProjectIds.add(project.id);
            checkedProjects++;
            if (checkedProjects === projects.length) {
              this.loadTasksFromProjects(Array.from(managerProjectIds), managerEmail);
            }
            return;
          }

          // Check if manager has tasks in this project
          this.adminService.getTasks(project.id).subscribe({
            next: (tasks) => {
              const hasManagerTasks = tasks.some((task: any) => {
                return task.assigned_by === managerEmail || 
                       task.created_by === managerEmail || 
                       task.created_by === this.currentUserId;
              });

              if (hasManagerTasks) {
                managerProjectIds.add(project.id);
              }

              checkedProjects++;
              if (checkedProjects === projects.length) {
                this.loadTasksFromProjects(Array.from(managerProjectIds), managerEmail);
              }
            },
            error: (err) => {
              console.error(`Error loading tasks for project ${project.id}:`, err);
              checkedProjects++;
              if (checkedProjects === projects.length) {
                this.loadTasksFromProjects(Array.from(managerProjectIds), managerEmail);
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

  loadTasksFromProjects(projectIds: number[], managerEmail: string): void {
    if (projectIds.length === 0) {
      this.totalTasks = 0;
      this.recentTasks = [];
      return;
    }

    const allTasks: any[] = [];
    let loadedProjects = 0;

    projectIds.forEach((projectId) => {
      this.adminService.getTasks(projectId).subscribe({
        next: (tasks) => {
          // Filter tasks: only show tasks assigned by manager or created by manager
          const managerTasks = tasks.filter((task: any) => {
            return task.assigned_by === managerEmail || 
                   task.created_by === managerEmail || 
                   task.created_by === this.currentUserId;
          }).map((task: any) => {
            // Determine task type: created by manager or assigned to manager by others
            const isCreatedByManager = task.created_by === managerEmail || task.created_by === this.currentUserId;
            const isAssignedByManager = task.assigned_by === managerEmail;
            
            // If created_by is null/empty and assigned_by matches manager, it's created by manager
            // If assigned_by exists and matches manager, it's assigned by manager
            // If assigned_by doesn't match manager but created_by matches, it's created by manager
            // Otherwise, if assigned_by exists but doesn't match, it's assigned to manager by others
            let taskType = 'created_by_manager';
            if (!isCreatedByManager && task.assigned_by && task.assigned_by !== managerEmail) {
              taskType = 'assigned_by_others';
            } else if (isAssignedByManager && !isCreatedByManager) {
              taskType = 'assigned_by_manager';
            } else if (isCreatedByManager) {
              taskType = 'created_by_manager';
            }
            
            return {
              ...task,
              taskType: taskType
            };
          });
          
          allTasks.push(...managerTasks);
          loadedProjects++;
          
          if (loadedProjects === projectIds.length) {
            this.totalTasks = allTasks.length;
            // Get 5 most recent tasks
            this.recentTasks = allTasks
              .sort((a: any, b: any) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime())
              .slice(0, 5);
          }
        },
        error: (err) => {
          console.error(`Error loading tasks for project ${projectId}:`, err);
          loadedProjects++;
          if (loadedProjects === projectIds.length) {
            this.totalTasks = allTasks.length;
            this.recentTasks = allTasks
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

  getStatusLabel(status: string): string {
    if (!status) return 'Pending';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('in_progress') || statusLower.includes('in-progress')) {
      return 'In_progress';
    }
    return status;
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

  getTaskTypeLabel(task: any): string {
    if (!task.taskType) {
      // Determine task type if not set
      const managerEmail = this.authService.getEmail();
      const isCreatedByManager = task.created_by === managerEmail || task.created_by === this.currentUserId;
      const isAssignedByManager = task.assigned_by === managerEmail;
      
      if (isCreatedByManager) {
        return 'Created by me';
      } else if (isAssignedByManager) {
        return 'Assigned by me';
      } else if (task.assigned_by && task.assigned_by !== managerEmail) {
        return 'Assigned to me';
      }
      return 'Created by me';
    }
    
    switch (task.taskType) {
      case 'created_by_manager':
        return 'Created by me';
      case 'assigned_by_manager':
        return 'Assigned by me';
      case 'assigned_by_others':
        return 'Assigned to me';
      default:
        return 'Created by me';
    }
  }

  getTaskTypeClass(task: any): string {
    if (!task.taskType) {
      return 'task-type-created';
    }
    
    switch (task.taskType) {
      case 'created_by_manager':
        return 'task-type-created';
      case 'assigned_by_manager':
        return 'task-type-assigned';
      case 'assigned_by_others':
        return 'task-type-received';
      default:
        return 'task-type-created';
    }
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

    // Prepare update data with only required fields
    // Match the exact format used in ProjectsComponent.updateProjectStatus
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
    
    // Handle custom_fields - get from project or parse if string
    let customFields = null;
    if (project.custom_fields !== null && project.custom_fields !== undefined) {
      if (typeof project.custom_fields === 'string' && project.custom_fields.trim() !== '') {
        try {
          customFields = JSON.parse(project.custom_fields);
        } catch (e) {
          // If parsing fails, skip custom_fields
          customFields = null;
        }
      } else if (typeof project.custom_fields === 'object') {
        customFields = project.custom_fields;
      }
    }
    
    if (customFields && typeof customFields === 'object' && Object.keys(customFields).length > 0) {
      updateData.custom_fields = customFields;
    }

    console.log('Updating project with data:', JSON.stringify(updateData, null, 2)); // Debug log
    console.log('Project ID:', project.id);

    this.adminService.updateProject(project.id, updateData).subscribe({
      next: () => {
        // Update local project status
        project.status = newStatus;
        this.projectStatusDropdownOpen = null;
        this.toastService.show(`Project status updated to ${this.getStatusDisplayName(newStatus)}`, 'success');
      },
      error: (err) => {
        console.error('Error updating project status:', err);
        console.error('Project data:', project);
        console.error('Update data sent:', updateData);
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

    // Prepare update data with only required fields
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
    if (task.custom_fields) {
      // Handle custom_fields - if it's a string, try to parse it, otherwise use as is
      let customFields = task.custom_fields;
      if (typeof customFields === 'string') {
        try {
          customFields = JSON.parse(customFields);
        } catch (e) {
          // If parsing fails, skip custom_fields
          customFields = null;
        }
      }
      if (customFields && typeof customFields === 'object' && Object.keys(customFields).length > 0) {
        updateData.custom_fields = customFields;
      }
    }

    this.adminService.updateTask(task.id, updateData).subscribe({
      next: () => {
        // Update local task status
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
    // Load full project details and open modal
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        const fullProject = projects.find((p: any) => p.id === project.id);
        if (fullProject) {
          this.selectedProjectForDetails = fullProject;
          this.showProjectDetailsModal = true;
          this.loadProjectComments(fullProject.id);
        } else {
          // Fallback to current project data
          this.selectedProjectForDetails = project;
          this.showProjectDetailsModal = true;
          this.loadProjectComments(project.id);
        }
      },
      error: (err) => {
        console.error('Error loading project details:', err);
        // Fallback to current project data
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
            allocated_time: fullProject.allocated_time || '',
            region: fullProject.region || ''
          };
          this.showEditProjectModal = true;
          this.editProjectError = '';
        } else {
          // Fallback to current project data
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
        // Fallback to current project data
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
        // Reload projects
        this.loadProjects();
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
      // Extract YYYY-MM-DD from various formats
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
            // Fallback to current task data
            this.selectedTaskForDetails = task;
            this.showTaskDetailsModal = true;
            this.loadTaskComments(task.id);
          }
        },
        error: (err) => {
          console.error('Error loading task details:', err);
          // Fallback to current task data
          this.selectedTaskForDetails = task;
          this.showTaskDetailsModal = true;
          this.loadTaskComments(task.id);
        }
      });
    } else {
      // No project_id, use current task data
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
  
  formatHistoryValue(fieldName: string, value: any): string {
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    
    // Format dates
    if (fieldName.includes('date') || fieldName.includes('Date')) {
      return this.formatDate(value);
    }
    
    // Format booleans
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
            // Fallback to current task data
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
          // Fallback to current task data
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
      // No project_id, use current task data
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
        // Reload tasks
        this.loadTasks();
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
}
