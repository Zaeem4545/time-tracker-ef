import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getUsers() { return this.http.get<any[]>(`${this.apiUrl}/users`); }
  createUser(user: any) { return this.http.post(`${this.apiUrl}/users`, user); }
  notifySelectedManagers(managerIds: number[]) { return this.http.post(`${this.apiUrl}/users/notify-selected`, { managerIds }); }
  updateUser(id: number, user: any) { return this.http.put(`${this.apiUrl}/users/${id}`, user); }
  updateUserInfo(id: number, userInfo: { email: string; role: string; contact_number?: string }) { return this.http.put(`${this.apiUrl}/users/${id}/info`, userInfo); }
  updateUserPassword(id: number, passwords: { currentPassword: string; password: string }) { return this.http.put(`${this.apiUrl}/users/${id}/password`, passwords); }
  updateUserRole(id: number, role: string) { return this.http.put(`${this.apiUrl}/users/${id}/role`, { role }); }
  deleteUser(id: number) { return this.http.delete(`${this.apiUrl}/users/${id}`); }

  getProjects() { return this.http.get<any[]>(`${this.apiUrl}/projects`); }
  getSelectedProjects() { return this.http.get<any[]>(`${this.apiUrl}/projects/selected`); }
  createProject(project: any) { return this.http.post(`${this.apiUrl}/projects`, project); }
  updateProject(id: number, project: any) { return this.http.put(`${this.apiUrl}/projects/${id}`, project); }
  assignManagerToProject(id: number, managerId: number | null) { return this.http.put(`${this.apiUrl}/projects/${id}/assign-manager`, { manager_id: managerId }); }
  selectProject(id: number) { return this.http.put<any>(`${this.apiUrl}/projects/${id}/select`, {}); }
  deleteProject(id: number) { return this.http.delete(`${this.apiUrl}/projects/${id}`); }
  
  // Comments
  getProjectComments(projectId: number) { return this.http.get<any>(`${this.apiUrl}/projects/${projectId}/comments`); }
  createProjectComment(projectId: number, comment: string) { return this.http.post<any>(`${this.apiUrl}/projects/${projectId}/comments`, { comment }); }
  updateProjectComment(projectId: number, commentId: number, comment: string) { return this.http.put<any>(`${this.apiUrl}/projects/${projectId}/comments/${commentId}`, { comment }); }
  deleteProjectComment(projectId: number, commentId: number) { return this.http.delete<any>(`${this.apiUrl}/projects/${projectId}/comments/${commentId}`); }
  getProjectHistory(projectId: number) { return this.http.get<any>(`${this.apiUrl}/history/project/${projectId}`); }
  getTaskHistory(taskId: number) { return this.http.get<any>(`${this.apiUrl}/history/task/${taskId}`); }
  getTaskComments(taskId: number) { return this.http.get<any>(`${this.apiUrl}/tasks/${taskId}/comments`); }
  createTaskComment(taskId: number, comment: string) { return this.http.post<any>(`${this.apiUrl}/tasks/${taskId}/comments`, { comment }); }
  updateTaskComment(taskId: number, commentId: number, comment: string) { return this.http.put<any>(`${this.apiUrl}/tasks/${taskId}/comments/${commentId}`, { comment }); }
  deleteTaskComment(taskId: number, commentId: number) { return this.http.delete<any>(`${this.apiUrl}/tasks/${taskId}/comments/${commentId}`); }

  getTasks(projectId: number) { return this.http.get<any[]>(`${this.apiUrl}/tasks/project/${projectId}`); }
  createTask(task: any) { return this.http.post(`${this.apiUrl}/tasks`, task); }
  updateTask(id: number, task: any) { return this.http.put(`${this.apiUrl}/tasks/${id}`, task); }
  deleteTask(id: number) { return this.http.delete(`${this.apiUrl}/tasks/${id}`); }
  getTaskTimeTracking(taskId: number) { return this.http.get<any[]>(`${this.apiUrl}/tasks/${taskId}/time-tracking`); }

  getTimeEntries() { return this.http.get<any[]>(`${this.apiUrl}/time-entries`); }
  getActiveTimeEntry() { return this.http.get<any>(`${this.apiUrl}/time-entries/active`); }
  startTime(projectId: number, taskName?: string, description?: string) { 
    return this.http.post<any>(`${this.apiUrl}/time-entries/start`, { project_id: projectId, task_name: taskName, description }); 
  }
  stopTime(entryId: number) { 
    return this.http.post<any>(`${this.apiUrl}/time-entries/stop/${entryId}`, {}); 
  }
  updateTimeEntry(id: number, data: any) { 
    return this.http.put<any>(`${this.apiUrl}/time-entries/${id}`, data); 
  }
  deleteTimeEntry(id: number) { 
    return this.http.delete<any>(`${this.apiUrl}/time-entries/${id}`); 
  }
  clearAllTimeEntries() { 
    return this.http.delete<any>(`${this.apiUrl}/time-entries`); 
  }
  createTimeEntry(entry: any) { 
    return this.http.post<any>(`${this.apiUrl}/time-entries`, entry); 
  }
  getHeadManagerTeam(managerIds: number[]) { 
    return this.http.post<any[]>(`${this.apiUrl}/users/head-manager-team`, { managerIds }); 
  }
  getEmployeeTasks() { return this.http.get<any[]>(`${this.apiUrl}/tasks/employee/my-tasks`); }
  
  // Team management methods
  assignEmployeeToManager(employeeId: number, managerId: number) {
    return this.http.put(`${this.apiUrl}/users/${employeeId}`, { manager_id: managerId });
  }

  // Customer methods
  getCustomers() { return this.http.get<any[]>(`${this.apiUrl}/customers`); }
  createCustomer(customer: any) { return this.http.post(`${this.apiUrl}/customers`, customer); }
  updateCustomer(id: number, customer: any) { return this.http.put(`${this.apiUrl}/customers/${id}`, customer); }
  deleteCustomer(id: number) { return this.http.delete(`${this.apiUrl}/customers/${id}`); }
  
  // File upload methods
  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }
}
