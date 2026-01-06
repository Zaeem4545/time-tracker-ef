import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.component.html',
  styleUrls: ['./maintenance.component.scss']
})
export class MaintenanceComponent implements OnInit {
  projectId: number | null = null;
  project: any = null;
  loading: boolean = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.projectId = params['projectId'] ? parseInt(params['projectId']) : null;
      if (this.projectId) {
        this.loadProject();
      } else {
        this.loading = false;
      }
    });
  }

  loadProject(): void {
    if (!this.projectId) return;
    
    this.loading = true;
    this.adminService.getProjects().subscribe({
      next: (projects) => {
        this.project = projects.find((p: any) => p.id === this.projectId);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading project:', err);
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/projects']);
  }
}

