import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastNotificationService } from '../../../services/toast-notification.service';
import { Subscription } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-toast-notification',
  templateUrl: './toast-notification.component.html',
  styleUrls: ['./toast-notification.component.scss'],
  animations: [
    trigger('slideInOut', [
      state('in', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      state('out', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      transition('out => in', animate('300ms ease-out')),
      transition('in => out', animate('300ms ease-in'))
    ])
  ]
})
export class ToastNotificationComponent implements OnInit, OnDestroy {
  message: string = '';
  show: boolean = false;
  type: 'success' | 'info' | 'warning' | 'error' = 'info';
  private subscription?: Subscription;
  private hideTimeout?: any;

  constructor(private toastService: ToastNotificationService) {}

  ngOnInit(): void {
    this.subscription = this.toastService.getToast().subscribe(toast => {
      if (toast) {
        // Clear any existing timeout
        if (this.hideTimeout) {
          clearTimeout(this.hideTimeout);
        }
        
        this.message = toast.message;
        this.type = toast.type || 'info';
        this.show = true;
        
        // Auto-hide after 5 seconds
        this.hideTimeout = setTimeout(() => {
          this.show = false;
        }, 5000);
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }

  close(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
    this.show = false;
  }
}

