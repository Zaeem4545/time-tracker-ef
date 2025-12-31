import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getProjects() { return this.http.get<any[]>(`${this.apiUrl}/projects`); }
  getTeamMembers() { return this.http.get<any[]>(`${this.apiUrl}/users/team-members`); }
  getAllEmployees() { return this.http.get<any>(`${this.apiUrl}/users/employees`); }
  assignEmployee(employeeId: number) { return this.http.post(`${this.apiUrl}/users/assign-employee`, { employeeId }); }
  removeEmployee(employeeId: number) { return this.http.post(`${this.apiUrl}/users/remove-employee`, { employeeId }); }
}
