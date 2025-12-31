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
export class ProjectService {
  private apiUrl = buildApi('projects');

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getHeaders() {
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${this.auth.getToken()}`
      })
    };
  }

  getProjects(): Observable<any> {
    return this.http.get(this.apiUrl, this.getHeaders());
  }

  createProject(name: string): Observable<any> {
    return this.http.post(this.apiUrl, { name }, this.getHeaders());
  }
}
