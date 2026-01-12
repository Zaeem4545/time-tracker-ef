import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const buildApi = (path: string) => {
  const base = (environment.apiBase || '').replace(/\/+$|\s+/g, '');
  const prefix = base.endsWith('/api') ? base : (base === '' ? '/api' : `${base}/api`);
  return `${prefix}/${path.replace(/^\/+/, '')}`;
};

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = buildApi('users');

  constructor(private http: HttpClient, private auth: AuthService) { }

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`
      })
    };
  }

  getAllUsers(): Observable<any> {
    return this.http.get(this.apiUrl, this.getHeaders());
  }

  updateRole(userId: number, role: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${userId}/role`, { role }, this.getHeaders());
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/profile`, data, this.getHeaders());
  }
}
