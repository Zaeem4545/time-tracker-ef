import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfirmationModalData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationModalService {
  private modalSubject = new BehaviorSubject<ConfirmationModalData | null>(null);
  public modal$: Observable<ConfirmationModalData | null> = this.modalSubject.asObservable();
  
  private resolveSubject = new BehaviorSubject<((value: boolean) => void) | null>(null);
  public resolve$: Observable<((value: boolean) => void) | null> = this.resolveSubject.asObservable();

  show(data: ConfirmationModalData): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolveSubject.next(resolve);
      this.modalSubject.next({
        title: data.title || 'Confirm',
        message: data.message,
        confirmText: data.confirmText || 'Confirm',
        cancelText: data.cancelText || 'Cancel',
        type: data.type || 'warning'
      });
    });
  }

  confirm(result: boolean): void {
    const resolve = this.resolveSubject.value;
    if (resolve) {
      resolve(result);
    }
    this.close();
  }

  close(): void {
    this.modalSubject.next(null);
    this.resolveSubject.next(null);
  }
}

