import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'manager-estimates-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manager-estimates.html'
})
export class ManagerEstimatesModal {
  @Input() loading = false;
  @Input() data: any = null;
  @Output() close = new EventEmitter<void>();
}
