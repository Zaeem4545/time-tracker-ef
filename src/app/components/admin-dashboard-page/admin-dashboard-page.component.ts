import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard-page',
  template: `
    <div class="page-container">
      <div class="content-card">
        <h2 class="page-title-main">
          <span class="arrow">►</span>
          <span class="title-text">Admin Dashboard</span>
        </h2>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 2rem;
      min-height: calc(100vh - 56px);
    }
    .content-card {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .page-title-main {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .arrow {
      color: #1976d2;
    }
  `]
})
export class AdminDashboardPageComponent {
}

