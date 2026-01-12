import { Component, OnInit } from '@angular/core';
import { ManagerService } from '../../services/manager.service';

@Component({
  selector: 'app-employee-details',
  templateUrl: './employee-details.component.html',
  styleUrls: ['./employee-details.component.scss']
})
export class EmployeeDetailsComponent implements OnInit {
  employees: any[] = [];

  constructor(private managerService: ManagerService) {}

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees() {
    this.managerService.getTeamMembers().subscribe({
      next: (teamMembers) => {
        this.employees = teamMembers.map((member: any) => ({
          ...member,
          role: (member.role || '').toLowerCase()
        }));
      },
      error: (err) => {
        console.error('Error loading engineers:', err);
        alert('Error loading engineers: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }
}
