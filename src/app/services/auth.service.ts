import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiBase}/api/auth`;
  private tokenKey = 'token';
  private roleKey = 'role';
  userRole: string | null = null;

  private loggedIn = new BehaviorSubject<boolean>(!!this.getToken());
  isLoggedIn$ = this.loggedIn.asObservable();

  constructor(private http: HttpClient, ) {}

  // Token management
  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    this.userRole = null;
  }

  // Role management
  setRole(role: string) {
    localStorage.setItem(this.roleKey, role);
    this.userRole = role;
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  // Get user ID from JWT token
  getUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      // Decode JWT token (without verification, just to get payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.id || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Get user email from JWT token
  getEmail(): string | null {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      // Decode JWT token (without verification, just to get payload)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.email || null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Email + password login
  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap(res => {
        if (res?.token) {
          this.setToken(res.token);
          this.setRole(res.role); // ✅ use res.role
          this.loggedIn.next(true);
        }
      })
    );
  }

  // Google login
  loginWithGoogle(idToken: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/google`, { idToken }).pipe(
      tap(res => {
        if (res?.token) {
          this.setToken(res.token);
          this.setRole(res.role); // ✅ use res.role
          this.loggedIn.next(true);
        }
      })
    );
  }

  logout() {
    this.removeToken();
    this.loggedIn.next(false);
  }
}
