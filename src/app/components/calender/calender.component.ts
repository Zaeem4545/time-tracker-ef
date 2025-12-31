import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calender.component.html',
  styleUrls: ['./calender.component.scss']
})
export class CalenderComponent implements OnInit {
  projects: any[] = [];
  currentDate: Date = new Date();
  currentMonth: number = this.currentDate.getMonth();
  currentYear: number = this.currentDate.getFullYear();
  daysInMonth: number[] = [];
  monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  dayNames: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  isHeadManager: boolean = false;
  isManager: boolean = false;
  currentUserId: number | null = null;
  
  // Task management
  selectedProject: any = null;
  projectTasks: { [key: number]: any[] } = {};
  selectedTask: any = null;
  showTasksModal: boolean = false;

  constructor(private adminService: AdminService, private authService: AuthService) {}

  ngOnInit(): void {
    // Check current user role and ID
    const currentUserRole = this.authService.getRole();
    this.currentUserId = this.authService.getUserId();
    this.isHeadManager = currentUserRole?.toLowerCase() === 'head manager';
    this.isManager = currentUserRole?.toLowerCase() === 'manager';
    
    this.loadProjects();
    this.generateCalendar();
  }

  loadProjects() {
    if (this.isHeadManager) {
      // Load only selected projects for head manager
      this.adminService.getSelectedProjects().subscribe({
        next: (projects) => {
          this.projects = projects;
          this.generateCalendar();
        },
        error: (err) => {
          console.error('Error loading selected projects:', err);
          this.projects = [];
          this.generateCalendar();
        }
      });
    } else {
      // Load all projects for admin and other roles
      this.adminService.getProjects().subscribe({
        next: (projects) => {
          this.projects = projects;
          this.generateCalendar();
        },
        error: (err) => {
          console.error('Error loading projects:', err);
          this.projects = [];
          this.generateCalendar();
        }
      });
    }
  }

  generateCalendar() {
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonthCount = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
    
    this.daysInMonth = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      this.daysInMonth.push(0);
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonthCount; i++) {
      this.daysInMonth.push(i);
    }
  }

  getProjectsForDate(day: number): any[] {
    if (day === 0) return [];
    
    const month = String(this.currentMonth + 1).length === 1 ? '0' + (this.currentMonth + 1) : String(this.currentMonth + 1);
    const dayStr = String(day).length === 1 ? '0' + day : String(day);
    const dateStr = `${this.currentYear}-${month}-${dayStr}`;
    
    return this.projects.filter(project => {
      if (!project.start_date || !project.end_date) return false;
      return dateStr >= project.start_date && dateStr <= project.end_date;
    });
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  getCurrentMonthYear(): string {
    return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Check if a specific day in the calendar is in the past
  isDatePast(day: number): boolean {
    if (day === 0) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    const checkDate = new Date(this.currentYear, this.currentMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate < today;
  }

  // Check if a project date on a specific day is in the past
  isProjectDatePast(project: any, day: number): boolean {
    if (day === 0 || !project.start_date || !project.end_date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    const month = String(this.currentMonth + 1).length === 1 ? '0' + (this.currentMonth + 1) : String(this.currentMonth + 1);
    const dayStr = String(day).length === 1 ? '0' + day : String(day);
    const dateStr = `${this.currentYear}-${month}-${dayStr}`;
    
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    
    // Check if this date is within the project range and is in the past
    if (dateStr >= project.start_date && dateStr <= project.end_date) {
      return checkDate < today;
    }
    
    return false;
  }

  // Handle project click
  onProjectClick(project: any, event: Event) {
    event.stopPropagation();
    this.selectedProject = project;
    this.loadTasksForProject(project.id);
    this.showTasksModal = true;
  }

  // Load tasks for a project
  loadTasksForProject(projectId: number) {
    if (this.projectTasks[projectId]) {
      return; // Already loaded
    }
    
    this.adminService.getTasks(projectId).subscribe({
      next: (tasks) => {
        this.projectTasks[projectId] = tasks || [];
      },
      error: (err) => {
        console.error('Error loading tasks:', err);
        this.projectTasks[projectId] = [];
      }
    });
  }

  // Handle task click
  onTaskClick(task: any, event: Event) {
    event.stopPropagation();
    this.selectedTask = task;
    
    // If task has due_date, navigate to that month if needed
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      if (dueDate.getFullYear() !== this.currentYear || dueDate.getMonth() !== this.currentMonth) {
        this.currentYear = dueDate.getFullYear();
        this.currentMonth = dueDate.getMonth();
        this.generateCalendar();
      } else {
        this.generateCalendar(); // Regenerate to highlight the task date
      }
    }
  }

  // Close tasks modal
  closeTasksModal() {
    this.showTasksModal = false;
    this.selectedProject = null;
    this.selectedTask = null;
  }

  // Get tasks for selected project
  getTasksForSelectedProject(): any[] {
    if (!this.selectedProject) return [];
    return this.projectTasks[this.selectedProject.id] || [];
  }

  // Check if a day has the selected task's due date
  isTaskDueDate(day: number, task: any): boolean {
    if (day === 0 || !task || !task.due_date) return false;
    
    const month = String(this.currentMonth + 1).length === 1 ? '0' + (this.currentMonth + 1) : String(this.currentMonth + 1);
    const dayStr = String(day).length === 1 ? '0' + day : String(day);
    const dateStr = `${this.currentYear}-${month}-${dayStr}`;
    
    // Extract date part from due_date (YYYY-MM-DD)
    let taskDueDate = task.due_date;
    if (taskDueDate.includes('T')) {
      taskDueDate = taskDueDate.split('T')[0];
    } else if (taskDueDate.includes(' ')) {
      taskDueDate = taskDueDate.split(' ')[0];
    }
    
    return dateStr === taskDueDate;
  }

  // Check if a day should be highlighted for selected task
  isTaskDateHighlighted(day: number): boolean {
    if (day === 0 || !this.selectedTask) return false;
    return this.isTaskDueDate(day, this.selectedTask);
  }

  // Format task due date
  formatTaskDate(dateStr: string): string {
    if (!dateStr) return 'No date set';
    return this.formatDate(dateStr);
  }
}
