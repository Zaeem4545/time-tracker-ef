import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const buildApi = (path: string) => {
  const base = (environment.apiBase || '').replace(/\/+$|\s+/g, '');
  const prefix = base.endsWith('/api') ? base : (base === '' ? '/api' : `${base}/api`);
  return `${prefix}/${path.replace(/^\/+/, '')}`;
};

@Injectable({
  providedIn: 'root'
})
export class ManagerService {
  private apiUrl = buildApi('');

  constructor(private http: HttpClient) {}

  getProjects() { return this.http.get<any[]>(buildApi('projects')); }
  getTeamMembers() { return this.http.get<any[]>(buildApi('users/team-members')); }
  getAllEmployees() { return this.http.get<any>(buildApi('users/employees')); }
  assignEmployee(employeeId: number) { return this.http.post(buildApi('users/assign-employee'), { employeeId }); }
  removeEmployee(employeeId: number) { return this.http.post(buildApi('users/remove-employee'), { employeeId }); }
}
