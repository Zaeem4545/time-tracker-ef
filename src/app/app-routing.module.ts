import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { TimesheetComponent } from './components/timesheet/timesheet.component';
import { CalenderComponent } from './components/calender/calender.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginComponent } from './components/login/login.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ManagerDashboardComponent } from './components/manager-dashboard/manager-dashboard.component';
import { HeadManagerDashboardComponent } from './components/head-manager-dashboard/head-manager-dashboard.component';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard.component';
import { TeamDetailsComponent } from './components/team-details/team-details.component';
import { EmployeeDetailsComponent } from './components/employee-details/employee-details.component';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { CreateTeamComponent } from './components/create-team/create-team.component';
import { MaintenanceComponent } from './components/maintenance/maintenance.component';
import { AdminDashboardPageComponent } from './components/admin-dashboard-page/admin-dashboard-page.component';
import { RoleGuard } from './guards/role.guard';

const routes: Routes = [
  { path: 'employee', component: EmployeeDashboardComponent, canActivate: [RoleGuard], data: { roles: ['employee'] } },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] }, // General dashboard page for all authenticated users
  { path: 'create-project', component: ProjectsComponent, canActivate: [RoleGuard], data: { roles: ['head manager', 'admin', 'manager', 'employee'], mode: 'create' } },
  { path: 'my-projects-tasks', component: ProjectsComponent, canActivate: [RoleGuard], data: { roles: ['head manager'], mode: 'my-projects' } },
  { path: 'projects', component: ProjectsComponent, canActivate: [AuthGuard] },
  { path: 'timesheet', component: TimesheetComponent, canActivate: [AuthGuard] },
  { path: 'calendar', component: CalenderComponent, canActivate: [AuthGuard] },
  { path: 'team-details', component: TeamDetailsComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'head manager'] } },
  { path: 'create-team', component: CreateTeamComponent, canActivate: [RoleGuard], data: { roles: ['admin', 'head manager'] } },
  { path: 'employee-details', component: EmployeeDetailsComponent, canActivate: [RoleGuard], data: { roles: ['manager'] } },
  { path: 'customer-details', component: CustomerDetailsComponent, canActivate: [AuthGuard] },
  { path: 'maintenance', component: MaintenanceComponent, canActivate: [AuthGuard] },
  { path: 'login', component: LoginComponent },
  { path: 'manager', component: ManagerDashboardComponent, canActivate: [RoleGuard], data: { roles: ['manager'] } },
  { path: 'head-manager', component: HeadManagerDashboardComponent, canActivate: [RoleGuard], data: { roles: ['head manager'] } },
  { path: 'admin-dashboard', component: AdminDashboardPageComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: 'admin', component: AdminDashboardComponent, canActivate: [RoleGuard], data: { roles: ['admin'] } },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
