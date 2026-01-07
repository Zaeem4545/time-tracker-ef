import { Component, OnInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ManagerService } from '../../services/manager.service';
import { DynamicFormService, DynamicField } from '../../services/dynamic-form.service';
import { ToastNotificationService } from '../../services/toast-notification.service';
import { ConfirmationModalService } from '../../services/confirmation-modal.service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  projects: any[] = [];
  filteredProjects: any[] = []; // All projects (search removed)
  groupedProjects: { [key: string]: any[] } = {}; // Grouped projects for display
  searchTerm: string = ''; // Search term for filtering projects
  showSearchDropdown: boolean = false; // Control dropdown visibility
  showSearchSuggestions: boolean = false; // Control search suggestions dropdown
  groupBy: string[] = []; // Current grouping options (multiple selection)
  activeFilters: string[] = []; // Current active filters (multiple selection)
  statusFilters: string[] = []; // Active status filters (multiple selection)
  showStatusColumn: boolean = false; // Show status column on project rows
  showTaskStatusColumn: boolean = false; // Show status column on task rows
  statusDropdownOpen: number | null = null; // Track which project's status dropdown is open
  projectStatusDropdownOpen: number | null = null; // Track which project's status dropdown is open in table
  selectedSearchOption: string = ''; // Selected search option type
  startDateFilter: string = ''; // Filter by start date
  endDateFilter: string = ''; // Filter by end date
  showStartDatePicker: boolean = false; // Show start date picker
  showEndDatePicker: boolean = false; // Show end date picker
  showManagerFilter: boolean = false; // Show manager filter dropdown
  selectedManagerFilter: number | null = null; // Selected manager for filtering
  showRegionDropdown: boolean = false; // Show region dropdown in Group By
  selectedRegionFilter: string | null = null; // Selected region for filtering
  availableRegions: string[] = []; // Available regions from projects and tasks
  users: any[] = [];
  newProject: any = {};
  showCreateProjectModal: boolean = false;
  createProjectError: string = ''; // Error message for create form
  customers: any[] = []; // Store customer data
  projectFormFields: DynamicField[] = [
    { id: 'name', name: 'name', label: 'Project Name', type: 'text', placeholder: 'Project Name', required: true, order: 0, nonDeletable: true },
    { id: 'description', name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description', required: true, order: 1, nonDeletable: true },
    { id: 'customer_id', name: 'customer_id', label: 'Customer', type: 'select', placeholder: 'Select Customer', required: true, order: 2, nonDeletable: true },
    { id: 'start_date', name: 'start_date', label: 'Start Date', type: 'date', placeholder: 'Start Date', required: false, order: 3, nonDeletable: true },
    { id: 'end_date', name: 'end_date', label: 'End Date', type: 'date', placeholder: 'End Date', required: false, order: 4, nonDeletable: true },
    { id: 'allocated_time', name: 'allocated_time', label: 'Allocated Time', type: 'text', placeholder: 'HH:MM:SS', required: false, order: 5, nonDeletable: true },
    { id: 'attachment', name: 'attachment', label: 'Attachment', type: 'file', placeholder: 'Upload File', required: false, order: 6, nonDeletable: true }
  ];
  
  // Store original dates to preserve them exactly
  originalProjectDates: { [key: number]: { start_date: string; end_date: string } } = {};
  
  // Project editing
  editingProject: number | null = null;
  editProjectData: { [key: number]: any } = {}; // For inline editing in table
  editProjectError: { [key: number]: string } = {}; // For inline editing errors
  modalEditProjectData: any = {}; // For modal editing (matches dashboard)
  modalEditProjectError: string = ''; // For modal editing errors
  managers: any[] = []; // Managers list for assignment dropdown
  showEditProjectModal: boolean = false; // Show edit project modal
  selectedProjectForEdit: any | null = null; // Project being edited in modal
  selectedAttachmentFile: File | null = null;
  
  // Tasks management
  expandedProjects: Set<number> = new Set();
  projectTasks: { [key: number]: any[] } = {};
  newTask: { [key: number]: any } = {};
  selectedProjectForTaskModal: number | null = null;
  showTaskModal: boolean = false;
  
  // Project details modal
  selectedProjectForDetails: any | null = null;
  showProjectDetailsModal: boolean = false;
  projectComments: any[] = [];
  newComment: string = '';
  loadingComments: boolean = false;
  editingProjectCommentId: number | null = null;
  editingProjectCommentText: string = '';
  
  // Task history modal
  showTaskHistoryModal: boolean = false;
  projectHistory: any[] = [];
  loadingHistory: boolean = false;
  
  // Task-specific history modal
  showTaskHistoryModalForTask: boolean = false;
  taskHistory: any[] = [];
  loadingTaskHistory: boolean = false;
  selectedTaskForHistory: any | null = null;
  taskFormFields: DynamicField[] = [
    { id: 'title', name: 'title', label: 'Task Title', type: 'text', placeholder: 'Task Title', required: true, order: 0, nonDeletable: true },
    { id: 'description', name: 'description', label: 'Description', type: 'textarea', placeholder: 'Task Description', required: false, order: 1, nonDeletable: true },
    { id: 'status', name: 'status', label: 'Status', type: 'select', placeholder: 'Status', required: false, order: 2, nonDeletable: true, options: [
      { value: 'pending', label: 'Pending' },
      { value: 'in-progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' }
    ]},
    { id: 'assigned_to', name: 'assigned_to', label: 'Assign To', type: 'select', placeholder: 'Assign To (Optional)', required: false, order: 3, nonDeletable: true },
    { id: 'assigned_by', name: 'assigned_by', label: 'Assigned By', type: 'text', placeholder: 'Assigned By (Optional)', required: false, order: 4, nonDeletable: true },
    { id: 'due_date', name: 'due_date', label: 'Due Date', type: 'date', placeholder: 'Due Date (Optional)', required: false, order: 5, nonDeletable: true },
    { id: 'allocated_time', name: 'allocated_time', label: 'Allocated Time', type: 'text', placeholder: 'HH:MM:SS', required: false, order: 6, nonDeletable: true }
  ];
  editingTask: number | null = null;
  showEditTaskModal: boolean = false; // Show edit task modal with dynamic form
  selectedTaskForEdit: any | null = null; // Task being edited in modal
  selectedTaskForDetails: any | null = null; // Task being viewed in details modal
  showTaskDetailsModal: boolean = false;
  openTaskMenuId: number | null = null; // Track which task menu is open
  taskComments: any[] = [];
  newTaskComment: string = '';
  loadingTaskComments: boolean = false;
  editingTaskCommentId: number | null = null;
  editingTaskCommentText: string = '';
  editTaskData: { [key: number]: { title: string; description: string; status: string; assigned_to: number | string | null; assigned_by: string; due_date: string; allocated_time?: string; custom_fields?: any } } = {};
  teamMembers: any[] = []; // Team members for managers
  employeeTasks: any[] = []; // All tasks for employees
  
  // Time tracking
  selectedTaskForTimeTracking: number | null = null;
  taskTimeTracking: any[] = [];

  // Project selection for head managers
  selectedProjectIds: Set<number> = new Set();
  currentUserRole: string | null = null;
  currentUserId: number | null = null;
  isHeadManager: boolean = false;
  isManager: boolean = false;
  isAdmin: boolean = false;
  isEmployee: boolean = false;
  projectSelectionError: { [key: number]: string } = {}; // Error messages for project selection
  selectedManagers: any[] = []; // Managers confirmed in head manager dashboard
  editingManagerAssignment: { [key: number]: boolean } = {}; // Track which project's manager assignment is being edited
  isCreateMode: boolean = false; // Track if component is in create-only mode

  constructor(
    private adminService: AdminService, 
    private authService: AuthService,
    private managerService: ManagerService,
    private router: Router,
    private route: ActivatedRoute,
    private dynamicFormService: DynamicFormService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastNotificationService,
    private confirmationService: ConfirmationModalService
  ) {}

  isMyProjectsMode: boolean = false; // New mode for "My Projects and Tasks"

  ngOnInit(): void {
    // Check if we're in create mode (from /create-project route)
    this.isCreateMode = this.router.url === '/create-project' || this.route.snapshot.data['mode'] === 'create';
    // Check if we're in "My Projects and Tasks" mode
    this.isMyProjectsMode = this.router.url === '/my-projects-tasks' || this.route.snapshot.data['mode'] === 'my-projects';
    
    this.currentUserRole = this.authService.getRole();
    this.currentUserId = this.authService.getUserId();
    this.isHeadManager = this.currentUserRole?.toLowerCase() === 'head manager';
    this.isManager = this.currentUserRole?.toLowerCase() === 'manager';
    this.isAdmin = this.currentUserRole?.toLowerCase() === 'admin';
    this.isEmployee = this.currentUserRole?.toLowerCase() === 'employee';
    
    // Don't auto-open create form in create mode - let user click button to show it
    // Form will be hidden by default, user clicks "Create Project" to show it
    
    // Initialize dynamic form for projects
    // Force reset form to ensure customer_id field is included
    this.dynamicFormService.resetForm('createProject', this.projectFormFields);
    
    this.loadUsers();
    // Load customers first, then projects to ensure customer names are available
    this.adminService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers || [];
        // Force reset form after customers are loaded to ensure customer_id field is present
        this.dynamicFormService.resetForm('createProject', this.projectFormFields);
        // Load projects after customers are loaded
        if (this.isMyProjectsMode && this.isHeadManager) {
          this.loadMyProjectsAndTasks();
        } else {
          this.loadProjects();
        }
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.customers = [];
        // Still load projects even if customers fail
        if (this.isMyProjectsMode && this.isHeadManager) {
          this.loadMyProjectsAndTasks();
        } else {
          this.loadProjects();
        }
      }
    });
    
    if (this.isHeadManager && !this.isCreateMode && !this.isMyProjectsMode) {
      this.loadSelectedProjects();
      this.loadSelectedManagers();
    }
    if (this.isManager) {
      this.loadTeamMembers();
    }
    if (this.isEmployee) {
      this.loadEmployeeTasks();
    }
    
    // Check for query parameters to open modals when navigating from dashboard
    this.route.queryParams.subscribe(params => {
      if (params['viewProject']) {
        const projectId = parseInt(params['viewProject']);
        // Wait for projects to load, then open modal
        const checkProject = () => {
          const project = this.projects.find(p => p.id === projectId);
          if (project) {
            this.viewProjectDetails(project);
            // Clear query param after opening
            this.router.navigate([], { queryParams: { viewProject: null }, queryParamsHandling: 'merge' });
          } else if (this.projects.length > 0) {
            // Projects loaded but project not found, try again after a short delay
            setTimeout(checkProject, 200);
          } else {
            // Projects not loaded yet, wait longer
            setTimeout(checkProject, 500);
          }
        };
        setTimeout(checkProject, 300);
      }
      
      if (params['editProject']) {
        const projectId = parseInt(params['editProject']);
        const checkProject = () => {
          const project = this.projects.find(p => p.id === projectId);
          if (project) {
            this.openEditProjectModal(project);
            // Clear query param after opening
            this.router.navigate([], { queryParams: { editProject: null }, queryParamsHandling: 'merge' });
          } else if (this.projects.length > 0) {
            setTimeout(checkProject, 200);
          } else {
            setTimeout(checkProject, 500);
          }
        };
        setTimeout(checkProject, 300);
      }
      
      if (params['viewTask'] && params['projectId']) {
        const taskId = parseInt(params['viewTask']);
        const projectId = parseInt(params['projectId']);
        const checkTask = () => {
          if (this.projectTasks[projectId]) {
            const task = this.projectTasks[projectId].find(t => t.id === taskId);
            if (task) {
              this.viewTaskDetails(task);
              this.router.navigate([], { queryParams: { viewTask: null, projectId: null }, queryParamsHandling: 'merge' });
            }
          } else {
            this.loadTasks(projectId);
            setTimeout(checkTask, 500);
          }
        };
        setTimeout(checkTask, 500);
      }
      
      if (params['editTask'] && params['projectId']) {
        const taskId = parseInt(params['editTask']);
        const projectId = parseInt(params['projectId']);
        const checkTask = () => {
          if (this.projectTasks[projectId]) {
            const task = this.projectTasks[projectId].find(t => t.id === taskId);
            if (task) {
              this.openEditTaskModal(task);
              this.router.navigate([], { queryParams: { editTask: null, projectId: null }, queryParamsHandling: 'merge' });
            }
          } else {
            this.loadTasks(projectId);
            setTimeout(checkTask, 500);
          }
        };
        setTimeout(checkTask, 500);
      }
    });
  }

  // Load users for task assignment dropdown
  loadUsers() { 
    this.adminService.getUsers().subscribe(users => {
      this.users = users.map((user: any) => ({
        ...user,
        role: (user.role || '').toLowerCase()
      }));
      // Filter managers for assignment dropdown
      this.managers = this.users.filter((user: any) => 
        user.role && user.role.toLowerCase() === 'manager'
      );
      // After loading users, load selected managers if head manager
      if (this.isHeadManager) {
        this.loadSelectedManagers();
      }
    });
  }

  // Load customers from customer details
  loadCustomers() {
    this.adminService.getCustomers().subscribe({
      next: (customers) => {
        this.customers = customers || [];
        // Force reset form after customers are loaded to ensure customer_id field is present
        this.dynamicFormService.resetForm('createProject', this.projectFormFields);
      },
      error: (err) => {
        console.error('Error loading customers:', err);
        this.customers = [];
      }
    });
  }

  // Get dynamic options for project form (customers)
  getProjectDynamicOptions(): { [fieldName: string]: { value: string; label: string }[] } {
    return {
      customer_id: this.customers.map(customer => ({
        value: customer.id.toString(),
        label: customer.name || `Customer ${customer.id}`
      }))
    };
  }

  // Get customer name by ID or from project data
  getCustomerName(customerId: number | string | null | undefined, project?: any): string {
    // First, check if project has customer_name from backend
    if (project && project.customer_name) {
      return project.customer_name;
    }
    
    if (!customerId || customerId === '' || customerId === null) return '';
    // Handle both number and string types
    const id = typeof customerId === 'string' ? parseInt(customerId) : customerId;
    if (!id || isNaN(id)) return '';
    // Find customer by ID - check both number and string comparison
    const customer = this.customers.find(c => {
      // Compare as numbers
      if (Number(c.id) === Number(id)) return true;
      // Compare as strings
      if (String(c.id) === String(id)) return true;
      return false;
    });
    if (customer && customer.name) {
      return customer.name;
    }
    // If customer not found, return empty string
    return '';
  }

  // Handle customer change in inline editing
  onCustomerChange(projectId: number, customerId: string | number | null): void {
    if (!customerId || customerId === '' || customerId === null) {
      // Clear region if customer is cleared
      if (this.editProjectData[projectId]) {
        this.editProjectData[projectId].region = '';
      }
      // Also update project objects
      const project = this.projects.find(p => p.id === projectId);
      if (project) {
        project.region = '';
      }
      const filteredProject = this.filteredProjects.find(p => p.id === projectId);
      if (filteredProject) {
        filteredProject.region = '';
      }
      Object.keys(this.groupedProjects).forEach(key => {
        const groupedProject = this.groupedProjects[key].find(p => p.id === projectId);
        if (groupedProject) {
          groupedProject.region = '';
        }
      });
      this.cdr.detectChanges();
      return;
    }
    
    const customerIdNum = typeof customerId === 'string' ? parseInt(customerId) : customerId;
    const selectedCustomer = this.customers.find(c => c.id === customerIdNum);
    
    if (!selectedCustomer) {
      console.warn('Customer not found:', customerIdNum);
      return;
    }
    
    if (this.editProjectData[projectId]) {
      // Auto-populate project name from customer's project_name
      if (selectedCustomer.project_name && (!this.editProjectData[projectId].name || this.editProjectData[projectId].name.trim() === '')) {
        this.editProjectData[projectId].name = selectedCustomer.project_name;
      }
      
      // Auto-populate region directly (not in custom_fields)
      this.editProjectData[projectId].region = selectedCustomer.region || '';
      
      // Also update the project object for immediate UI display
      const project = this.projects.find(p => p.id === projectId);
      if (project) {
        project.region = selectedCustomer.region || '';
        
        // Update in filteredProjects and groupedProjects for immediate UI update
        const filteredProject = this.filteredProjects.find(p => p.id === projectId);
        if (filteredProject) {
          filteredProject.region = selectedCustomer.region || '';
        }
        
        // Update in grouped projects
        Object.keys(this.groupedProjects).forEach(key => {
          const groupedProject = this.groupedProjects[key].find(p => p.id === projectId);
          if (groupedProject) {
            groupedProject.region = selectedCustomer.region || '';
          }
        });
      }
      
      // Force change detection to update UI immediately
      this.cdr.detectChanges();
    }
  }

  // Load team members for managers
  loadTeamMembers() {
    if (this.isManager) {
      this.managerService.getTeamMembers().subscribe({
        next: (members) => {
          this.teamMembers = members.map((member: any) => ({
            ...member,
            role: (member.role || '').toLowerCase()
          }));
        },
        error: (err) => {
          console.error('Error loading team members:', err);
          this.teamMembers = [];
        }
      });
    }
  }

  // Get only employees for task assignment
  getEmployees(task?: any): any[] {
    let employees: any[] = [];
    
    if (this.isManager) {
      // For managers, show only employees assigned to them (team members)
      employees = this.teamMembers.filter((member: any) => 
        member.role && member.role.toLowerCase() === 'employee'
      );
      
      // If editing a task and the assigned employee is not in teamMembers, include them from users list
      if (task && task.assigned_to) {
        const assignedEmployee = this.users.find((u: any) => 
          u.id === task.assigned_to && u.role && u.role.toLowerCase() === 'employee'
        );
        if (assignedEmployee && !employees.find((e: any) => e.id === assignedEmployee.id)) {
          employees.push(assignedEmployee);
        }
      }
    } else {
      // For admin, head manager, and employee, show all employees
      employees = this.users.filter((user: any) => 
        user.role && user.role.toLowerCase() === 'employee'
      );
    }
    
    return employees;
  }

  // Load managers that are confirmed in head manager dashboard
  loadSelectedManagers() {
    // Get managers from localStorage (stored by head manager dashboard, user-specific)
    const storageKey = `headManagerSelectedManagers_${this.currentUserId || 'default'}`;
    const storedManagerIds = localStorage.getItem(storageKey);
    if (storedManagerIds) {
      try {
        const managerIds = JSON.parse(storedManagerIds);
        this.selectedManagers = this.users.filter((user: any) => 
          user.role && user.role.toLowerCase() === 'manager' && managerIds.includes(user.id)
        );
      } catch (e) {
        console.error('Error parsing stored manager IDs:', e);
        this.selectedManagers = [];
      }
    } else {
      this.selectedManagers = [];
    }
  }

  // Project Management
  loadProjects() { 
    this.adminService.getProjects().subscribe(projects => {
      // Format dates for HTML date inputs (YYYY-MM-DD format)
      // Store original dates to preserve them exactly
      this.projects = projects.map((p: any) => {
        const startDate = this.extractDateOnly(p.start_date);
        const endDate = this.extractDateOnly(p.end_date);
        
        // Store original dates exactly as they come from database
        this.originalProjectDates[p.id] = {
          start_date: startDate,
          end_date: endDate
        };
        
        return {
          ...p,
          start_date: startDate,
          end_date: endDate,
          manager_id: p.manager_id || null, // Ensure manager_id is set
          customer_id: p.customer_id || null, // Ensure customer_id is preserved
          customer_name: p.customer_name || null // Store customer_name from backend
        };
      });
      // Initialize newTask for each project
      this.projects.forEach((p: any) => {
        if (!this.newTask[p.id]) {
          this.newTask[p.id] = { title: '', description: '', status: 'pending', assigned_to: '', assigned_by: '', due_date: '' };
        }
      });
      this.filteredProjects = this.projects; // Initialize filtered projects
      this.updateAvailableRegions(); // Update available regions
      this.applyFilters(); // Apply any active filters
    });
  }

  // Update available regions from projects and tasks
  updateAvailableRegions(): void {
    const regions = new Set<string>();
    
    // Extract regions from projects - use direct region column
    this.projects.forEach((project: any) => {
      // First check direct region column
      if (project.region && String(project.region).trim() !== '') {
        regions.add(String(project.region).trim());
      }
      // Also check custom_fields as fallback (for backward compatibility)
      const customFields = this.getProjectCustomFields(project);
      if (customFields) {
        const regionValue = customFields['region'] || customFields['Region'] || 
                           customFields['country'] || customFields['Country'];
        if (regionValue && String(regionValue).trim() !== '') {
          regions.add(String(regionValue).trim());
        }
      }
    });
    
    // Extract regions from tasks (if tasks have custom fields or region info)
    Object.keys(this.projectTasks).forEach(projectId => {
      const tasks = this.projectTasks[parseInt(projectId)];
      if (tasks && Array.isArray(tasks)) {
        tasks.forEach((task: any) => {
          // Check if task has custom_fields or region field
          if (task.custom_fields) {
            try {
              const taskCustomFields = typeof task.custom_fields === 'string' 
                ? JSON.parse(task.custom_fields) 
                : task.custom_fields;
              if (taskCustomFields) {
                const regionValue = taskCustomFields['region'] || taskCustomFields['Region'] || 
                                   taskCustomFields['country'] || taskCustomFields['Country'];
                if (regionValue && String(regionValue).trim() !== '') {
                  regions.add(String(regionValue).trim());
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          // Also check if task has a direct region field
          if (task.region && String(task.region).trim() !== '') {
            regions.add(String(task.region).trim());
          }
        });
      }
    });
    
    this.availableRegions = Array.from(regions).sort();
  }

  // Toggle region dropdown
  toggleRegionDropdown(): void {
    this.showRegionDropdown = !this.showRegionDropdown;
    if (this.showRegionDropdown) {
      this.updateAvailableRegions(); // Refresh regions when opening dropdown
    }
  }

  // Set region filter
  setRegionFilter(region: string | null): void {
    if (region === null || region === '') {
      this.selectedRegionFilter = null;
    } else {
      this.selectedRegionFilter = String(region).trim();
    }
    this.showRegionDropdown = false;
    this.applyFilters();
  }

  // Toggle status dropdown for a project
  toggleStatusDropdown(projectId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.statusDropdownOpen === projectId) {
      this.statusDropdownOpen = null;
    } else {
      this.statusDropdownOpen = projectId;
    }
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Close status dropdown if clicking outside
    if (this.statusDropdownOpen !== null) {
      if (!target.closest('.status-selector')) {
        this.statusDropdownOpen = null;
      }
    }
    
    // Close project status dropdown if clicking outside
    if (this.projectStatusDropdownOpen !== null) {
      if (!target.closest('.status-selector')) {
        this.projectStatusDropdownOpen = null;
      }
    }
    
    // Close search dropdown if clicking outside
    if (!target.closest('.search-container-top')) {
      this.showSearchDropdown = false;
    }
    
    // Close task menu if clicking outside
    if (this.openTaskMenuId !== null) {
      if (!target.closest('.task-menu-container')) {
        this.openTaskMenuId = null;
      }
    }
  }

  // Toggle search dropdown
  toggleSearchDropdown(): void {
    this.showSearchDropdown = !this.showSearchDropdown;
    // Close date pickers when closing dropdown
    if (!this.showSearchDropdown) {
      this.showStartDatePicker = false;
      this.showEndDatePicker = false;
    }
  }

  // Apply filter (toggle multiple selection)
  applyFilter(filterType: string): void {
    const index = this.activeFilters.indexOf(filterType);
    if (index > -1) {
      // Remove filter if already selected
      this.activeFilters.splice(index, 1);
    } else {
      // Add filter if not selected
      this.activeFilters.push(filterType);
    }
    this.applyFilters();
  }

  // Remove specific filter
  removeFilter(filterType: string): void {
    const index = this.activeFilters.indexOf(filterType);
    if (index > -1) {
      this.activeFilters.splice(index, 1);
      this.applyFilters();
    }
  }

  // Check if filter is active
  isFilterActive(filterType: string): boolean {
    return this.activeFilters.includes(filterType);
  }

  // Set group by option (toggle multiple selection)
  setGroupBy(option: string): void {
    const index = this.groupBy.indexOf(option);
    if (index > -1) {
      // Remove group by if already selected
      this.groupBy.splice(index, 1);
    } else {
      // Add group by if not selected
      this.groupBy.push(option);
    }
    
    // Show status column when status is selected in group by
    this.showStatusColumn = this.groupBy.includes('status');
    
    this.applyFilters();
  }

  // Remove specific group by option
  removeGroupBy(option: string): void {
    const index = this.groupBy.indexOf(option);
    if (index > -1) {
      this.groupBy.splice(index, 1);
      this.applyFilters();
    }
  }

  // Check if group by is active
  isGroupByActive(option: string): boolean {
    return this.groupBy.includes(option);
  }

  // Apply status filter (toggle multiple selection)
  applyStatusFilter(statusType: string): void {
    const index = this.statusFilters.indexOf(statusType);
    if (index > -1) {
      // Remove status filter if already selected
      this.statusFilters.splice(index, 1);
    } else {
      // Add status filter if not selected
      this.statusFilters.push(statusType);
    }
    // Show status column when status filters are active
    this.showStatusColumn = this.statusFilters.length > 0;
    this.showTaskStatusColumn = this.statusFilters.length > 0;
    this.applyFilters();
  }

  // Remove specific status filter
  removeStatusFilter(statusType: string): void {
    const index = this.statusFilters.indexOf(statusType);
    if (index > -1) {
      this.statusFilters.splice(index, 1);
      // Hide status column when no status filters are active
      this.showStatusColumn = this.statusFilters.length > 0;
      this.showTaskStatusColumn = this.statusFilters.length > 0;
      this.applyFilters();
    }
  }

  // Check if status filter is active
  isStatusFilterActive(statusType: string): boolean {
    return this.statusFilters.includes(statusType);
  }

  // Get status display name
  getStatusDisplayName(statusType: string): string {
    const statusNames: { [key: string]: string } = {
      'on-track': 'On Track',
      'at-risk': 'At Risk',
      'off-track': 'Off Track',
      'on-hold': 'On Hold',
      'completed': 'Completed',
      'maintenance': 'Maintenance',
    };
    return statusNames[statusType] || statusType;
  }

  // Get filter display name
  getFilterDisplayName(filterType: string): string {
    const filterNames: { [key: string]: string } = {
      'my-projects': 'My Projects',
      'my-favorites': 'My Favorites',
      'unassigned': 'Unassigned',
      'timesheets-over-100': 'Timesheets > 100%',
      'archived': 'Archived',
      'maintenance': 'Maintenance',
      'on-track': 'On Track',
      'at-risk': 'At Risk',
      'off-track': 'Off Track',
      'on-hold': 'On Hold'
    };
    return filterNames[filterType] || filterType;
  }

  // Get group by display name
  getGroupByDisplayName(option: string): string {
    const groupByNames: { [key: string]: string } = {
      'project-manager': 'Project Manager',
      'status': 'Status',
      'tags': 'Tags',
      'custom-group': 'Custom Group'
    };
    return groupByNames[option] || option;
  }

  // Apply all filters and search
  applyFilters(): void {
    let filtered = [...this.projects];

    // Apply region filter first (if selected)
    if (this.selectedRegionFilter !== null && this.selectedRegionFilter !== '') {
      filtered = filtered.filter((project: any) => {
        // First check direct region column
        if (project.region && String(project.region).toLowerCase().trim() === String(this.selectedRegionFilter).toLowerCase().trim()) {
          return true;
        }
        // Also check custom_fields as fallback (for backward compatibility)
        const customFields = this.getProjectCustomFields(project);
        if (customFields) {
          const regionValue = customFields['region'] || customFields['Region'] || 
                             customFields['country'] || customFields['Country'];
          if (regionValue && String(regionValue).toLowerCase().trim() === String(this.selectedRegionFilter).toLowerCase().trim()) {
            return true;
          }
        }
        return false;
      });
    }

    // Apply manager filter first (if selected)
    if (this.selectedManagerFilter !== null) {
      filtered = filtered.filter((p: any) => p.manager_id === this.selectedManagerFilter);
    }

    // Apply search filter
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter((project: any) => {
        // If manager filter is selected, automatically search by manager
        if (this.selectedManagerFilter !== null) {
          // Search in manager name (also check email as fallback)
          if (project.manager_name && project.manager_name.toLowerCase().includes(searchLower)) {
            return true;
          }
          if (project.manager_email && project.manager_email.toLowerCase().includes(searchLower)) {
            return true;
          }
          return false;
        }
        // If specific search option is selected, search only in that field
        if (this.selectedSearchOption === 'project') {
          return project.name && project.name.toLowerCase().includes(searchLower);
        } else if (this.selectedSearchOption === 'manager') {
          // Search in manager name (also check email as fallback)
          if (project.manager_name && project.manager_name.toLowerCase().includes(searchLower)) {
            return true;
          }
          if (project.manager_email && project.manager_email.toLowerCase().includes(searchLower)) {
            return true;
          }
          return false;
        } else if (this.selectedSearchOption === 'region') {
          // Search in region field
          if (project.region && String(project.region).toLowerCase().includes(searchLower)) {
            return true;
          }
          // Also check custom fields for region (backward compatibility)
          const customFields = this.getProjectCustomFields(project);
          if (customFields) {
            for (const key in customFields) {
              const lowerKey = key.toLowerCase();
              if ((lowerKey === 'region' || lowerKey.includes('region')) && 
                  String(customFields[key]).toLowerCase().includes(searchLower)) {
                return true;
              }
            }
          }
          return false;
        } else if (this.selectedSearchOption === 'customer') {
          // Search by customer name using customer_id
          if (project.customer_id) {
            const customerName = this.getCustomerName(project.customer_id, project);
            if (customerName && customerName.toLowerCase().includes(searchLower)) {
              return true;
            }
          }
          // Also check custom fields for customer (backward compatibility)
          const customFields = this.getProjectCustomFields(project);
          if (customFields) {
            for (const key in customFields) {
              const lowerKey = key.toLowerCase();
              if ((lowerKey === 'customer' || lowerKey.includes('customer')) && 
                  String(customFields[key]).toLowerCase().includes(searchLower)) {
                return true;
              }
            }
          }
          return false;
        } else if (this.selectedSearchOption === 'tasks') {
          // Search in tasks (title, description, and status)
          const tasks = this.projectTasks[project.id] || [];
          return tasks.some((task: any) => {
            return (task.title && task.title.toLowerCase().includes(searchLower)) ||
                   (task.description && task.description.toLowerCase().includes(searchLower)) ||
                   (task.status && task.status.toLowerCase().includes(searchLower));
          });
        } else {
          // Default: search in all fields
          if (project.name && project.name.toLowerCase().includes(searchLower)) return true;
          if (project.description && project.description.toLowerCase().includes(searchLower)) return true;
          if (project.manager_name && project.manager_name.toLowerCase().includes(searchLower)) return true;
          if (project.manager_email && project.manager_email.toLowerCase().includes(searchLower)) return true;
          // Search by customer name
          if (project.customer_id) {
            const customerName = this.getCustomerName(project.customer_id, project);
            if (customerName && customerName.toLowerCase().includes(searchLower)) return true;
          }
          // Search in custom fields
          const customFields = this.getProjectCustomFields(project);
          if (customFields) {
            for (const key in customFields) {
              const value = customFields[key];
              if (value && String(value).toLowerCase().includes(searchLower)) return true;
            }
          }
          // Search in tasks/activities
          const tasks = this.projectTasks[project.id] || [];
          if (tasks.some((task: any) => {
            return (task.title && task.title.toLowerCase().includes(searchLower)) ||
                   (task.description && task.description.toLowerCase().includes(searchLower));
          })) return true;
          return false;
        }
      });
    }

    // Hide archived projects by default (only show when archived filter is selected)
    const hasArchivedFilter = this.activeFilters.includes('archived');
    if (!hasArchivedFilter) {
      filtered = filtered.filter((p: any) => !(p.archived === 1 || p.archived === true));
    }

    // Hide maintenance projects by default (only show when maintenance filter is selected)
    const hasMaintenanceFilter = this.activeFilters.includes('maintenance');
    if (!hasMaintenanceFilter) {
      filtered = filtered.filter((p: any) => (p.status || 'on-track') !== 'maintenance');
    }

    // Apply active filters (multiple selection)
    this.activeFilters.forEach(filterType => {
      if (filterType === 'my-projects') {
        // Filter to show only projects assigned to current user
        if (this.isManager) {
          filtered = filtered.filter((p: any) => p.manager_id === this.currentUserId);
        }
      } else if (filterType === 'unassigned') {
        filtered = filtered.filter((p: any) => !p.manager_id || p.manager_id === null);
      } else if (filterType === 'archived') {
        // Filter to show only archived projects
        filtered = filtered.filter((p: any) => p.archived === 1 || p.archived === true);
      } else if (filterType === 'maintenance') {
        // Filter to show only maintenance projects
        filtered = filtered.filter((p: any) => (p.status || 'on-track') === 'maintenance');
      } else if (filterType === 'my-favorites') {
        // Filter to show only favorite projects (if favorites are implemented)
        // For now, this can be a placeholder or you can implement favorites logic
        // filtered = filtered.filter((p: any) => this.isFavorite(p.id));
      } else if (filterType === 'timesheets-over-100') {
        // Filter projects with timesheets > 100% (if this logic exists)
        // filtered = filtered.filter((p: any) => this.getTimesheetPercentage(p) > 100);
      }
    });

    // Apply status filters (multiple selection)
    if (this.statusFilters.length > 0) {
      filtered = filtered.filter((p: any) => {
        const projectStatus = p.status || 'on-track'; // Default to 'on-track' if status is null
        return this.statusFilters.includes(projectStatus);
      });
    }

    // Apply date filters
    if (this.startDateFilter) {
      filtered = filtered.filter((project: any) => {
        const projectStartDate = this.extractDateOnly(project.start_date);
        return projectStartDate === this.startDateFilter;
      });
    }

    if (this.endDateFilter) {
      filtered = filtered.filter((project: any) => {
        const projectEndDate = this.extractDateOnly(project.end_date);
        return projectEndDate === this.endDateFilter;
      });
    }

    // Apply grouping
    if (this.groupBy.includes('project-manager')) {
      this.groupedProjects = {};
      filtered.forEach((project: any) => {
        const managerId = project.manager_id || 'unassigned';
        const managerKey = managerId === 'unassigned' ? 'unassigned' : `manager-${managerId}`;
        if (!this.groupedProjects[managerKey]) {
          this.groupedProjects[managerKey] = [];
        }
        this.groupedProjects[managerKey].push(project);
      });
      // Sort groups: unassigned first, then by manager name
      const sortedGroups: { [key: string]: any[] } = {};
      const keys = Object.keys(this.groupedProjects).sort((a, b) => {
        if (a === 'unassigned') return -1;
        if (b === 'unassigned') return 1;
        const managerA = this.getManagerName(a.replace('manager-', ''));
        const managerB = this.getManagerName(b.replace('manager-', ''));
        return managerA.localeCompare(managerB);
      });
      keys.forEach(key => {
        sortedGroups[key] = this.groupedProjects[key];
      });
      this.groupedProjects = sortedGroups;
    } else {
      this.groupedProjects = {};
    }
    
    this.filteredProjects = filtered;
    
    // Preserve expanded projects that are still in the filtered list
    const filteredProjectIds = new Set(filtered.map((p: any) => p.id));
    const expandedToKeep = new Set<number>();
    this.expandedProjects.forEach(projectId => {
      if (filteredProjectIds.has(projectId)) {
        expandedToKeep.add(projectId);
      }
    });
    this.expandedProjects = expandedToKeep;
  }

  // Set manager filter
  setManagerFilter(managerId: number | null | string): void {
    if (managerId === null || managerId === 'null' || managerId === '') {
      this.selectedManagerFilter = null;
    } else {
      this.selectedManagerFilter = typeof managerId === 'string' ? parseInt(managerId) : managerId;
    }
    this.showManagerFilter = false; // Close dropdown after selection
    this.applyFilters();
  }

  // Clear manager filter
  clearManagerFilter(): void {
    this.selectedManagerFilter = null;
    this.showManagerFilter = false; // Close dropdown
    this.applyFilters();
  }

  // Get manager name by ID
  getManagerName(managerId: number | null | string): string {
    if (!managerId || managerId === 'unassigned' || managerId === 'null') return 'Not assigned';
    const id = typeof managerId === 'string' ? parseInt(managerId) : managerId;
    if (isNaN(id)) return 'Not assigned';
    const manager = this.managers.find((m: any) => m.id === id);
    return manager ? (manager.email || manager.name || `Manager ${id}`) : `Manager ${id}`;
  }

  // Get grouped projects keys for iteration
  getGroupedProjectKeys(): string[] {
    return Object.keys(this.groupedProjects);
  }

  // Check if grouping by project manager is active
  isGroupedByManager(): boolean {
    return this.groupBy.includes('project-manager');
  }

  // Handle search input changes
  onSearchChange(): void {
    this.applyFilters();
  }

  // Handle search input changes with suggestions
  onSearchInputChange(): void {
    this.showSearchSuggestions = !!(this.searchTerm && this.searchTerm.trim() !== '');
    this.applyFilters();
  }

  // Handle search input blur
  onSearchBlur(): void {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  // Apply search option
  applySearchOption(option: string): void {
    this.selectedSearchOption = option;
    this.showSearchSuggestions = false;
    
    // Apply specific search based on option
    if (option === 'project') {
      // Search in project names
      this.applyFilters();
    } else if (option === 'region') {
      // Search in region field
      this.applyFilters();
    } else if (option === 'manager') {
      // Search in project manager names
      this.applyFilters();
    } else if (option === 'customer') {
      // Search in customer field (if exists)
      this.applyFilters();
    } else if (option === 'tasks') {
      // Search in tasks
      this.applyFilters();
    }
  }

  // Date filter functions
  toggleStartDatePicker(): void {
    this.showStartDatePicker = !this.showStartDatePicker;
    if (this.showStartDatePicker) {
      this.showEndDatePicker = false;
      this.showManagerFilter = false;
    }
  }

  toggleEndDatePicker(): void {
    this.showEndDatePicker = !this.showEndDatePicker;
    if (this.showEndDatePicker) {
      this.showStartDatePicker = false;
      this.showManagerFilter = false;
    }
  }

  toggleManagerFilter(): void {
    this.showManagerFilter = !this.showManagerFilter;
    if (this.showManagerFilter) {
      this.showStartDatePicker = false;
      this.showEndDatePicker = false;
    }
  }

  applyDateFilter(type: 'start' | 'end'): void {
    this.applyFilters();
    // Close the date picker after selection
    if (type === 'start') {
      this.showStartDatePicker = false;
    } else {
      this.showEndDatePicker = false;
    }
  }

  clearStartDateFilter(): void {
    this.startDateFilter = '';
    this.showStartDatePicker = false;
    this.applyFilters();
  }

  clearEndDateFilter(): void {
    this.endDateFilter = '';
    this.showEndDatePicker = false;
    this.applyFilters();
  }

  // Load all tasks for employee
  loadEmployeeTasks() {
    console.log('Loading employee tasks...');
    this.adminService.getEmployeeTasks().subscribe({
      next: (tasks) => {
        console.log('Employee tasks received:', tasks);
        // Normalize status values - convert "in_progress" back to "in-progress" for display
        this.employeeTasks = tasks.map((task: any) => ({
          ...task,
          status: task.status === 'in_progress' ? 'in-progress' : task.status,
          assigned_to_email: task.assigned_to_email || null
        }));
        console.log('Employee tasks after normalization:', this.employeeTasks);
      },
      error: (err) => {
        console.error('Error loading employee tasks:', err);
        this.toastService.show('Error loading tasks: ' + (err.error?.message || err.message || 'Unknown error'), 'error');
        this.employeeTasks = [];
      }
    });
  }

  // Format date for display (e.g., "Jan 15, 2024")
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

  // Convert HH:MM:SS to total seconds
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

  // Convert total seconds to HH:MM:SS format
  secondsToTime(totalSeconds: number): string {
    if (!totalSeconds || totalSeconds < 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  // Calculate remaining allocated time for a project
  getRemainingAllocatedTime(project: any): string {
    if (!project || !project.allocated_time) return '';
    
    const projectSeconds = this.timeToSeconds(project.allocated_time);
    if (projectSeconds === 0) return '';
    
    // Get all tasks for this project
    const tasks = this.projectTasks[project.id] || [];
    let totalTaskSeconds = 0;
    tasks.forEach((task: any) => {
      if (task.allocated_time) {
        totalTaskSeconds += this.timeToSeconds(task.allocated_time);
      }
    });
    
    const remainingSeconds = projectSeconds - totalTaskSeconds;
    return this.secondsToTime(remainingSeconds);
  }

  // Extract date only (YYYY-MM-DD) without timezone conversion (for input fields)
  extractDateOnly(date: any): string {
    if (!date) return '';
    
    // If it's already in YYYY-MM-DD format, return as is (no conversion needed)
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // If it's a string with time component (ISO format), extract just the date part
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0];
    }
    
    // If it's a string with space separator (MySQL datetime format), extract date part
    if (typeof date === 'string' && date.includes(' ')) {
      return date.split(' ')[0];
    }
    
    // Try to extract YYYY-MM-DD pattern from any string
    if (typeof date === 'string') {
      const dateMatch = date.match(/^\d{4}-\d{2}-\d{2}/);
      if (dateMatch) {
        return dateMatch[0];
      }
    }
    
    // Last resort: parse as Date but use UTC to avoid timezone issues
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Use UTC methods to avoid timezone conversion
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    
    // Pad with leading zeros manually
    const monthStr = month < 10 ? '0' + month : String(month);
    const dayStr = day < 10 ? '0' + day : String(day);
    
    return `${year}-${monthStr}-${dayStr}`;
  }
  
  openCreateProjectModal() {
    this.newProject = {};
    this.createProjectError = '';
    this.showCreateProjectModal = true;
  }

  closeCreateProjectModal() {
    this.showCreateProjectModal = false;
    this.newProject = {};
    this.createProjectError = '';
    if (this.newProject.attachment) {
      this.newProject.attachment = null;
    }
  }

  // Validate dates: start_date should not be greater than end_date
  validateDates(startDate: string, endDate: string): string {
    if (!startDate || !endDate) {
      return ''; // If either date is empty, validation passes (dates are optional)
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return ''; // Invalid dates, let the browser handle it
    }
    
    if (start > end) {
      return 'Date is not correct, Please choose the correct Date.';
    }
    
    return '';
  }

  onProjectFormDataChange(data: any): void {
    this.newProject = { ...data };
    // Auto-populate region when customer is selected
    if (data.customer_id && !data.region) {
      const customerIdNum = typeof data.customer_id === 'string' ? parseInt(data.customer_id) : data.customer_id;
      const selectedCustomer = this.customers.find(c => c.id === customerIdNum);
      if (selectedCustomer && selectedCustomer.region) {
        this.newProject.region = selectedCustomer.region;
      }
    }
  }

  createProject() {
    // Clear previous error
    this.createProjectError = '';
    
    // Validate required fields
    if (!this.newProject.name || this.newProject.name.trim() === '') {
      this.createProjectError = 'Project name is required';
      return;
    }
    if (!this.newProject.description || this.newProject.description.trim() === '') {
      this.createProjectError = 'Description is required';
      return;
    }
    if (!this.newProject.customer_id || this.newProject.customer_id === '' || this.newProject.customer_id === null) {
      this.createProjectError = 'Customer is required';
      return;
    }
    
    // Validate dates if they exist
    if (this.newProject.start_date || this.newProject.end_date) {
      const dateError = this.validateDates(this.newProject.start_date, this.newProject.end_date);
      if (dateError) {
        this.createProjectError = dateError;
        return;
      }
    }
    
    // Build project data
    const projectData: any = {
      name: this.newProject.name.trim(),
      description: this.newProject.description.trim(),
      customer_id: typeof this.newProject.customer_id === 'string' ? parseInt(this.newProject.customer_id) : this.newProject.customer_id,
      start_date: this.newProject.start_date || null,
      end_date: this.newProject.end_date || null,
      status: this.newProject.status || 'on-track',
      allocated_time: this.newProject.allocated_time || null
    };
    
    // Auto-populate region from customer if not provided
    if (!this.newProject.region && projectData.customer_id) {
      const selectedCustomer = this.customers.find(c => c.id === projectData.customer_id);
      if (selectedCustomer && selectedCustomer.region) {
        projectData.region = selectedCustomer.region;
      }
    } else if (this.newProject.region) {
      projectData.region = this.newProject.region;
    }
    
    // Upload file first if attachment exists
    if (this.newProject.attachment && this.newProject.attachment instanceof File) {
      this.adminService.uploadFile(this.newProject.attachment).subscribe({
        next: (uploadResponse) => {
          if (uploadResponse.success && uploadResponse.file) {
            projectData.attachment = uploadResponse.file.path;
            this.createProjectWithData(projectData);
          } else {
            this.createProjectError = 'Failed to upload attachment';
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.message || err?.message || 'Failed to upload attachment';
          this.createProjectError = errorMessage;
        }
      });
    } else {
      // No attachment, create project directly
      this.createProjectWithData(projectData);
    }
  }
  
  private createProjectWithData(projectData: any): void {
    this.adminService.createProject(projectData).subscribe({
      next: () => {
        this.toastService.show('Project created successfully', 'success');
        this.newProject = {};
        this.createProjectError = '';
        this.showCreateProjectModal = false;
        // Reload customers first, then projects to ensure customer names are available
        this.adminService.getCustomers().subscribe({
          next: (customers) => {
            this.customers = customers || [];
            this.loadProjects();
          },
          error: (err) => {
            console.error('Error loading customers:', err);
            this.loadProjects(); // Still load projects even if customers fail
          }
        });
        // Stay on create-project page if in create mode (don't navigate away)
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to create project';
        this.createProjectError = errorMessage;
      }
    });
  }
  
  // Open edit project modal
  openEditProjectModal(project: any): void {
    // Ensure history modal is closed when opening edit modal
    this.showTaskHistoryModal = false;
    this.projectHistory = [];
    
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
          this.modalEditProjectError = '';
          // Load comments for edit modal (don't load history automatically)
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
          this.modalEditProjectError = '';
          // Load comments for edit modal (don't load history automatically)
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
          manager_id: project.manager_id || null,
          customer_id: project.customer_id ? project.customer_id.toString() : null,
          allocated_time: project.allocated_time || ''
        };
        this.selectedAttachmentFile = null;
        this.showEditProjectModal = true;
        this.modalEditProjectError = '';
        // Load comments for edit modal (don't load history automatically)
        this.loadProjectComments(project.id);
      }
    });
  }

  // Close edit project modal
  closeEditProjectModal(): void {
    this.showEditProjectModal = false;
    this.selectedProjectForEdit = null;
    this.modalEditProjectData = {};
    this.modalEditProjectError = '';
    this.selectedAttachmentFile = null;
    // Close history modal if open
    this.showTaskHistoryModal = false;
    this.projectHistory = [];
    // Clear comments
    this.projectComments = [];
    this.newComment = '';
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
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

  onCreateAttachmentChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.newProject.attachment = file;
    }
  }


  editProject(project: any) {
    this.editingProject = project.id;
    // Use original dates if available, otherwise use current project dates
    const originalDates = this.originalProjectDates[project.id] || { start_date: '', end_date: '' };
    const customFields = this.getProjectCustomFields(project) || {};
    
    // Initialize custom_fields object with all existing custom field names
    const allCustomFieldNames = this.getAllProjectCustomFieldNames();
    const initializedCustomFields: any = {};
    allCustomFieldNames.forEach((fieldName: string) => {
      initializedCustomFields[fieldName] = customFields[fieldName] || '';
    });
    
    // Ensure region is included in custom_fields if it exists in project
    if (customFields['region']) {
      initializedCustomFields['region'] = customFields['region'];
    }
    
    // If customer is selected, get region from customer
    if (project.customer_id) {
      const customer = this.customers.find(c => c.id === project.customer_id);
      if (customer && customer.region) {
        initializedCustomFields['region'] = customer.region;
      }
    }
    
    this.editProjectData[project.id] = {
      name: project.name,
      description: project.description || '',
      status: project.status || 'on-track', // Include status with default
      archived: project.archived === 1 || project.archived === true, // Include archived status
      start_date: originalDates.start_date || project.start_date || '', // Use original date exactly
      end_date: originalDates.end_date || project.end_date || '', // Use original date exactly
      manager_id: project.manager_id || null, // Include manager_id
      customer_id: project.customer_id ? project.customer_id.toString() : null, // Include customer_id
      allocated_time: project.allocated_time || '', // Include allocated_time
      attachment: project.attachment || '', // Include attachment
      custom_fields: initializedCustomFields // Include custom fields with all field names initialized
    };
    this.editProjectError[project.id] = ''; // Clear any previous error
  }
  
  cancelEdit(projectId: number) {
    this.editingProject = null;
    delete this.editProjectData[projectId];
    delete this.editProjectError[projectId]; // Clear error
    // Reload to restore original values
    this.loadProjects();
  }
  
  // Save project from modal (matches dashboard structure)
  saveProject(): void {
    if (!this.selectedProjectForEdit) return;
    
    const projectId = this.selectedProjectForEdit.id;
    const data = this.modalEditProjectData;
    
    // Validation
    if (!data.name || data.name.trim() === '') {
      this.modalEditProjectError = 'Project name is required';
      return;
    }
    if (!data.description || data.description.trim() === '') {
      this.modalEditProjectError = 'Description is required';
      return;
    }
    if (!data.customer_id || data.customer_id === '' || data.customer_id === null) {
      this.modalEditProjectError = 'Customer is required';
      return;
    }
    
    // Prepare update data
    const customerId = typeof data.customer_id === 'string' ? parseInt(data.customer_id) : data.customer_id;
    // Preserve existing manager_id (not editable in modal)
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
            this.modalEditProjectError = 'Failed to upload attachment';
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.message || err?.message || 'Failed to upload attachment';
          this.modalEditProjectError = errorMessage;
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
        // Reload customers first, then projects to ensure customer names are available
        this.adminService.getCustomers().subscribe({
          next: (customers) => {
            this.customers = customers || [];
            this.loadProjects();
          },
          error: (err) => {
            console.error('Error loading customers:', err);
            this.loadProjects(); // Still load projects even if customers fail
          }
        });
      },
      error: (err) => {
        console.error('Error updating project:', err);
        const errorMessage = err?.error?.message || err?.error?.error || err?.message || 'Failed to update project';
        this.modalEditProjectError = errorMessage;
      }
    });
  }
  
  // Save project from inline editing (table)
  saveProjectInline(projectId: number): void {
    const editData = this.editProjectData[projectId];
    
    // Clear previous error
    this.editProjectError[projectId] = '';
    
    if (!editData || !editData.name || editData.name.trim() === '') {
      this.editProjectError[projectId] = 'Project name is required';
      return;
    }
    
    // Validate customer_id is required
    if (!editData.customer_id || editData.customer_id === '' || editData.customer_id === null) {
      this.editProjectError[projectId] = 'Customer is required';
      return;
    }
    
    // Validate dates
    const dateError = this.validateDates(editData.start_date, editData.end_date);
    if (dateError) {
      this.editProjectError[projectId] = dateError;
      return;
    }
    
    // Get original dates to preserve them exactly
    const originalDates = this.originalProjectDates[projectId] || { start_date: '', end_date: '' };
    
    // Use original dates if the current dates match (to prevent timezone shifts)
    const normalizeDate = (date: string) => {
      if (!date) return '';
      if (date.includes('T')) return date.split('T')[0];
      if (date.includes(' ')) return date.split(' ')[0];
      return date.substring(0, 10);
    };
    
    const currentStartDate = normalizeDate(editData.start_date || '');
    const currentEndDate = normalizeDate(editData.end_date || '');
    const originalStartDate = normalizeDate(originalDates.start_date || '');
    const originalEndDate = normalizeDate(originalDates.end_date || '');
    
    const finalStartDate = (currentStartDate === originalStartDate && originalStartDate) 
      ? originalStartDate 
      : (currentStartDate || null);
    const finalEndDate = (currentEndDate === originalEndDate && originalEndDate) 
      ? originalEndDate 
      : (currentEndDate || null);
    
    // Prepare custom_fields
    const customFields: any = {};
    if (editData.custom_fields && typeof editData.custom_fields === 'object') {
      Object.keys(editData.custom_fields).forEach(key => {
        const value = editData.custom_fields[key];
        if (value !== undefined && value !== null && value !== '') {
          customFields[key] = typeof value === 'string' ? value.trim() : value;
        }
      });
    }
    
    // Convert customer_id to number if it's a string
    let customerId: number | null = null;
    if (editData.customer_id) {
      customerId = typeof editData.customer_id === 'string' ? parseInt(editData.customer_id) : editData.customer_id;
    }
    
    const originalProject = this.projects.find(p => p.id === projectId);
    const originalAttachment = originalProject?.attachment || null;
    
    const attachmentFile = editData.attachment instanceof File ? editData.attachment : null;
    let existingAttachment: string | null = null;
    if (editData.attachment && typeof editData.attachment === 'string' && editData.attachment.trim() !== '') {
      existingAttachment = editData.attachment;
    } else if (attachmentFile === null && (editData.attachment === '' || editData.attachment === null || editData.attachment === undefined)) {
      existingAttachment = null;
    } else if (attachmentFile === null) {
      existingAttachment = originalAttachment;
    }
    
    // Upload file first if it's a new file
    if (attachmentFile) {
      this.adminService.uploadFile(attachmentFile).subscribe({
        next: (uploadResponse) => {
          if (uploadResponse.success && uploadResponse.file) {
            this.updateProjectWithDataInline(projectId, editData, customFields, customerId, finalStartDate, finalEndDate, uploadResponse.file.path);
          } else {
            this.editProjectError[projectId] = 'Failed to upload attachment';
          }
        },
        error: (err) => {
          const errorMessage = err?.error?.message || err?.message || 'Failed to upload attachment';
          this.editProjectError[projectId] = errorMessage;
        }
      });
    } else {
      this.updateProjectWithDataInline(projectId, editData, customFields, customerId, finalStartDate, finalEndDate, existingAttachment);
    }
  }
  
  private updateProjectWithDataInline(projectId: number, editData: any, customFields: any, customerId: number | null, finalStartDate: string | null, finalEndDate: string | null, attachment: string | null): void {
    const dataToSend: any = {
      name: editData.name,
      description: editData.description || '',
      status: editData.status || 'on-track',
      archived: editData.archived || false,
      start_date: finalStartDate,
      end_date: finalEndDate,
      manager_id: editData.manager_id || null,
      customer_id: customerId,
      region: editData.region || null,
      allocated_time: editData.allocated_time || null,
      attachment: attachment || null
    };
    
    if (Object.keys(customFields).length > 0) {
      dataToSend.custom_fields = customFields;
    }
    
    this.adminService.updateProject(projectId, dataToSend).subscribe({
      next: () => {
        this.toastService.show('Project updated successfully', 'success');
        this.editingProject = null;
        delete this.editProjectData[projectId];
        delete this.editProjectError[projectId];
        this.adminService.getCustomers().subscribe({
          next: (customers) => {
            this.customers = customers || [];
            this.loadProjects();
          },
          error: (err) => {
            console.error('Error loading customers:', err);
            this.loadProjects();
          }
        });
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update project';
        this.editProjectError[projectId] = errorMessage;
      }
    });
  }

  // Update project status directly (without entering edit mode)
  updateProjectStatus(project: any, newStatus: string): void {
    // Don't update if status is already the same
    if (project.status === newStatus) {
      return;
    }
    
    // Convert customer_id to number if it's a string
    let customerId: number | null = null;
    if (project.customer_id) {
      customerId = typeof project.customer_id === 'string' ? parseInt(project.customer_id) : project.customer_id;
    }
    
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: newStatus,
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: customerId,
      archived: project.archived === 1 || project.archived === true
    };
    
    // Include custom_fields if they exist
    const customFields = this.getProjectCustomFields(project);
    if (customFields && Object.keys(customFields).length > 0) {
      dataToSend.custom_fields = customFields;
    }
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        // Update local project status for immediate UI feedback
        project.status = newStatus;
        // Update in filteredProjects and groupedProjects for immediate UI update
        const filteredProject = this.filteredProjects.find(p => p.id === project.id);
        if (filteredProject) {
          filteredProject.status = newStatus;
        }
        // Update in grouped projects
        Object.keys(this.groupedProjects).forEach(key => {
          const groupedProject = this.groupedProjects[key].find(p => p.id === project.id);
          if (groupedProject) {
            groupedProject.status = newStatus;
          }
        });
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update project status';
        this.toastService.show('Error updating project status: ' + errorMessage, 'error');
      }
    });
  }

  // Toggle project archived status
  toggleProjectArchived(project: any): void {
    const newArchivedStatus = !(project.archived === 1 || project.archived === true);
    
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: project.status || 'on-track',
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null, // Include customer_id to preserve it
      region: project.region || null, // Include region to preserve it
      allocated_time: project.allocated_time || null, // Include allocated_time to preserve it
      archived: newArchivedStatus
    };
    
    // Include custom_fields if they exist
    const customFields = this.getProjectCustomFields(project);
    if (customFields && Object.keys(customFields).length > 0) {
      dataToSend.custom_fields = customFields;
    }
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        // Update local project archived status for immediate UI feedback
        project.archived = newArchivedStatus ? 1 : 0;
        // Reload to ensure consistency - loadProjects() will automatically call applyFilters()
        this.loadProjects();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update archived status';
        this.toastService.show('Error updating archived status: ' + errorMessage, 'error');
      }
    });
  }

  toggleTaskArchived(task: any): void {
    const projectId = this.getProjectIdForTask(task.id);
    const newArchivedStatus = !(task.archived === 1 || task.archived === true);

    // Normalize status - convert "in-progress" to "in_progress" for database compatibility
    let normalizedStatus = task.status || 'pending';
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }

    // Build update data
    let assignedToValue = null;
    if (task.assigned_to && task.assigned_to !== '' && task.assigned_to !== null) {
      assignedToValue = typeof task.assigned_to === 'string' ? parseInt(task.assigned_to) : Number(task.assigned_to);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }

    const updateData: any = {
      title: task.title,
      description: task.description,
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || null,
      due_date: task.due_date || null,
      archived: newArchivedStatus
    };

    this.adminService.updateTask(task.id, updateData).subscribe({
      next: () => {
        task.archived = newArchivedStatus ? 1 : 0;
        this.loadTasks(projectId);
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update archived status';
        this.toastService.show('Error updating archived status: ' + errorMessage, 'error');
      }
    });
  }

  // Toggle task menu dropdown
  toggleTaskMenu(taskId: number, event: Event): void {
    event.stopPropagation();
    if (this.openTaskMenuId === taskId) {
      this.openTaskMenuId = null;
    } else {
      this.openTaskMenuId = taskId;
    }
  }

  // Close task menu
  closeTaskMenu(): void {
    this.openTaskMenuId = null;
  }
  
  deleteProject(projectId: number) {
    // Employees cannot delete projects
    if (this.isEmployee) {
      return;
    } 
    this.confirmationService.show({
      title: 'Delete Project',
      message: 'Delete project? This will also delete all tasks.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.adminService.deleteProject(projectId).subscribe(() => {
          delete this.projectTasks[projectId];
          delete this.newTask[projectId];
          this.expandedProjects.delete(projectId);
          this.loadProjects();
          this.toastService.show('Project deleted successfully', 'success');
        });
      }
    });
  }

  // Tasks Management
  toggleTasks(projectId: number) {
    if (this.expandedProjects.has(projectId)) {
      this.expandedProjects.delete(projectId);
      this.selectedTaskForTimeTracking = null;
    } else {
      this.expandedProjects.add(projectId);
      // Ensure team members are loaded for managers before loading tasks
      if (this.isManager && this.teamMembers.length === 0) {
        this.loadTeamMembers();
      }
      this.loadTasks(projectId);
    }
  }

  loadTasks(projectId: number) {
    this.adminService.getTasks(projectId).subscribe(tasks => {
      // Ensure team members are loaded for managers when tasks are loaded
      if (this.isManager && this.teamMembers.length === 0) {
        this.loadTeamMembers();
      }
      // Normalize status values - convert "in_progress" back to "in-progress" for display
      // Also ensure assigned_to_email is preserved from backend
      // Filter out archived tasks by default (only show when archived filter is selected)
      const hasArchivedFilter = this.activeFilters.includes('archived');
      let filteredTasks = tasks;
      if (!hasArchivedFilter) {
        filteredTasks = tasks.filter((task: any) => !(task.archived === 1 || task.archived === true));
      } else {
        filteredTasks = tasks.filter((task: any) => task.archived === 1 || task.archived === true);
      }
      
      this.projectTasks[projectId] = filteredTasks.map((task: any) => {
        // Parse custom_fields if it's a string
        let customFields = task.custom_fields;
        if (customFields && typeof customFields === 'string') {
          try {
            customFields = JSON.parse(customFields);
          } catch (e) {
            console.error('Error parsing task custom_fields:', e);
            customFields = {};
          }
        }
        if (!customFields || typeof customFields !== 'object') {
          customFields = {};
        }
        
        return {
          ...task,
          status: task.status === 'in_progress' ? 'in-progress' : task.status,
          // Preserve assigned_to_email from backend if available
          assigned_to_email: task.assigned_to_email || null,
          // Ensure custom_fields is always an object
          custom_fields: customFields
        };
      });
      
      // Update available regions after loading tasks
      this.updateAvailableRegions();
      
      // Trigger change detection to update custom field columns
      // This ensures getAllTaskCustomFieldNames() returns the latest custom fields
      setTimeout(() => {
        // Force Angular to detect changes for custom field columns
      }, 0);
      
      // Initialize dynamic form for task creation if not already done
      if (!this.newTask[projectId]) {
        this.newTask[projectId] = {};
        this.dynamicFormService.initializeForm(`createTask_${projectId}`, this.taskFormFields);
      }
    });
  }

  getTaskDynamicOptions(projectId: number): { [key: string]: { value: string; label: string }[] } {
    const employees = this.getEmployees();
    return {
      assigned_to: employees.map(emp => ({
        value: emp.id.toString(),
        label: `${emp.email} (${emp.role.charAt(0).toUpperCase() + emp.role.slice(1)})`
      }))
    };
  }

  onTaskFormDataChange(projectId: number, data: any): void {
    this.newTask[projectId] = { ...data };
  }

  openTaskModal(projectId: number): void {
    this.selectedProjectForTaskModal = projectId;
    this.showTaskModal = true;
    // Initialize task form if not already done
    if (!this.newTask[projectId]) {
      this.newTask[projectId] = {};
      this.dynamicFormService.initializeForm(`createTask_${projectId}`, this.taskFormFields);
    }
  }

  closeTaskModal(): void {
    this.showTaskModal = false;
  }

  getProjectName(projectId: number): string {
    const project = this.filteredProjects.find(p => p.id === projectId);
    return project ? project.name : '';
  }

  getProjectCustomFields(project: any): any {
    if (!project || !project.custom_fields) return null;
    try {
      let parsed: any = null;
      // Handle both string and object formats
      if (typeof project.custom_fields === 'string') {
        parsed = JSON.parse(project.custom_fields);
      } else if (typeof project.custom_fields === 'object') {
        parsed = project.custom_fields;
      }
      
      // Return null if parsed result is empty or null
      if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
        return null;
      }
      
      // Filter out system fields that shouldn't be displayed as custom fields
      const filtered: any = {};
      const excludedFields = ['archived', 'manager_id', 'custom_fields', 'custom_groups', 'allocated_time', 'status'];
      
      Object.keys(parsed).forEach(key => {
        // Exclude system fields and nested objects
        if (!excludedFields.includes(key.toLowerCase()) && 
            !excludedFields.includes(key) &&
            typeof parsed[key] !== 'object') {
          filtered[key] = parsed[key];
        }
      });
      
      // Return null if no valid custom fields remain
      if (Object.keys(filtered).length === 0) {
        return null;
      }
      
      return filtered;
    } catch (e) {
      console.error('Error parsing custom_fields:', e, project.custom_fields);
      return null;
    }
  }

  formatCustomFieldKey(key: any): string {
    if (typeof key === 'string') {
      // Check if it's an auto-generated field name like "Field 1766747078596"
      const fieldMatch = key.match(/^Field\s+(\d+)$/i);
      if (fieldMatch) {
        // Try to get the label from form configs
        const label = this.getFieldLabelFromConfigs(key);
        if (label && label !== key) {
          return label;
        }
        // If no label found, return a more user-friendly name
        return 'Custom Field';
      }
      // Try to get label from form configs first
      const label = this.getFieldLabelFromConfigs(key);
      if (label && label !== key) {
        return label;
      }
      // Format the key: capitalize first letter and replace underscores with spaces
      return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    }
    return String(key || '');
  }

  // Get field label from form configurations
  getFieldLabelFromConfigs(fieldName: string): string | null {
    try {
      // Try to get from localStorage directly
      const stored = localStorage.getItem('dynamicFormConfigs');
      if (stored) {
        try {
          const allConfigs = JSON.parse(stored);
          if (allConfigs && typeof allConfigs === 'object') {
            // Check all form configs
            for (const formId in allConfigs) {
              const config = allConfigs[formId];
              if (config && config.fields && Array.isArray(config.fields)) {
                const field = config.fields.find((f: any) => 
                  (f.name && f.name === fieldName) || 
                  (f.id && f.id === fieldName) ||
                  (f.name && String(f.name).toLowerCase() === String(fieldName).toLowerCase())
                );
                if (field && field.label && field.label.trim() !== '' && field.label !== fieldName) {
                  return field.label.trim();
                }
              }
            }
          }
        } catch (e) {
          console.error('Error parsing form configs from localStorage:', e);
        }
      }
    } catch (e) {
      console.error('Error getting field label from configs:', e);
    }
    return null;
  }

  // Get all unique custom field names from all projects
  getAllProjectCustomFieldNames(): string[] {
    const fieldNames = new Set<string>();
    this.filteredProjects.forEach((project: any) => {
      const customFields = this.getProjectCustomFields(project);
      if (customFields) {
        Object.keys(customFields).forEach(key => fieldNames.add(key));
      }
    });
    return Array.from(fieldNames).sort();
  }

  // Get custom field value for a project
  getProjectCustomFieldValue(project: any, fieldName: string): any {
    const customFields = this.getProjectCustomFields(project);
    return customFields ? customFields[fieldName] : null;
  }

  // Calculate total column count for project table (including custom fields)
  getProjectTableColumnCount(): number {
    const baseColumns = 8; // Name, Description, Customer, Region, Start Date, End Date, Allocated Time, Actions
    const statusColumn = this.showStatusColumn ? 1 : 0;
    const customFieldColumns = this.getAllProjectCustomFieldNames().length;
    return baseColumns + statusColumn + customFieldColumns;
  }

  // Get task custom fields
  getTaskCustomFields(task: any): any {
    if (!task || !task.custom_fields) return null;
    try {
      // Handle both string and object formats
      if (typeof task.custom_fields === 'string') {
        const parsed = JSON.parse(task.custom_fields);
        if (!parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0)) {
          return null;
        }
        return parsed;
      } else if (typeof task.custom_fields === 'object') {
        if (Object.keys(task.custom_fields).length === 0) {
          return null;
        }
        return task.custom_fields;
      }
      return null;
    } catch (e) {
      console.error('Error parsing task custom_fields:', e, task.custom_fields);
      return null;
    }
  }

  // Get all unique custom field names from all tasks
  getAllTaskCustomFieldNames(): string[] {
    const fieldNames = new Set<string>();
    Object.keys(this.projectTasks).forEach(projectId => {
      const tasks = this.projectTasks[parseInt(projectId)];
      if (tasks && Array.isArray(tasks)) {
        tasks.forEach((task: any) => {
          // Check both parsed custom_fields and direct custom_fields
          const customFields = this.getTaskCustomFields(task);
          if (customFields && typeof customFields === 'object') {
            Object.keys(customFields).forEach(key => {
              if (key && key.trim() !== '') {
                fieldNames.add(key);
              }
            });
          }
          // Also check if task has custom_fields directly as object
          if (task.custom_fields && typeof task.custom_fields === 'object' && !Array.isArray(task.custom_fields)) {
            Object.keys(task.custom_fields).forEach(key => {
              if (key && key.trim() !== '' && task.custom_fields[key] !== null && task.custom_fields[key] !== undefined && task.custom_fields[key] !== '') {
                fieldNames.add(key);
              }
            });
          }
        });
      }
    });
    return Array.from(fieldNames).sort();
  }

  // Get custom field value for a task
  getTaskCustomFieldValue(task: any, fieldName: string): any {
    const customFields = this.getTaskCustomFields(task);
    return customFields ? customFields[fieldName] : null;
  }

  viewProjectDetails(project: any) {
    this.selectedProjectForDetails = project;
    this.showProjectDetailsModal = true;
    this.newComment = '';
    this.loadProjectComments(project.id);
  }

  closeProjectDetailsModal() {
    this.showProjectDetailsModal = false;
    this.selectedProjectForDetails = null;
    this.projectComments = [];
    this.newComment = '';
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
    this.closeTaskHistoryModal();
  }

  openTaskHistoryModal() {
    // Support both view details and edit modal
    const projectId = this.selectedProjectForDetails?.id || this.selectedProjectForEdit?.id;
    if (!projectId) return;
    this.showTaskHistoryModal = true;
    this.loadProjectHistory(projectId);
  }

  closeTaskHistoryModal() {
    this.showTaskHistoryModal = false;
    this.projectHistory = [];
  }

  loadProjectHistory(projectId: number) {
    this.loadingHistory = true;
    this.projectHistory = [];
    this.adminService.getProjectHistory(projectId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.projectHistory = response.history || [];
        } else {
          this.toastService.show('Failed to load project history', 'error');
        }
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('Error loading project history:', err);
        this.toastService.show('Failed to load project history', 'error');
        this.loadingHistory = false;
      }
    });
  }

  formatFieldName(fieldName: string): string {
    const fieldMap: { [key: string]: string } = {
      'name': 'Name',
      'description': 'Description',
      'start_date': 'Start Date',
      'end_date': 'End Date',
      'manager_id': 'Manager',
      'status': 'Status',
      'archived': 'Archived',
      'customer_id': 'Customer',
      'region': 'Region',
      'allocated_time': 'Allocated Time',
      'attachment': 'Attachment',
      'title': 'Title',
      'assigned_to': 'Assigned To',
      'assigned_by': 'Assigned By',
      'due_date': 'Due Date'
    };
    return fieldMap[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  formatHistoryValue(fieldName: string, value: any): string {
    if (value === null || value === undefined || value === '') {
      return '(empty)';
    }
    
    // Handle boolean values
    if (value === 'true' || value === true || value === '1' || value === 1) {
      return 'Yes';
    }
    if (value === 'false' || value === false || value === '0' || value === 0) {
      return 'No';
    }
    
    // Handle dates
    if (fieldName.includes('date') || fieldName.includes('_date')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return this.formatDateForDisplay(value);
        }
      } catch (e) {
        // Not a valid date, continue
      }
    }
    
    // Handle manager_id or assigned_to - try to get user name
    if (fieldName === 'manager_id' || fieldName === 'assigned_to') {
      const userId = parseInt(value);
      if (!isNaN(userId)) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
          return user.name || user.email || value;
        }
      }
    }
    
    return String(value);
  }

  formatHistoryDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return dateString;
    }
  }

  updateProjectAllocatedTime() {
    if (!this.selectedProjectForDetails) return;
    
    const allocatedTime = this.selectedProjectForDetails.allocated_time;
    const projectId = this.selectedProjectForDetails.id;
    
    this.adminService.updateProject(projectId, { allocated_time: allocatedTime }).subscribe({
      next: () => {
        // Update local project data
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
          project.allocated_time = allocatedTime;
        }
        // Reload to ensure consistency
        this.loadProjects();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update allocated time';
        this.toastService.show('Error updating allocated time: ' + errorMessage, 'error');
      }
    });
  }

  loadProjectComments(projectId: number) {
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

  addComment() {
    // Support both view details and edit modal
    const project = this.selectedProjectForDetails || this.selectedProjectForEdit;
    if (!project || !this.newComment.trim()) {
      return;
    }

    const projectId = project.id;
    this.adminService.createProjectComment(projectId, this.newComment.trim()).subscribe({
      next: (response: any) => {
        if (response.success && response.comment) {
          this.projectComments.unshift(response.comment);
          this.newComment = '';
        }
      },
      error: (err) => {
        console.error('Error adding comment:', err);
        this.toastService.show('Failed to add comment. Please try again.', 'error');
      }
    });
  }

  isOwnProjectComment(comment: any): boolean {
    return comment.user_id === this.currentUserId;
  }

  startEditingProjectComment(comment: any) {
    if (!this.isOwnProjectComment(comment)) return;
    this.editingProjectCommentId = comment.id;
    this.editingProjectCommentText = comment.comment;
  }

  cancelEditingProjectComment() {
    this.editingProjectCommentId = null;
    this.editingProjectCommentText = '';
  }

  saveProjectComment(comment: any) {
    if (!this.selectedProjectForDetails || !this.editingProjectCommentText.trim()) {
      return;
    }

    const projectId = this.selectedProjectForDetails.id;
    this.adminService.updateProjectComment(projectId, comment.id, this.editingProjectCommentText.trim()).subscribe({
      next: (response: any) => {
        if (response.success && response.comment) {
          const index = this.projectComments.findIndex(c => c.id === comment.id);
          if (index !== -1) {
            this.projectComments[index] = response.comment;
          }
          this.cancelEditingProjectComment();
          this.toastService.show('Comment updated successfully', 'success');
        }
      },
      error: (err) => {
        console.error('Error updating comment:', err);
        this.toastService.show(err.error?.message || 'Failed to update comment. Please try again.', 'error');
      }
    });
  }

  deleteProjectComment(comment: any) {
    if (!this.selectedProjectForDetails || !this.isOwnProjectComment(comment)) {
      return;
    }

    this.confirmationService.show({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning'
    }).then((confirmed) => {
      if (confirmed) {
        const projectId = this.selectedProjectForDetails.id;
        this.adminService.deleteProjectComment(projectId, comment.id).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.projectComments = this.projectComments.filter(c => c.id !== comment.id);
              this.toastService.show('Comment deleted successfully', 'success');
            }
          },
          error: (err) => {
            console.error('Error deleting comment:', err);
            this.toastService.show(err.error?.message || 'Failed to delete comment. Please try again.', 'error');
          }
        });
      }
    });
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


  createTask(projectId: number) {
    const task = this.newTask[projectId];
    if (!task || !task.title || task.title.trim() === '') {
      this.toastService.show('Task title is required', 'warning');
      return;
    }
    
    // Ensure team members are loaded for managers (optional, for dropdown population)
    if (this.isManager && this.teamMembers.length === 0) {
      this.loadTeamMembers();
    }
    
    // Get form config to extract custom fields
    const config = this.dynamicFormService.getFormConfig(`createTask_${projectId}`);
    
    // Build task data - start with standard fields from task object
    const taskData: any = {
      project_id: projectId, // Always include project_id
      title: task.title?.trim() || '',
      description: task.description?.trim() || null,
      status: task.status || 'pending',
      assigned_to: task.assigned_to || null,
      assigned_by: task.assigned_by?.trim() || null,
      due_date: task.due_date || null,
      allocated_time: task.allocated_time?.trim() || null
    };
    
    // Extract custom fields from task object (everything that's not a standard field)
    const customFields: any = {};
    const standardFieldIds = ['title', 'description', 'status', 'assigned_to', 'assigned_by', 'due_date', 'allocated_time'];
    
    // Get all keys from task object
    Object.keys(task).forEach(key => {
      // Skip standard fields and empty values
      if (!standardFieldIds.includes(key) && task[key] !== undefined && task[key] !== null && task[key] !== '') {
        const value = task[key];
        const trimmedValue = typeof value === 'string' ? value.trim() : value;
        if (trimmedValue !== '') {
          customFields[key] = trimmedValue;
        }
      }
    });
    
    // Normalize status - convert "in-progress" to "in_progress" for database compatibility
    let normalizedStatus = taskData.status || 'pending';
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }
    taskData.status = normalizedStatus;
    
    // assigned_to is optional for all roles - convert to number if provided, otherwise null
    let assignedToValue = null;
    if (taskData.assigned_to && taskData.assigned_to !== '' && taskData.assigned_to !== null) {
      assignedToValue = parseInt(taskData.assigned_to);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }
    taskData.assigned_to = assignedToValue;
    
    // Ensure required fields
    if (!taskData.title || taskData.title.trim() === '') {
      this.toastService.show('Task title is required', 'warning');
      return;
    }
    
    // Add custom_fields if any exist
    if (Object.keys(customFields).length > 0) {
      taskData.custom_fields = customFields;
    }
    
    console.log('Creating task with data:', taskData);
    
    this.adminService.createTask(taskData).subscribe({
      next: () => {
        this.toastService.show('Task created successfully', 'success');
        this.newTask[projectId] = {};
        this.showTaskModal = false;
        this.loadTasks(projectId);
      },
      error: (err) => {
        console.error('Full error object:', err);
        console.error('Error status:', err.status);
        console.error('Error error:', err.error);
        const errorMessage = err?.error?.message || err?.message || 'Failed to create task';
        this.toastService.show('Error creating task: ' + errorMessage, 'error');
      }
    });
  }

  openEditTaskModal(task: any): void {
    // Ensure history modal is closed when opening edit modal
    this.showTaskHistoryModalForTask = false;
    this.taskHistory = [];
    
    this.selectedTaskForEdit = task;
    this.showEditTaskModal = true;
    
    // Ensure team members are loaded for managers before editing
    if (this.isManager && this.teamMembers.length === 0) {
      this.loadTeamMembers();
    }
    
    // Load comments for edit modal (don't load history automatically)
    this.loadTaskComments(task.id);
    
    // Get custom fields from task
    const customFields = this.getTaskCustomFields(task) || {};
    const allCustomFieldNames = this.getAllTaskCustomFieldNames();
    const initializedCustomFields: any = {};
    
    // Initialize all custom field names with existing values or empty strings
    allCustomFieldNames.forEach(fieldName => {
      initializedCustomFields[fieldName] = customFields[fieldName] || '';
    });
    
    // Also include any custom fields from the task that might not be in allCustomFieldNames
    Object.keys(customFields).forEach(key => {
      if (!initializedCustomFields[key]) {
        initializedCustomFields[key] = customFields[key];
      }
    });
    
    // Normalize status - convert legacy statuses to new format
    let normalizedStatus = task.status || 'on-track';
    if (normalizedStatus === 'pending' || normalizedStatus === 'in_progress' || normalizedStatus === 'in-progress') {
      normalizedStatus = 'on-track';
    }
    
    // Ensure assigned_to is a number or null
    let assignedToValue = null;
    if (task.assigned_to && task.assigned_to !== '' && task.assigned_to !== null) {
      assignedToValue = typeof task.assigned_to === 'string' ? parseInt(task.assigned_to) : Number(task.assigned_to);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }
    
    this.editTaskData[task.id] = {
      title: task.title || '',
      description: task.description || '',
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || '',
      due_date: this.extractDateOnly(task.due_date) || '',
      allocated_time: task.allocated_time || '',
      custom_fields: initializedCustomFields
    };
    
    // Initialize dynamic form for editing
    this.dynamicFormService.initializeForm(`editTask_${task.id}`, this.taskFormFields);
  }

  // Close edit task modal
  closeEditTaskModal(): void {
    this.showEditTaskModal = false;
    this.selectedTaskForEdit = null;
    // Close history modal if open
    this.showTaskHistoryModalForTask = false;
    this.taskHistory = [];
    this.selectedTaskForHistory = null;
    // Clear comments
    this.taskComments = [];
    this.newTaskComment = '';
    this.editingTaskCommentId = null;
    this.editingTaskCommentText = '';
  }

  viewTaskDetails(task: any) {
    this.selectedTaskForDetails = task;
    this.showTaskDetailsModal = true;
    this.newTaskComment = '';
    this.loadTaskComments(task.id);
  }

  closeTaskDetailsModal() {
    this.showTaskDetailsModal = false;
    this.selectedTaskForDetails = null;
    this.taskComments = [];
    this.newTaskComment = '';
    this.editingTaskCommentId = null;
    this.editingTaskCommentText = '';
    this.closeTaskHistoryModalForTask();
  }

  openTaskHistoryModalForTask() {
    // Support both view details and edit modal
    const task = this.selectedTaskForDetails || this.selectedTaskForEdit;
    if (!task) return;
    this.selectedTaskForHistory = task;
    this.showTaskHistoryModalForTask = true;
    this.loadTaskHistory(task.id);
  }

  closeTaskHistoryModalForTask() {
    this.showTaskHistoryModalForTask = false;
    this.taskHistory = [];
    this.selectedTaskForHistory = null;
  }

  loadTaskHistory(taskId: number) {
    this.loadingTaskHistory = true;
    this.taskHistory = [];
    this.adminService.getTaskHistory(taskId).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.taskHistory = response.history || [];
        } else {
          this.toastService.show('Failed to load task history', 'error');
        }
        this.loadingTaskHistory = false;
      },
      error: (err) => {
        console.error('Error loading task history:', err);
        this.toastService.show('Failed to load task history', 'error');
        this.loadingTaskHistory = false;
      }
    });
  }

  loadTaskComments(taskId: number) {
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

  addTaskComment() {
    // Support both view details and edit modal
    const task = this.selectedTaskForDetails || this.selectedTaskForEdit;
    if (!task || !this.newTaskComment.trim()) {
      return;
    }

    const taskId = task.id;
    this.adminService.createTaskComment(taskId, this.newTaskComment.trim()).subscribe({
      next: (response: any) => {
        if (response.success && response.comment) {
          this.taskComments.unshift(response.comment);
          this.newTaskComment = '';
        }
      },
      error: (err) => {
        console.error('Error adding task comment:', err);
        this.toastService.show('Failed to add comment. Please try again.', 'error');
      }
    });
  }

  isOwnTaskComment(comment: any): boolean {
    return comment.user_id === this.currentUserId;
  }

  startEditingTaskComment(comment: any) {
    if (!this.isOwnTaskComment(comment)) return;
    this.editingTaskCommentId = comment.id;
    this.editingTaskCommentText = comment.comment;
  }

  cancelEditingTaskComment() {
    this.editingTaskCommentId = null;
    this.editingTaskCommentText = '';
  }

  saveTaskComment(comment: any) {
    if (!this.selectedTaskForDetails || !this.editingTaskCommentText.trim()) {
      return;
    }

    const taskId = this.selectedTaskForDetails.id;
    this.adminService.updateTaskComment(taskId, comment.id, this.editingTaskCommentText.trim()).subscribe({
      next: (response: any) => {
        if (response.success && response.comment) {
          const index = this.taskComments.findIndex(c => c.id === comment.id);
          if (index !== -1) {
            this.taskComments[index] = response.comment;
          }
          this.cancelEditingTaskComment();
          this.toastService.show('Comment updated successfully', 'success');
        }
      },
      error: (err) => {
        console.error('Error updating comment:', err);
        this.toastService.show(err.error?.message || 'Failed to update comment. Please try again.', 'error');
      }
    });
  }

  deleteTaskComment(comment: any) {
    if (!this.selectedTaskForDetails || !this.isOwnTaskComment(comment)) {
      return;
    }

    this.confirmationService.show({
      title: 'Delete Comment',
      message: 'Are you sure you want to delete this comment? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning'
    }).then((confirmed) => {
      if (confirmed) {
        const taskId = this.selectedTaskForDetails.id;
        this.adminService.deleteTaskComment(taskId, comment.id).subscribe({
          next: (response: any) => {
            if (response.success) {
              this.taskComments = this.taskComments.filter(c => c.id !== comment.id);
              this.toastService.show('Comment deleted successfully', 'success');
            }
          },
          error: (err) => {
            console.error('Error deleting comment:', err);
            this.toastService.show(err.error?.message || 'Failed to delete comment. Please try again.', 'error');
          }
        });
      }
    });
  }

  // Handle edit task form data change
  onEditTaskFormDataChange(taskId: number, data: any): void {
    if (!this.editTaskData[taskId]) {
      this.editTaskData[taskId] = {
        title: '',
        description: '',
        status: 'on-track',
        assigned_to: null,
        assigned_by: '',
        due_date: '',
        allocated_time: '',
        custom_fields: {}
      };
    }
    this.editTaskData[taskId] = { ...this.editTaskData[taskId], ...data };
  }

  editTask(task: any) {
    // Redirect to modal
    this.openEditTaskModal(task);
  }

  saveTask(taskId: number): void {
    const taskData = this.editTaskData[taskId];
    if (!taskData) {
      this.toastService.show('Task data not found', 'error');
      return;
    }

    if (!taskData.title || taskData.title.trim() === '') {
      this.toastService.show('Task title is required', 'warning');
      return;
    }

    // Normalize status - convert "in-progress" to "in_progress" for database compatibility
    let normalizedStatus = taskData.status;
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }

    // assigned_to is optional - convert to number if provided, otherwise null
    let assignedToValue = null;
    const assignedTo = taskData.assigned_to;
    if (assignedTo !== null && assignedTo !== undefined) {
      if (typeof assignedTo === 'number' && assignedTo > 0) {
        assignedToValue = assignedTo;
      } else if (typeof assignedTo === 'string' && assignedTo.trim() !== '') {
        const parsed = parseInt(assignedTo);
        if (!isNaN(parsed) && parsed > 0) {
          assignedToValue = parsed;
        }
      }
    }

    const updateData: any = {
      title: taskData.title.trim(),
      description: taskData.description?.trim() || '',
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: taskData.assigned_by?.trim() || null,
      due_date: taskData.due_date || null,
      allocated_time: taskData.allocated_time?.trim() || null,
      custom_fields: taskData.custom_fields || {}
    };

    const projectId = this.getProjectIdForTask(taskId);
    this.adminService.updateTask(taskId, updateData).subscribe({
      next: () => {
        this.toastService.show('Task updated successfully', 'success');
        this.closeEditTaskModal();
        // Reload tasks to ensure consistency
        if (this.isEmployee) {
          this.loadEmployeeTasks();
        } else {
          this.loadTasks(projectId);
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update task';
        this.toastService.show('Error updating task: ' + errorMessage, 'error');
      }
    });
  }

  cancelTaskEdit(taskId: number) {
    this.editingTask = null;
    this.loadTasks(this.getProjectIdForTask(taskId));
  }

  getProjectIdForTask(taskId: number): number {
    for (const projectId in this.projectTasks) {
      if (this.projectTasks[projectId].some((t: any) => t.id === taskId)) {
        return Number(projectId);
      }
    }
    return 0;
  }

  getAssignedUserName(userId: number | null, task?: any): string {
    if (!userId) return '';
    
    // First try to use assigned_to_name from backend if available
    if (task && task.assigned_to_name) {
      return task.assigned_to_name;
    }
    
    // Fallback to looking up in users array
    const user = this.users.find(u => u.id === userId);
    return user ? (user.name || user.email || 'Unknown User') : '';
  }

  // Get user name from email (for assigned_by field which stores email)
  getUserNameFromEmail(email: string | null | undefined): string {
    if (!email) return 'Not provided';
    
    const user = this.users.find(u => u.email === email);
    return user ? (user.name || email) : email;
  }

  updateTask(task: any) {
    // For employees, assigned_to and assigned_by are not editable, so skip validation
    // For other roles, validate assigned_to is required
    if (!this.isEmployee) {
      if (!task.assigned_to || task.assigned_to === null || task.assigned_to === '') {
        this.toastService.show('Assigned To is required. Please select an employee.', 'warning');
        return;
      }
      
      // Ensure assigned_to is converted to number
      const assignedToValue = typeof task.assigned_to === 'string' ? parseInt(task.assigned_to) : Number(task.assigned_to);
      
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        this.toastService.show('Please select a valid employee.', 'warning');
        return;
      }
    }
    
    // Normalize status - convert "in-progress" to "in_progress" for database compatibility
    let normalizedStatus = task.status || 'pending';
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }
    
    // Build update data - assigned_to is optional for all roles
    let assignedToValue = null;
    if (task.assigned_to && task.assigned_to !== '' && task.assigned_to !== null) {
      assignedToValue = typeof task.assigned_to === 'string' ? parseInt(task.assigned_to) : Number(task.assigned_to);
      if (isNaN(assignedToValue) || assignedToValue <= 0) {
        assignedToValue = null;
      }
    }
    
    // Extract custom fields from task
    const customFields: any = {};
    if (task.custom_fields && typeof task.custom_fields === 'object') {
      Object.keys(task.custom_fields).forEach(key => {
        const value = task.custom_fields[key];
        if (value !== undefined && value !== null && value !== '') {
          customFields[key] = typeof value === 'string' ? value.trim() : value;
        }
      });
    }
    
    const updateData: any = {
      title: task.title,
      description: task.description,
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || null,
      due_date: task.due_date || null,
      allocated_time: task.allocated_time?.trim() || null
    };
    
    // Add custom_fields if any exist
    if (Object.keys(customFields).length > 0) {
      updateData.custom_fields = customFields;
    }
    
    const projectId = this.getProjectIdForTask(task.id);
    this.adminService.updateTask(task.id, updateData).subscribe({
      next: () => {
        this.toastService.show('Task updated successfully', 'success');
        this.editingTask = null;
        // Reload team members to ensure dropdown has latest data
        if (this.isManager) {
          this.loadTeamMembers();
        }
        this.loadTasks(projectId);
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update task';
        this.toastService.show('Error updating task: ' + errorMessage, 'error');
      }
    });
  }

  // Update task status for employees
  updateTaskStatus(task: any, newStatus: string) {
    // Don't update if status is already the same
    if (task.status === newStatus) {
      return;
    }
    
    // Normalize status - convert "in-progress" to "in_progress" for database compatibility
    let normalizedStatus = newStatus;
    if (normalizedStatus === 'in-progress') {
      normalizedStatus = 'in_progress';
    }
    
    // Ensure assigned_to is a number
    const assignedToValue = typeof task.assigned_to === 'string' ? parseInt(task.assigned_to) : Number(task.assigned_to);
    
    if (isNaN(assignedToValue) || assignedToValue <= 0) {
      this.toastService.show('Error: Invalid task assignment.', 'error');
      return;
    }
    
    // Update task status
    this.adminService.updateTask(task.id, {
      title: task.title,
      description: task.description,
      status: normalizedStatus,
      assigned_to: assignedToValue,
      assigned_by: task.assigned_by || null,
      due_date: task.due_date || null
    }).subscribe({
      next: () => {
        // Update local task status for immediate UI feedback
        task.status = newStatus;
        // Reload tasks to ensure consistency
        this.loadEmployeeTasks();
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update task status';
        this.toastService.show('Error updating task status: ' + errorMessage, 'error');
      }
    });
  }

  deleteTask(task: any) {
    // Only admin can delete tasks
    if (!this.isAdmin) {
      this.toastService.show('You do not have permission to delete tasks', 'error');
      return;
    }
    this.confirmationService.show({
      title: 'Delete Task',
      message: 'Delete this task?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    }).then(confirmed => {
      if (confirmed) {
        this.adminService.deleteTask(task.id).subscribe(() => {
          this.loadTasks(task.project_id);
          this.toastService.show('Task deleted successfully', 'success');
        });
      }
    });
  }

  // Time Tracking
  viewTaskTimeTracking(taskId: number) {
    this.selectedTaskForTimeTracking = taskId;
    this.adminService.getTaskTimeTracking(taskId).subscribe({
      next: (entries) => {
        this.taskTimeTracking = entries;
      },
      error: (err) => {
        this.toastService.show('Error loading time tracking: ' + (err.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  calculateTaskTotalTime(entries: any[]): number {
    return entries.reduce((total, entry) => {
      return total + (entry.total_time || 0);
    }, 0);
  }

  formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  // Project selection for head managers
  loadSelectedProjects() {
    this.adminService.getSelectedProjects().subscribe({
      next: (selectedProjects) => {
        this.selectedProjectIds.clear();
        selectedProjects.forEach((project: any) => {
          this.selectedProjectIds.add(project.id);
        });
      },
      error: (err) => {
        console.error('Error loading selected projects:', err);
      }
    });
  }

  // Load selected projects and their tasks for "My Projects and Tasks" view
  loadMyProjectsAndTasks() {
    this.adminService.getSelectedProjects().subscribe({
      next: (selectedProjects: any[]) => {
        // Set projects to only selected ones
        this.projects = selectedProjects.map((p: any) => {
          const startDate = p.start_date ? this.extractDateOnly(p.start_date) : null;
          const endDate = p.end_date ? this.extractDateOnly(p.end_date) : null;
          return {
            ...p,
            start_date: startDate,
            end_date: endDate,
            manager_id: p.manager_id || null
          };
        });
        this.applyFilters(); // Apply filters instead of direct assignment
        
        // Initialize newTask for each project
        this.projects.forEach((p: any) => {
          if (!this.newTask[p.id]) {
            this.newTask[p.id] = {};
          }
          // Initialize dynamic form for each project's task creation
          this.dynamicFormService.initializeForm(`createTask_${p.id}`, this.taskFormFields);
        });
        
        // Load tasks for each selected project
        this.projects.forEach((project: any) => {
          this.loadTasks(project.id);
        });
      },
      error: (err) => {
        console.error('Error loading my projects and tasks:', err);
        this.projects = [];
        this.filteredProjects = [];
        this.applyFilters(); // Apply filters
      }
    });
  }

  onProjectToggle(projectId: number, event: any) {
    // Clear any previous error
    delete this.projectSelectionError[projectId];

    if (event.target.checked) {
      // Try to select the project
      this.adminService.selectProject(projectId).subscribe({
        next: (response: any) => {
          if (response.selected) {
            this.selectedProjectIds.add(projectId);
            this.loadProjects(); // Reload to update UI
            if (this.isHeadManager) {
              this.loadSelectedProjects(); // Reload selected projects
              this.loadSelectedManagers(); // Reload selected managers
            }
          } else {
            // Project was deselected
            this.selectedProjectIds.delete(projectId);
            event.target.checked = false;
            this.loadProjects(); // Reload to update UI
          }
        },
        error: (err) => {
          // Project already selected by another head manager
          event.target.checked = false;
          const errorMessage = err?.error?.message || 'This project already Selected';
          this.projectSelectionError[projectId] = errorMessage;
          this.loadProjects(); // Reload to update UI with current selection status
          console.error('Error selecting project:', err);
        }
      });
    } else {
      // Deselect the project
      this.adminService.selectProject(projectId).subscribe({
        next: (response: any) => {
          this.selectedProjectIds.delete(projectId);
          this.loadProjects(); // Reload to update UI
          if (this.isHeadManager) {
            this.loadSelectedProjects(); // Reload selected projects
          }
        },
        error: (err) => {
          console.error('Error deselecting project:', err);
          // Re-check the checkbox if deselection failed
          event.target.checked = true;
        }
      });
    }
  }

  isProjectSelected(projectId: number): boolean {
    return this.selectedProjectIds.has(projectId);
  }

  getSelectedProjects(): any[] {
    return this.projects.filter(p => this.selectedProjectIds.has(p.id));
  }

  getProjectSelectionError(projectId: number): string {
    return this.projectSelectionError[projectId] || '';
  }

  // Assign manager to project
  assignManagerToProject(projectId: number, managerId: number, event: any) {
    const managerIdToAssign = event.target.checked ? managerId : null;
    this.adminService.assignManagerToProject(projectId, managerIdToAssign).subscribe({
      next: () => {
        this.toastService.show('Manager assigned successfully', 'success');
        this.loadProjects(); // Reload to update UI
      },
      error: (err) => {
        this.toastService.show('Error assigning manager: ' + (err.error?.message || 'Unknown error'), 'error');
        event.target.checked = !event.target.checked; // Revert checkbox
      }
    });
  }

  // Start editing manager assignment
  startEditingManager(projectId: number) {
    const project = this.projects.find(p => p.id === projectId);
    if (project) {
      this.editingManagerAssignment[projectId] = true;
      // Initialize editProjectData if not exists
      if (!this.editProjectData[projectId]) {
        this.editProjectData[projectId] = {
          name: project.name,
          description: project.description || '',
          status: project.status || 'on-track',
          archived: project.archived === 1 || project.archived === true,
          start_date: project.start_date || '',
          end_date: project.end_date || '',
          manager_id: project.manager_id || null,
          customer_id: project.customer_id ? project.customer_id.toString() : null,
          allocated_time: project.allocated_time || ''
        };
      } else {
        // Update manager_id, status, and archived in existing editProjectData
        this.editProjectData[projectId].manager_id = project.manager_id || null;
        this.editProjectData[projectId].status = project.status || 'on-track';
        this.editProjectData[projectId].archived = project.archived === 1 || project.archived === true;
      }
    }
  }

  // Cancel editing manager assignment
  cancelEditingManager(projectId: number) {
    this.editingManagerAssignment[projectId] = false;
    // Don't delete editProjectData as it might be used for other fields
  }

  // Save manager assignment
  saveManagerAssignment(projectId: number) {
    const editData = this.editProjectData[projectId];
    if (!editData) {
      this.toastService.show('Error: Project data not found', 'error');
      return;
    }

    // Normalize manager_id: convert null or undefined to null
    // manager_id is already typed as number | null, so we just need to handle null/undefined
    const managerIdToAssign = (editData.manager_id === null || editData.manager_id === undefined) ? null : editData.manager_id;
    
    this.adminService.assignManagerToProject(projectId, managerIdToAssign).subscribe({
      next: () => {
        this.toastService.show('Manager assignment updated successfully', 'success');
        this.editingManagerAssignment[projectId] = false;
        this.loadProjects(); // Reload to update UI
      },
      error: (err) => {
        this.toastService.show('Error updating manager assignment: ' + (err.error?.message || 'Unknown error'), 'error');
      }
    });
  }

  // Navigate to maintenance page
  navigateToMaintenance(project: any): void {
    this.router.navigate(['/maintenance'], { queryParams: { projectId: project.id } });
  }

  // Toggle project maintenance status (remove from maintenance)
  toggleProjectMaintenance(project: any): void {
    // Change status from maintenance to on-track
    const dataToSend: any = {
      name: project.name,
      description: project.description || '',
      status: 'on-track', // Change from maintenance to on-track
      start_date: project.start_date || null,
      end_date: project.end_date || null,
      manager_id: project.manager_id || null,
      customer_id: project.customer_id || null,
      region: project.region || null,
      allocated_time: project.allocated_time || null,
      archived: project.archived || false
    };
    
    // Include custom_fields if they exist
    const customFields = this.getProjectCustomFields(project);
    if (customFields && Object.keys(customFields).length > 0) {
      dataToSend.custom_fields = customFields;
    }
    
    this.adminService.updateProject(project.id, dataToSend).subscribe({
      next: () => {
        // Update local project status for immediate UI feedback
        project.status = 'on-track';
        // Reload to ensure consistency
        this.loadProjects();
        this.toastService.show('Project removed from maintenance', 'success');
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to remove from maintenance';
        this.toastService.show('Error removing from maintenance: ' + errorMessage, 'error');
      }
    });
  }
}
