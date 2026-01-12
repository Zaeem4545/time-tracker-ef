import { Component, OnInit, HostListener } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { DynamicFormService, DynamicField } from '../../services/dynamic-form.service';
import { ToastNotificationService } from '../../services/toast-notification.service';
import { ConfirmationModalService } from '../../services/confirmation-modal.service';

@Component({
  selector: 'app-customer-details',
  templateUrl: './customer-details.component.html',
  styleUrls: ['./customer-details.component.scss']
})
export class CustomerDetailsComponent implements OnInit {
  customers: any[] = [];
  filteredCustomers: any[] = [];
  projects: any[] = []; // Store all projects to match with customers
  searchTerm: string = '';
  showAddModal: boolean = false;
  showEditModal: boolean = false;
  showProjectsModal: boolean = false;
  selectedCustomer: any = null;
  selectedCustomerForProjects: any = null;
  editCustomerData: any = {};
  newCustomer: any = {};
  createCustomerError: string = '';
  currentUserRole: string | null = null;
  isAdmin: boolean = false;
  isHeadManager: boolean = false;
  isManager: boolean = false;

  // Search and filter properties
  showSearchDropdown: boolean = false;
  showSearchSuggestions: boolean = false;
  selectedSearchOption: string = '';
  activeFilters: string[] = []; // Current active filters (name, email, phone)
  showProjectFilter: boolean = false;
  selectedProjectFilter: number | null = null;
  showRegionFilter: boolean = false;
  selectedRegionFilter: string | null = null;
  availableRegions: string[] = [];

  // Default customer form fields
  customerFormFields: DynamicField[] = [];

  constructor(
    private adminService: AdminService,
    private authService: AuthService,
    private dynamicFormService: DynamicFormService,
    private toastService: ToastNotificationService,
    private confirmationService: ConfirmationModalService
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();
    this.isAdmin = this.currentUserRole?.toLowerCase() === 'admin';
    this.isHeadManager = this.currentUserRole?.toLowerCase() === 'head manager';
    this.isManager = this.currentUserRole?.toLowerCase() === 'manager';
    
    // Initialize customer form fields with countries dropdown
    this.customerFormFields = [
      {
        id: 'name',
        name: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Customer Name',
        required: true,
        order: 0
      },
      {
        id: 'email',
        name: 'email',
        label: 'Email',
        type: 'email',
        placeholder: 'customer@example.com',
        required: false,
        order: 1
      },
      {
        id: 'phone',
        name: 'phone',
        label: 'Phone',
        type: 'text',
        placeholder: '+1234567890',
        required: false,
        order: 2
      },
      {
        id: 'region',
        name: 'region',
        label: 'Region',
        type: 'select',
        placeholder: 'Select Region/Country',
        required: false,
        order: 3,
        options: this.getAllCountries()
      },
      {
        id: 'notes',
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        placeholder: 'Additional notes...',
        required: false,
        order: 5
      }
    ];
    
    // Initialize dynamic form for customers
    this.dynamicFormService.initializeForm('createCustomer', this.customerFormFields);
    
    this.loadProjects(); // Load projects first
    this.loadCustomers();
  }

