import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  templateUrl: './date-range-picker.component.html',
  styleUrl: './date-range-picker.component.scss',
})
export class DateRangePickerComponent {
  @Input() label = 'Periodo';
  @Input() startLabel = 'Fecha inicial';
  @Input() endLabel = 'Fecha final';
  @Input() startValue = '';
  @Input() endValue = '';
  @Output() startValueChange = new EventEmitter<string>();
  @Output() endValueChange = new EventEmitter<string>();
}
