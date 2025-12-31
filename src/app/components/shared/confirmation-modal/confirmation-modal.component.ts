import { Component, OnInit, OnDestroy } from '@angular/core';
import { ConfirmationModalService, ConfirmationModalData } from '../../../services/confirmation-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent implements OnInit, OnDestroy {
  show: boolean = false;
  data: ConfirmationModalData | null = null;
  private subscription?: Subscription;

  constructor(private confirmationService: ConfirmationModalService) {}

  ngOnInit(): void {
    this.subscription = this.confirmationService.modal$.subscribe(data => {
      this.data = data;
      this.show = !!data;
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  onConfirm(): void {
    this.confirmationService.confirm(true);
  }

  onCancel(): void {
    this.confirmationService.confirm(false);
  }

  onBackdropClick(): void {
    // Don't close on backdrop click for confirmation dialogs
  }
}

