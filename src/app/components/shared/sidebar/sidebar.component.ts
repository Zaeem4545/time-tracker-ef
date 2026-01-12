import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  currentRoute: string = '';
  isCollapsed: boolean = true; // Start collapsed by default
  isMobileOpen: boolean = false;
  isMobileView: boolean = false;

  constructor(private router: Router, public auth: AuthService, private el: ElementRef) {}

  menuItems: any[] = [];

  ngOnInit(): void {
    this.checkMobileView();
    // Initialize sidebar width
    document.documentElement.style.setProperty('--sidebar-width', '70px');
    
    // Build menu items based on role
    this.buildMenuItems();
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.url;
        this.updateActiveMenu();
        // Close mobile sidebar after navigation
        if (this.isMobileView) {
          this.isMobileOpen = false;
        }
      });
    
    this.currentRoute = this.router.url;
    this.updateActiveMenu();
  }

  checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  toggleMobile(): void {
    this.isMobileOpen = !this.isMobileOpen;
  }

  closeMobile(): void {
    this.isMobileOpen = false;
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkMobileView();
    if (!this.isMobileView) {
      this.isMobileOpen = false;
    }
  }

  buildMenuItems(): void {
    const role = this.auth.getRole()?.toLowerCase();
    
    // Initialize menu items
    this.menuItems = [];
    
    // Add role-specific dashboard items
    if (role === 'head manager') {
      this.menuItems.push(
        { label: 'Dashboard', route: '/dashboard', icon: '📊', active: false }
      );
    } else if (role === 'manager') {
      this.menuItems.push(
        { label: 'Dashboard', route: '/dashboard', icon: '📊', active: false }
      );
    } else if (role === 'admin') {
      this.menuItems.push(
        { label: 'Admin Dashboard', route: '/admin-dashboard', icon: '📊', active: false },
        { label: 'Create User', route: '/admin', icon: '👥', active: false }
      );
    } else if (role === 'engineer') {
      // Engineers only see Engineer Dashboard, not the simple dashboard
      this.menuItems.push(
        { label: 'Engineer Dashboard', route: '/employee', icon: '👤', active: false }
      );
    } else {
      // For other roles, add general dashboard
      this.menuItems.push(
        { label: 'Dashboard', route: '/dashboard', icon: '📊', active: false }
      );
    }

    // For head managers, add "Projects" (renamed from "Create Projects") instead of the regular projects route
    if (role === 'head manager') {
      this.menuItems.push(
        { label: 'Projects', route: '/create-project', icon: '📁', active: false }
      );
    } else {
      // For other roles, add regular Projects menu item
      this.menuItems.push(
        { label: 'Projects', route: '/projects', icon: '📁', active: false }
      );
    }

    this.menuItems.push(
      { label: 'Calendar', route: '/calendar', icon: '📅', active: false },
      { label: 'Timesheet', route: '/timesheet', icon: '⏱️', active: false },
      { label: 'Add Customer', route: '/customer-details', icon: '➕', active: false }
    );

    // Add role-specific menu items
    if (role === 'admin') {
      // Create Team and Team Details removed
    } else if (role === 'manager') {
      // Engineer Details removed from team lead portal
    }
  }

  updateActiveMenu(): void {
    // Reset all items first
    this.menuItems.forEach(item => {
      item.active = false;
    });
    
    // Set active based on current route
    this.menuItems.forEach(item => {
      if (this.currentRoute === item.route || this.currentRoute.startsWith(item.route + '/')) {
        item.active = true;
      }
    });
    
    // Handle create-project route for "Projects" menu item (head managers)
    if (this.currentRoute === '/create-project') {
      const createProjectItem = this.menuItems.find(item => item.route === '/create-project');
      if (createProjectItem) {
        createProjectItem.active = true;
      }
    }
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    document.documentElement.style.setProperty('--sidebar-width', '240px');
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    document.documentElement.style.setProperty('--sidebar-width', '70px');
  }

  toggleSidebar(): void {
    // Sidebar expands on hover automatically
  }
}

