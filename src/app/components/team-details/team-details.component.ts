import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-team-details',
  templateUrl: './team-details.component.html',
  styleUrls: ['./team-details.component.scss']
})
export class TeamDetailsComponent implements OnInit {
  teamMembers: any[] = [];
  teamGroups: { manager: any; employees: any[]; selectionOrder: number }[] = []; // Grouped by manager for head manager
  currentUserRole: string | null = null;
  isAdmin: boolean = false;
  isHeadManager: boolean = false;

  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getRole();
    this.isAdmin = this.currentUserRole?.toLowerCase() === 'admin';
    this.isHeadManager = this.currentUserRole?.toLowerCase() === 'head manager';
    this.loadTeamMembers();
  }

  loadTeamMembers() {
    if (this.isAdmin) {
      // Admin sees all users
      this.adminService.getUsers().subscribe({
        next: (users) => {
          this.teamMembers = users.map((user: any) => ({
            ...user,
            role: (user.role || '').toLowerCase()
          }));
        },
        error: (err) => {
          console.error('Error loading team members:', err);
          alert('Error loading team members: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    } else if (this.isHeadManager) {
      // Head Manager sees only selected managers and their selected employees
      // Get selected manager IDs from localStorage (user-specific)
      const currentUserId = this.authService.getUserId();
      const storageKey = `headManagerSelectedManagers_${currentUserId || 'default'}`;
      const storedManagerIds = localStorage.getItem(storageKey);
      let managerIds: number[] = [];
      
      if (storedManagerIds) {
        try {
          managerIds = JSON.parse(storedManagerIds);
        } catch (e) {
          console.error('Error parsing stored manager IDs:', e);
          managerIds = [];
        }
      }

      if (managerIds.length === 0) {
        this.teamMembers = [];
        return;
      }

      this.adminService.getHeadManagerTeam(managerIds).subscribe({
        next: (teamMembers) => {
          const normalizedMembers = teamMembers.map((member: any) => ({
            ...member,
            role: (member.role || '').toLowerCase()
          }));
          
          // Separate managers and employees
          const managers = normalizedMembers.filter((m: any) => m.role === 'manager');
          const employees = normalizedMembers.filter((m: any) => m.role === 'employee');
          
          // Create a map for quick lookup
          const managerMap = new Map(managers.map(m => [m.id, m]));
          
          // Group employees by manager, preserving selection order from localStorage
          this.teamGroups = managerIds
            .filter(id => managerMap.has(id)) // Only include managers that exist
            .map((managerId, index) => {
              const manager = managerMap.get(managerId);
              const managerEmployees = employees.filter((emp: any) => emp.manager_id === managerId);
              return {
                manager: manager,
                employees: managerEmployees,
                selectionOrder: index + 1 // Team number based on selection order
              };
            });
          
          // Keep flat list for admin view
          this.teamMembers = normalizedMembers;
        },
        error: (err) => {
          console.error('Error loading head manager team:', err);
          alert('Error loading team members: ' + (err.error?.message || err.message || 'Unknown error'));
        }
      });
    }
  }
}
