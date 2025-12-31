import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient, private auth: AuthService) {}

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
}
