import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private config: any = null;
  private configLoaded: Promise<any>;

  constructor(private http: HttpClient) {
    // For production (Docker), load from config.json at runtime
    // For local development, use environment.ts values
    if (environment.production) {
      this.configLoaded = this.loadConfig();
    } else {
      // Local development - use environment.ts values
      this.config = {
        apiBase: environment.apiBase || 'http://localhost:3000',
        production: false
      };
      this.configLoaded = Promise.resolve(this.config);
    }
  }

  private loadConfig(): Promise<any> {
    return this.http.get('/assets/config.json').toPromise()
      .then((config: any) => {
        this.config = config;
        return config;
      })
      .catch((error) => {
        console.error('Error loading config.json, using defaults', error);
        // Fallback to defaults if config.json doesn't exist
        this.config = {
          apiBase: '/api',
          production: true
        };
        return this.config;
      });
  }

  async getConfig(): Promise<any> {
    await this.configLoaded;
    return this.config;
  }

  getApiBase(): string {
    // If config is loaded, use it; otherwise use environment
    if (this.config) {
      return this.config.apiBase || '/api';
    }
    return environment.apiBase || '/api';
  }

  isProduction(): boolean {
    if (this.config) {
      return this.config.production !== false;
    }
    return environment.production;
  }
}

