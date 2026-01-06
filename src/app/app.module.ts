import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { FooterComponent } from './components/shared/footer/footer.component';
import { SidebarComponent } from './components/shared/sidebar/sidebar.component';
import { HeaderComponent } from './components/shared/header/header.component';
import { CalenderComponent } from './components/calender/calender.component';
import { TimesheetComponent } from './components/timesheet/timesheet.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { ManagerDashboardComponent } from './components/manager-dashboard/manager-dashboard.component';
import { HeadManagerDashboardComponent } from './components/head-manager-dashboard/head-manager-dashboard.component';
import { EmployeeDashboardComponent } from './components/employee-dashboard/employee-dashboard.component';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from './interceptor/auth.interceptor';
import { TeamDetailsComponent } from './components/team-details/team-details.component';
import { EmployeeDetailsComponent } from './components/employee-details/employee-details.component';
import { CustomerDetailsComponent } from './components/customer-details/customer-details.component';
import { CreateTeamComponent } from './components/create-team/create-team.component';
import { ToastNotificationComponent } from './components/shared/toast-notification/toast-notification.component';
import { ConfirmationModalComponent } from './components/shared/confirmation-modal/confirmation-modal.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DynamicFormComponent } from './components/shared/dynamic-form/dynamic-form.component';
import { MaintenanceComponent } from './components/maintenance/maintenance.component';

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    FooterComponent,
    SidebarComponent,
    HeaderComponent,
    CalenderComponent,
    TimesheetComponent,
    LoginComponent,
    DashboardComponent,
    ProjectsComponent,
    AdminDashboardComponent,
    ManagerDashboardComponent,
    HeadManagerDashboardComponent,
    EmployeeDashboardComponent,
    TeamDetailsComponent,
    EmployeeDetailsComponent,
    CustomerDetailsComponent,
    CreateTeamComponent,
    ToastNotificationComponent,
    ConfirmationModalComponent,
    DynamicFormComponent,
    MaintenanceComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    {
    provide: HTTP_INTERCEPTORS,
    useClass: AuthInterceptor,
    multi: true
  },
],
  bootstrap: [AppComponent]
})
export class AppModule { }
