import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiBase}/api/projects`;

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
