import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  private config: any = null;

  constructor(private http: HttpClient) {}

  loadConfig(): Promise<any> {
    // For production (Docker), load from config.json
    // For local development, use environment.ts
    if (environment.production) {
      return this.http.get('/assets/config.json').toPromise()
        .then((config: any) => {
          this.config = config;
          // Update environment at runtime
          (environment as any).apiBase = config.apiBase || '/api';
          return config;
        })
        .catch((error) => {
          console.error('Error loading config.json, using defaults', error);
          // Fallback to defaults if config.json doesn't exist
          this.config = {
            apiBase: '/api',
            production: true
          };
          (environment as any).apiBase = '/api';
          return this.config;
        });
    } else {
      // Local development - use environment.ts values
      this.config = {
        apiBase: environment.apiBase || 'http://localhost:3000',
        production: false
      };
      return Promise.resolve(this.config);
    }
  }

  getConfig(): any {
    return this.config;
  }
}

export function initializeApp(appInitService: AppInitService) {
  return (): Promise<any> => {
    return appInitService.loadConfig();
  };
}

