import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ToastMessage {
  message: string;
  type?: 'success' | 'info' | 'warning' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class ToastNotificationService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  public toast$: Observable<ToastMessage | null> = this.toastSubject.asObservable();

  show(message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info'): void {
    this.toastSubject.next({ message, type });
  }

  getToast(): Observable<ToastMessage | null> {
    return this.toast$;
  }
}

