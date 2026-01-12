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
export class AdminService {
  private apiUrl = buildApi('');

  constructor(private http: HttpClient) { }

  getUsers() { return this.http.get<any[]>(buildApi('users')); }
  createUser(user: any) { return this.http.post(buildApi('users'), user); }
  notifySelectedManagers(managerIds: number[]) { return this.http.post(buildApi('users/notify-selected'), { managerIds }); }
  updateUser(id: number, user: any) { return this.http.put(buildApi(`users/${id}`), user); }
  updateUserInfo(id: number, userInfo: { email: string; role: string; contact_number?: string }) { return this.http.put(buildApi(`users/${id}/info`), userInfo); }
  updateUserPassword(id: number, passwords: { currentPassword: string; password: string }) { return this.http.put(buildApi(`users/${id}/password`), passwords); }
  updateUserRole(id: number, role: string) { return this.http.put(buildApi(`users/${id}/role`), { role }); }
  deleteUser(id: number) { return this.http.delete(buildApi(`users/${id}`)); }

  getProjects() { return this.http.get<any[]>(buildApi('projects')); }
  getSelectedProjects() { return this.http.get<any[]>(buildApi('projects/selected')); }
  createProject(project: any) { return this.http.post(buildApi('projects'), project); }
  updateProject(id: number, project: any) { return this.http.put(buildApi(`projects/${id}`), project); }
  assignManagerToProject(id: number, managerId: number | null) { return this.http.put(buildApi(`projects/${id}/assign-manager`), { manager_id: managerId }); }
  selectProject(id: number) { return this.http.put<any>(buildApi(`projects/${id}/select`), {}); }
  deleteProject(id: number) { return this.http.delete(buildApi(`projects/${id}`)); }

  // Comments
  getProjectComments(projectId: number) { return this.http.get<any>(buildApi(`projects/${projectId}/comments`)); }
  createProjectComment(projectId: number, comment: string) { return this.http.post<any>(buildApi(`projects/${projectId}/comments`), { comment }); }
  updateProjectComment(projectId: number, commentId: number, comment: string) { return this.http.put<any>(buildApi(`projects/${projectId}/comments/${commentId}`), { comment }); }
  deleteProjectComment(projectId: number, commentId: number) { return this.http.delete<any>(buildApi(`projects/${projectId}/comments/${commentId}`)); }
  getProjectHistory(projectId: number) { return this.http.get<any>(buildApi(`history/project/${projectId}`)); }
  getTaskHistory(taskId: number) { return this.http.get<any>(buildApi(`history/task/${taskId}`)); }
  getTaskComments(taskId: number) { return this.http.get<any>(buildApi(`tasks/${taskId}/comments`)); }
  createTaskComment(taskId: number, comment: string) { return this.http.post<any>(buildApi(`tasks/${taskId}/comments`), { comment }); }
  updateTaskComment(taskId: number, commentId: number, comment: string) { return this.http.put<any>(buildApi(`tasks/${taskId}/comments/${commentId}`), { comment }); }
  deleteTaskComment(taskId: number, commentId: number) { return this.http.delete<any>(buildApi(`tasks/${taskId}/comments/${commentId}`)); }

  getTasks(projectId: number) { return this.http.get<any[]>(buildApi(`tasks/project/${projectId}`)); }
  createTask(task: any) { return this.http.post(buildApi('tasks'), task); }
  updateTask(id: number, task: any) { return this.http.put(buildApi(`tasks/${id}`), task); }
  deleteTask(id: number) { return this.http.delete(buildApi(`tasks/${id}`)); }
  getTaskTimeTracking(taskId: number) { return this.http.get<any[]>(buildApi(`tasks/${taskId}/time-tracking`)); }

  getTimeEntries() { return this.http.get<any[]>(buildApi('time-entries')); }
  getActiveTimeEntry() { return this.http.get<any>(buildApi('time-entries/active')); }
  startTime(projectId: number, taskName?: string, description?: string, startTime?: string) {
    return this.http.post<any>(buildApi('time-entries/start'), {
      project_id: projectId,
      task_name: taskName,
      description,
      start_time: startTime
    });
  }
  stopTime(entryId: number) {
    return this.http.post<any>(buildApi(`time-entries/stop/${entryId}`), {});
  }
  updateTimeEntry(id: number, data: any) {
    return this.http.put<any>(buildApi(`time-entries/${id}`), data);
  }
  deleteTimeEntry(id: number) {
    return this.http.delete(buildApi(`time-entries/${id}`));
  }
  clearAllTimeEntries() {
    return this.http.delete(buildApi('time-entries'));
  }
  createTimeEntry(entry: any) {
    return this.http.post<any>(buildApi('time-entries'), entry);
  }
  getHeadManagerTeam(managerIds: number[]) {
    return this.http.post<any[]>(buildApi('users/head-manager-team'), { managerIds });
  }
  getEmployeeTasks() { return this.http.get<any[]>(buildApi('tasks/employee/my-tasks')); }

  // Team management methods
  assignEmployeeToManager(employeeId: number, managerId: number) {
    return this.http.put(buildApi(`users/${employeeId}`), { manager_id: managerId });
  }

  // Customer methods
  getCustomers() { return this.http.get<any[]>(buildApi('customers')); }
  createCustomer(customer: any) { return this.http.post(buildApi('customers'), customer); }
  updateCustomer(id: number, customer: any) { return this.http.put(buildApi(`customers/${id}`), customer); }
  deleteCustomer(id: number) { return this.http.delete(buildApi(`customers/${id}`)); }

  // File upload methods
  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(buildApi('upload'), formData);
  }
}