  loadProjects(): void {
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects || [];
      },
      error: (err) => {
        console.error('Error loading projects:', err);
        this.projects = [];
      }
    });
  }

  loadCustomers(): Promise<void> {
    return new Promise((resolve) => {
      // For now, we'll use a mock data approach or create an API endpoint
      // You can replace this with an actual API call when backend is ready
      this.adminService.getCustomers().subscribe({
        next: (customers) => {
          this.customers = customers;
          this.filteredCustomers = customers;
          this.updateAvailableRegions();
          resolve();
        },
        error: (err) => {
          console.error('Error loading customers:', err);
          // If API doesn't exist yet, use empty array
          this.customers = [];
          this.filteredCustomers = [];
          resolve();
        }
      });
    });
  }

  // Get all projects for a specific customer
  getCustomerProjects(customerId: number): any[] {
    // Handle type conversion for customer_id comparison
    return this.projects.filter(project => {
      const projectCustomerId = typeof project.customer_id === 'string' ? parseInt(project.customer_id) : project.customer_id;
      return projectCustomerId === customerId;
    });
  }

  // Handle project dropdown focus - expand to show all options
  onProjectDropdownFocus(event: any, customerId: number): void {
    const select = event.target;
    const projects = this.getCustomerProjects(customerId);
    if (projects.length > 1) {
      select.size = projects.length > 5 ? 5 : projects.length;
      select.style.position = 'absolute';
      select.style.zIndex = '1000';
      select.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
      select.style.background = 'white';
    }
  }

  // Handle project dropdown blur - collapse back to single select
  onProjectDropdownBlur(event: any): void {
    const select = event.target;
    setTimeout(() => {
      select.size = 1;
      select.style.position = '';
      select.style.zIndex = '';
      select.style.boxShadow = '';
      select.style.background = '#f5f5f5';
    }, 200); // Small delay to allow option selection
  }

  // Prevent changes to the dropdown
  onProjectDropdownChange(event: any): void {
    // Reset to first project to prevent changes
    const select = event.target;
    const projects = this.getCustomerProjects(parseInt(select.getAttribute('data-customer-id') || '0'));
    if (projects.length > 0) {
      select.value = projects[0].id;
    }
  }

  onSearch(): void {
    this.applyFilters();
  }

  onSearchInputChange(): void {
    this.applyFilters();
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  toggleSearchDropdown(): void {
    this.showSearchDropdown = !this.showSearchDropdown;
  }

  applySearchOption(option: string): void {
    this.selectedSearchOption = option;
    this.showSearchSuggestions = false;
    this.applyFilters();
  }

  applyFilter(filter: string): void {
    if (this.activeFilters.includes(filter)) {
      this.activeFilters = this.activeFilters.filter(f => f !== filter);
    } else {
      this.activeFilters.push(filter);
    }
    this.applyFilters();
  }

  removeFilter(filter: string): void {
    this.activeFilters = this.activeFilters.filter(f => f !== filter);
    this.applyFilters();
  }

  isFilterActive(filter: string): boolean {
    return this.activeFilters.includes(filter);
  }

  getFilterDisplayName(filter: string): string {
    const filterNames: { [key: string]: string } = {
      'name': 'Name',
      'email': 'Email',
      'phone': 'Phone'
    };
    return filterNames[filter] || filter;
  }

  toggleProjectFilter(): void {
    this.showProjectFilter = !this.showProjectFilter;
  }

  setProjectFilter(projectId: number | null): void {
    this.selectedProjectFilter = projectId;
    this.showProjectFilter = false;
    this.applyFilters();
  }

  getProjectName(projectId: number): string {
    const project = this.projects.find(p => p.id === projectId);
    return project ? project.name : `Project ${projectId}`;
  }

  toggleRegionFilter(): void {
    this.showRegionFilter = !this.showRegionFilter;
  }

  setRegionFilter(region: string | null): void {
    this.selectedRegionFilter = region;
    this.showRegionFilter = false;
    this.applyFilters();
  }

  updateAvailableRegions(): void {
    const regions = new Set<string>();
    this.customers.forEach(customer => {
      if (customer.region && customer.region.trim() !== '') {
        regions.add(customer.region.trim());
      }
    });
    this.availableRegions = Array.from(regions).sort();
  }

  applyFilters(): void {
    let filtered = [...this.customers];

    // Apply text search based on active filters or search term
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      
      if (this.activeFilters.length === 0) {
        // If no specific filter is active, search in all fields
        filtered = filtered.filter(customer =>
          customer.name?.toLowerCase().includes(term) ||
          customer.email?.toLowerCase().includes(term) ||
          customer.phone?.includes(term) ||
          this.getCustomerProjects(customer.id).some(p => p.name?.toLowerCase().includes(term)) ||
          customer.region?.toLowerCase().includes(term)
        );
      } else {
        // Search only in active filter fields
        filtered = filtered.filter(customer => {
          if (this.activeFilters.includes('name') && customer.name?.toLowerCase().includes(term)) return true;
          if (this.activeFilters.includes('email') && customer.email?.toLowerCase().includes(term)) return true;
          if (this.activeFilters.includes('phone') && customer.phone?.includes(term)) return true;
          return false;
        });
      }
    } else if (this.activeFilters.length > 0) {
      // If filters are active but no search term, show all (filters will be applied by other criteria)
      // This allows filters to work independently
    }

    // Apply project filter
    if (this.selectedProjectFilter !== null) {
      filtered = filtered.filter(customer => {
        const customerProjects = this.getCustomerProjects(customer.id);
        return customerProjects.some(p => p.id === this.selectedProjectFilter);
      });
    }

    // Apply region filter
    if (this.selectedRegionFilter !== null) {
      filtered = filtered.filter(customer => customer.region === this.selectedRegionFilter);
    }

    this.filteredCustomers = filtered;
  }

  openAddModal(): void {
    this.newCustomer = {};
    this.createCustomerError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newCustomer = {};
    this.createCustomerError = '';
  }

  openEditModal(customer: any): void {
    this.selectedCustomer = customer;
    // Parse custom_fields if it's a string
    let customFields = {};
    if (customer.custom_fields) {
      if (typeof customer.custom_fields === 'string') {
        try {
          customFields = JSON.parse(customer.custom_fields);
        } catch (e) {
          console.error('Error parsing custom_fields:', e);
        }
      } else {
        customFields = customer.custom_fields;
      }
    }
    
    this.editCustomerData = {
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      region: customer.region || '',
      notes: customer.notes || '',
      custom_fields: customFields
    };
    
    // Initialize dynamic form for editing this customer
    const formId = `editCustomer_${customer.id}`;
    this.dynamicFormService.initializeForm(formId, this.customerFormFields);
    
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedCustomer = null;
    this.editCustomerData = {};
  }

  onCustomerFormDataChange(data: any): void {
    this.newCustomer = { ...data };
  }

  onEditCustomerFormDataChange(customerId: number, data: any): void {
    this.editCustomerData = { ...data };
  }

  createCustomer(): void {
    // Clear previous error
    this.createCustomerError = '';
    
    // Get form config to validate required fields
    const config = this.dynamicFormService.getFormConfig('createCustomer');
    if (config) {
      for (const field of config.fields) {
        if (field.required && (!this.newCustomer[field.id] || this.newCustomer[field.id].toString().trim() === '')) {
          this.createCustomerError = `${field.label} is required`;
          return;
        }
      }
    }
    
    // Build customer data from dynamic form
    const customerData: any = {};
    const customFields: any = {};
    const standardFields = ['name', 'email', 'phone', 'region', 'notes'];
    
    if (config) {
      for (const field of config.fields) {
        const value = this.newCustomer[field.id];
        if (value !== undefined && value !== null && value !== '') {
          const trimmedValue = typeof value === 'string' ? value.trim() : value;
          // Separate standard fields from custom fields
          if (standardFields.includes(field.name)) {
            customerData[field.name] = trimmedValue;
          } else {
            // This is a custom field
            customFields[field.name] = trimmedValue;
          }
        }
      }
    }
    
    // Add custom_fields if any exist
    if (Object.keys(customFields).length > 0) {
      customerData.custom_fields = customFields;
    }
    
    // Ensure required fields are present
    if (!customerData.name) {
      this.createCustomerError = 'Customer name is required';
      return;
    }

    this.adminService.createCustomer(customerData).subscribe({
      next: () => {
        this.toastService.show('Customer created successfully', 'success');
        this.closeAddModal();
        this.loadProjects(); // Reload projects to update dropdowns
        this.loadCustomers().then(() => {
          this.updateAvailableRegions();
          this.applyFilters();
        });
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to create customer';
        this.createCustomerError = errorMessage;
      }
    });
  }

  updateCustomer(): void {
    if (!this.selectedCustomer) {
      return;
    }
    
    const customerId = this.selectedCustomer.id;
    const formId = `editCustomer_${customerId}`;
    const config = this.dynamicFormService.getFormConfig(formId);
    
    // Build customer data from dynamic form
    const customerData: any = {};
    const customFields: any = {};
    const standardFields = ['name', 'email', 'phone', 'region', 'notes'];
    
    if (config) {
      for (const field of config.fields) {
        const value = this.editCustomerData[field.id];
        if (value !== undefined && value !== null && value !== '') {
          const trimmedValue = typeof value === 'string' ? value.trim() : value;
          // Separate standard fields from custom fields
          if (standardFields.includes(field.name)) {
            customerData[field.name] = trimmedValue;
          } else {
            // This is a custom field
            customFields[field.name] = trimmedValue;
          }
        }
      }
    }
    
    // Add custom_fields if any exist
    if (Object.keys(customFields).length > 0) {
      customerData.custom_fields = customFields;
    }
    
    // Ensure required fields are present
    if (!customerData.name) {
      this.toastService.show('Customer name is required', 'warning');
      return;
    }

    this.adminService.updateCustomer(customerId, customerData).subscribe({
      next: () => {
        this.toastService.show('Customer updated successfully', 'success');
        this.closeEditModal();
        this.loadProjects(); // Reload projects to update dropdowns
        this.loadCustomers().then(() => {
          this.updateAvailableRegions();
          this.applyFilters();
        });
      },
      error: (err) => {
        const errorMessage = err?.error?.message || err?.message || 'Failed to update customer';
        this.toastService.show('Error updating customer: ' + errorMessage, 'error');
      }
    });
  }

  deleteCustomer(customer: any): void {
    // Only admin can delete customers
    if (!this.isAdmin) {
      this.toastService.show('You do not have permission to delete customers', 'error');
      return;
    }

    this.confirmationService.show({
      title: 'Delete Customer',
      message: `Are you sure you want to delete ${customer.name}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    }).then(confirmed => {
      if (!confirmed) {
        return;
      }

      this.adminService.deleteCustomer(customer.id).subscribe({
        next: () => {
          this.toastService.show('Customer deleted successfully', 'success');
          this.loadProjects(); // Reload projects to update dropdowns
          this.loadCustomers().then(() => {
            this.updateAvailableRegions();
            this.applyFilters();
          });
        },
        error: (err) => {
          const errorMessage = err?.error?.message || err?.message || 'Failed to delete customer';
          this.toastService.show('Error deleting customer: ' + errorMessage, 'error');
        }
      });
    });
  }

  canCreate(): boolean {
    // All authenticated users can create customers
    return true;
  }

  canEdit(): boolean {
    return this.isAdmin || this.isHeadManager || this.isManager;
  }

  canDelete(): boolean {
    return this.isAdmin;
  }

  openProjectsModal(customer: any): void {
    this.selectedCustomerForProjects = customer;
    this.showProjectsModal = true;
  }

  closeProjectsModal(): void {
    this.showProjectsModal = false;
    this.selectedCustomerForProjects = null;
  }

  getAttachmentFileName(attachmentPath: string): string {
    if (!attachmentPath) return '';
    // Extract filename from path (e.g., "/uploads/file-1234567890.pdf" -> "file-1234567890.pdf")
    const parts = attachmentPath.split('/');
    return parts[parts.length - 1] || attachmentPath;
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
    // We need to load tasks for this project
    // For now, we'll calculate based on what we have
    // This would ideally fetch tasks, but we'll keep it simple
    return this.formatAllocatedTime(project.allocated_time);
  }

  // Get project custom fields
  getProjectCustomFields(project: any): any {
    if (!project || !project.custom_fields) return null;
    
    try {
      if (typeof project.custom_fields === 'string') {
        return JSON.parse(project.custom_fields);
      }
      return project.custom_fields;
    } catch (e) {
      return null;
    }
  }

  // Format custom field key (convert snake_case to Title Case)
  formatCustomFieldKey(key: unknown): string {
    if (typeof key !== 'string') {
      return String(key || '');
    }
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  getAllCountries(): { value: string; label: string }[] {
    return [
      { value: 'Afghanistan', label: 'Afghanistan' },
      { value: 'Albania', label: 'Albania' },
      { value: 'Algeria', label: 'Algeria' },
      { value: 'Andorra', label: 'Andorra' },
      { value: 'Angola', label: 'Angola' },
      { value: 'Antigua and Barbuda', label: 'Antigua and Barbuda' },
      { value: 'Argentina', label: 'Argentina' },
      { value: 'Armenia', label: 'Armenia' },
      { value: 'Australia', label: 'Australia' },
      { value: 'Austria', label: 'Austria' },
      { value: 'Azerbaijan', label: 'Azerbaijan' },
      { value: 'Bahamas', label: 'Bahamas' },
      { value: 'Bahrain', label: 'Bahrain' },
      { value: 'Bangladesh', label: 'Bangladesh' },
      { value: 'Barbados', label: 'Barbados' },
      { value: 'Belarus', label: 'Belarus' },
      { value: 'Belgium', label: 'Belgium' },
      { value: 'Belize', label: 'Belize' },
      { value: 'Benin', label: 'Benin' },
      { value: 'Bhutan', label: 'Bhutan' },
      { value: 'Bolivia', label: 'Bolivia' },
      { value: 'Bosnia and Herzegovina', label: 'Bosnia and Herzegovina' },
      { value: 'Botswana', label: 'Botswana' },
      { value: 'Brazil', label: 'Brazil' },
      { value: 'Brunei', label: 'Brunei' },
      { value: 'Bulgaria', label: 'Bulgaria' },
      { value: 'Burkina Faso', label: 'Burkina Faso' },
      { value: 'Burundi', label: 'Burundi' },
      { value: 'Cabo Verde', label: 'Cabo Verde' },
      { value: 'Cambodia', label: 'Cambodia' },
      { value: 'Cameroon', label: 'Cameroon' },
      { value: 'Canada', label: 'Canada' },
      { value: 'Central African Republic', label: 'Central African Republic' },
      { value: 'Chad', label: 'Chad' },
      { value: 'Chile', label: 'Chile' },
      { value: 'China', label: 'China' },
      { value: 'Colombia', label: 'Colombia' },
      { value: 'Comoros', label: 'Comoros' },
      { value: 'Congo', label: 'Congo' },
      { value: 'Costa Rica', label: 'Costa Rica' },
      { value: 'Croatia', label: 'Croatia' },
      { value: 'Cuba', label: 'Cuba' },
      { value: 'Cyprus', label: 'Cyprus' },
      { value: 'Czech Republic', label: 'Czech Republic' },
      { value: 'Denmark', label: 'Denmark' },
      { value: 'Djibouti', label: 'Djibouti' },
      { value: 'Dominica', label: 'Dominica' },
      { value: 'Dominican Republic', label: 'Dominican Republic' },
      { value: 'Ecuador', label: 'Ecuador' },
      { value: 'Egypt', label: 'Egypt' },
      { value: 'El Salvador', label: 'El Salvador' },
      { value: 'Equatorial Guinea', label: 'Equatorial Guinea' },
      { value: 'Eritrea', label: 'Eritrea' },
      { value: 'Estonia', label: 'Estonia' },
      { value: 'Eswatini', label: 'Eswatini' },
      { value: 'Ethiopia', label: 'Ethiopia' },
      { value: 'Fiji', label: 'Fiji' },
      { value: 'Finland', label: 'Finland' },
      { value: 'France', label: 'France' },
      { value: 'Gabon', label: 'Gabon' },
      { value: 'Gambia', label: 'Gambia' },
      { value: 'Georgia', label: 'Georgia' },
      { value: 'Germany', label: 'Germany' },
      { value: 'Ghana', label: 'Ghana' },
      { value: 'Greece', label: 'Greece' },
      { value: 'Grenada', label: 'Grenada' },
      { value: 'Guatemala', label: 'Guatemala' },
      { value: 'Guinea', label: 'Guinea' },
      { value: 'Guinea-Bissau', label: 'Guinea-Bissau' },
      { value: 'Guyana', label: 'Guyana' },
      { value: 'Haiti', label: 'Haiti' },
      { value: 'Honduras', label: 'Honduras' },
      { value: 'Hungary', label: 'Hungary' },
      { value: 'Iceland', label: 'Iceland' },
      { value: 'India', label: 'India' },
      { value: 'Indonesia', label: 'Indonesia' },
      { value: 'Iran', label: 'Iran' },
      { value: 'Iraq', label: 'Iraq' },
      { value: 'Ireland', label: 'Ireland' },
      { value: 'Israel', label: 'Israel' },
      { value: 'Italy', label: 'Italy' },
      { value: 'Jamaica', label: 'Jamaica' },
      { value: 'Japan', label: 'Japan' },
      { value: 'Jordan', label: 'Jordan' },
      { value: 'Kazakhstan', label: 'Kazakhstan' },
      { value: 'Kenya', label: 'Kenya' },
      { value: 'Kiribati', label: 'Kiribati' },
      { value: 'Korea, North', label: 'Korea, North' },
      { value: 'Korea, South', label: 'Korea, South' },
      { value: 'Kosovo', label: 'Kosovo' },
      { value: 'Kuwait', label: 'Kuwait' },
      { value: 'Kyrgyzstan', label: 'Kyrgyzstan' },
      { value: 'Laos', label: 'Laos' },
      { value: 'Latvia', label: 'Latvia' },
      { value: 'Lebanon', label: 'Lebanon' },
      { value: 'Lesotho', label: 'Lesotho' },
      { value: 'Liberia', label: 'Liberia' },
      { value: 'Libya', label: 'Libya' },
      { value: 'Liechtenstein', label: 'Liechtenstein' },
      { value: 'Lithuania', label: 'Lithuania' },
      { value: 'Luxembourg', label: 'Luxembourg' },
      { value: 'Madagascar', label: 'Madagascar' },
      { value: 'Malawi', label: 'Malawi' },
      { value: 'Malaysia', label: 'Malaysia' },
      { value: 'Maldives', label: 'Maldives' },
      { value: 'Mali', label: 'Mali' },
      { value: 'Malta', label: 'Malta' },
      { value: 'Marshall Islands', label: 'Marshall Islands' },
      { value: 'Mauritania', label: 'Mauritania' },
      { value: 'Mauritius', label: 'Mauritius' },
      { value: 'Mexico', label: 'Mexico' },
      { value: 'Micronesia', label: 'Micronesia' },
      { value: 'Moldova', label: 'Moldova' },
      { value: 'Monaco', label: 'Monaco' },
      { value: 'Mongolia', label: 'Mongolia' },
      { value: 'Montenegro', label: 'Montenegro' },
      { value: 'Morocco', label: 'Morocco' },
      { value: 'Mozambique', label: 'Mozambique' },
      { value: 'Myanmar', label: 'Myanmar' },
      { value: 'Namibia', label: 'Namibia' },
      { value: 'Nauru', label: 'Nauru' },
      { value: 'Nepal', label: 'Nepal' },
      { value: 'Netherlands', label: 'Netherlands' },
      { value: 'New Zealand', label: 'New Zealand' },
      { value: 'Nicaragua', label: 'Nicaragua' },
      { value: 'Niger', label: 'Niger' },
      { value: 'Nigeria', label: 'Nigeria' },
      { value: 'North Macedonia', label: 'North Macedonia' },
      { value: 'Norway', label: 'Norway' },
      { value: 'Oman', label: 'Oman' },
      { value: 'Pakistan', label: 'Pakistan' },
      { value: 'Palau', label: 'Palau' },
      { value: 'Palestine', label: 'Palestine' },
      { value: 'Panama', label: 'Panama' },
      { value: 'Papua New Guinea', label: 'Papua New Guinea' },
      { value: 'Paraguay', label: 'Paraguay' },
      { value: 'Peru', label: 'Peru' },
      { value: 'Philippines', label: 'Philippines' },
      { value: 'Poland', label: 'Poland' },
      { value: 'Portugal', label: 'Portugal' },
      { value: 'Qatar', label: 'Qatar' },
      { value: 'Romania', label: 'Romania' },
      { value: 'Russia', label: 'Russia' },
      { value: 'Rwanda', label: 'Rwanda' },
      { value: 'Saint Kitts and Nevis', label: 'Saint Kitts and Nevis' },
      { value: 'Saint Lucia', label: 'Saint Lucia' },
      { value: 'Saint Vincent and the Grenadines', label: 'Saint Vincent and the Grenadines' },
      { value: 'Samoa', label: 'Samoa' },
      { value: 'San Marino', label: 'San Marino' },
      { value: 'Sao Tome and Principe', label: 'Sao Tome and Principe' },
      { value: 'Saudi Arabia', label: 'Saudi Arabia' },
      { value: 'Senegal', label: 'Senegal' },
      { value: 'Serbia', label: 'Serbia' },
      { value: 'Seychelles', label: 'Seychelles' },
      { value: 'Sierra Leone', label: 'Sierra Leone' },
      { value: 'Singapore', label: 'Singapore' },
      { value: 'Slovakia', label: 'Slovakia' },
      { value: 'Slovenia', label: 'Slovenia' },
      { value: 'Solomon Islands', label: 'Solomon Islands' },
      { value: 'Somalia', label: 'Somalia' },
      { value: 'South Africa', label: 'South Africa' },
      { value: 'South Sudan', label: 'South Sudan' },
      { value: 'Spain', label: 'Spain' },
      { value: 'Sri Lanka', label: 'Sri Lanka' },
      { value: 'Sudan', label: 'Sudan' },
      { value: 'Suriname', label: 'Suriname' },
      { value: 'Sweden', label: 'Sweden' },
      { value: 'Switzerland', label: 'Switzerland' },
      { value: 'Syria', label: 'Syria' },
      { value: 'Taiwan', label: 'Taiwan' },
      { value: 'Tajikistan', label: 'Tajikistan' },
      { value: 'Tanzania', label: 'Tanzania' },
      { value: 'Thailand', label: 'Thailand' },
      { value: 'Timor-Leste', label: 'Timor-Leste' },
      { value: 'Togo', label: 'Togo' },
      { value: 'Tonga', label: 'Tonga' },
      { value: 'Trinidad and Tobago', label: 'Trinidad and Tobago' },
      { value: 'Tunisia', label: 'Tunisia' },
      { value: 'Turkey', label: 'Turkey' },
      { value: 'Turkmenistan', label: 'Turkmenistan' },
      { value: 'Tuvalu', label: 'Tuvalu' },
      { value: 'Uganda', label: 'Uganda' },
      { value: 'Ukraine', label: 'Ukraine' },
      { value: 'United Arab Emirates', label: 'United Arab Emirates' },
      { value: 'United Kingdom', label: 'United Kingdom' },
      { value: 'United States', label: 'United States' },
      { value: 'Uruguay', label: 'Uruguay' },
      { value: 'Uzbekistan', label: 'Uzbekistan' },
      { value: 'Vanuatu', label: 'Vanuatu' },
      { value: 'Vatican City', label: 'Vatican City' },
      { value: 'Venezuela', label: 'Venezuela' },
      { value: 'Vietnam', label: 'Vietnam' },
      { value: 'Yemen', label: 'Yemen' },
      { value: 'Zambia', label: 'Zambia' },
      { value: 'Zimbabwe', label: 'Zimbabwe' }
    ];
  }

  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-container-top')) {
      this.showSearchDropdown = false;
      this.showSearchSuggestions = false;
      this.showProjectFilter = false;
      this.showRegionFilter = false;
    }
  }
}

