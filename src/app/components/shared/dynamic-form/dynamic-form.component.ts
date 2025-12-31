import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { DynamicFormService, DynamicField, FormConfig } from '../../../services/dynamic-form.service';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss']
})
export class DynamicFormComponent implements OnInit, OnChanges {
  @Input() formId: string = '';
  @Input() defaultFields: DynamicField[] = [];
  @Input() showAddField: boolean = true;
  @Input() formData: any = {};
  @Input() dynamicOptions: { [fieldName: string]: { value: string; label: string }[] } = {};
  @Input() hiddenFields: string[] = [];
  @Output() formSubmit = new EventEmitter<any>();
  @Output() formDataChange = new EventEmitter<any>();

  fields: DynamicField[] = [];
  showAddFieldModal: boolean = false;
  newField: Partial<DynamicField> = {
    type: 'text',
    required: false
  };
  newFieldOptions: { value: string; label: string }[] = [];
  newOptionName: string = '';

  constructor(private dynamicFormService: DynamicFormService) {}

  ngOnInit(): void {
    if (this.formId && this.defaultFields.length > 0) {
      this.dynamicFormService.initializeForm(this.formId, this.defaultFields);
    }
    
    this.loadFields();
    
    this.dynamicFormService.formConfigs$.subscribe(() => {
      this.loadFields();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When formData changes, ensure select fields have string values
    if (changes['formData'] && this.formData) {
      // Convert customer_id to string if it's a number
      if (this.formData.customer_id !== undefined && this.formData.customer_id !== null && this.formData.customer_id !== '') {
        if (typeof this.formData.customer_id === 'number') {
          this.formData.customer_id = this.formData.customer_id.toString();
        }
      }
    }
    
    // When dynamicOptions changes, reload fields to update select options
    if (changes['dynamicOptions']) {
      // Force change detection for select fields
      this.loadFields();
    }
  }

  loadFields(): void {
    const config = this.dynamicFormService.getFormConfig(this.formId);
    if (config && config.fields.length > 0) {
      // Merge with defaultFields to ensure all required fields are present
      const defaultFieldIds = new Set(this.defaultFields.map(f => f.id || f.name));
      const configFieldIds = new Set(config.fields.map(f => f.id || f.name));
      
      // Add any missing default fields
      const missingFields = this.defaultFields.filter(f => {
        const fieldId = f.id || f.name;
        return fieldId && !configFieldIds.has(fieldId);
      });
      
      if (missingFields.length > 0) {
        // Add missing fields to config
        missingFields.forEach(field => {
          config.fields.push({
            ...field,
            id: field.id || field.name || `field_${config.fields.length}`,
            order: field.order !== undefined ? field.order : config.fields.length
          });
        });
        // Sort by order
        config.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
      
      this.fields = [...config.fields].sort((a, b) => (a.order || 0) - (b.order || 0));
    } else if (this.defaultFields.length > 0) {
      this.fields = [...this.defaultFields].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  }

  onFieldChange(fieldId: string, value: any): void {
    this.formData[fieldId] = value;
    this.formDataChange.emit(this.formData);
  }

  onFileChange(fieldId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.formData[fieldId] = file;
      this.formDataChange.emit(this.formData);
    }
  }

  getFileLabel(fieldId: string): string {
    const file = this.formData[fieldId];
    if (file && file instanceof File) {
      return file.name;
    }
    if (file && typeof file === 'string') {
      return file.split('/').pop() || file;
    }
    return '';
  }

  clearFile(fieldId: string): void {
    delete this.formData[fieldId];
    const input = document.getElementById('file_' + fieldId) as HTMLInputElement;
    if (input) {
      input.value = '';
    }
    this.formDataChange.emit(this.formData);
  }

  getFieldValue(fieldId: string): any {
    const value = this.formData[fieldId];
    // For select fields, convert null/undefined to empty string, and numbers to strings
    if (value === null || value === undefined) {
      return '';
    }
    // If it's a number, convert to string for select dropdowns
    if (typeof value === 'number') {
      return value.toString();
    }
    return value || '';
  }

  getFieldOptions(field: DynamicField): { value: string; label: string }[] {
    // Check if dynamic options are provided for this field (check both name and id)
    if (field.name && this.dynamicOptions[field.name] && this.dynamicOptions[field.name].length > 0) {
      return this.dynamicOptions[field.name];
    }
    if (field.id && this.dynamicOptions[field.id] && this.dynamicOptions[field.id].length > 0) {
      return this.dynamicOptions[field.id];
    }
    // Otherwise use static options from field definition
    return field.options || [];
  }

  isFieldHidden(fieldId: string): boolean {
    return this.hiddenFields.includes(fieldId);
  }

  addField(): void {
    if (this.newField.name && this.newField.label && this.newField.type) {
      // For select fields, require at least one option
      if (this.newField.type === 'select' && this.newFieldOptions.length === 0) {
        alert('Please add at least one option for the dropdown field.');
        return;
      }
      
      const field: DynamicField = {
        id: `field_${Date.now()}`,
        name: this.newField.name,
        label: this.newField.label,
        type: this.newField.type as any,
        placeholder: this.newField.placeholder || '',
        required: this.newField.required || false,
        options: this.newField.type === 'select' ? this.newFieldOptions : (this.newField.options || []),
        order: this.fields.length
      };
      
      this.dynamicFormService.addField(this.formId, field);
      this.resetNewField();
      this.showAddFieldModal = false;
    }
  }

  addOption(): void {
    if (this.newOptionName.trim()) {
      // Check if option already exists (case-insensitive)
      const optionNameLower = this.newOptionName.trim().toLowerCase();
      if (this.newFieldOptions.some(opt => opt.label.toLowerCase() === optionNameLower)) {
        alert('This option already exists. Please use a different name.');
        return;
      }
      
      // Use the name as both value and label
      const optionName = this.newOptionName.trim();
      this.newFieldOptions.push({
        value: optionName,
        label: optionName
      });
      this.newOptionName = '';
    } else {
      alert('Please enter an option name.');
    }
  }

  removeOption(index: number): void {
    this.newFieldOptions.splice(index, 1);
  }

  resetNewField(): void {
    this.newField = { type: 'text', required: false };
    this.newFieldOptions = [];
    this.newOptionName = '';
  }

  removeField(fieldId: string): void {
    const field = this.fields.find(f => f.id === fieldId);
    // Prevent removal of non-deletable fields
    if (field && field.nonDeletable) {
      return;
    }
    if (confirm('Are you sure you want to remove this field?')) {
      this.dynamicFormService.removeField(this.formId, fieldId);
      delete this.formData[fieldId];
      this.formDataChange.emit(this.formData);
    }
  }

  isFieldDeletable(field: DynamicField): boolean {
    return !field.nonDeletable;
  }

  onSubmit(): void {
    this.formSubmit.emit(this.formData);
  }

  toggleAddFieldModal(): void {
    this.showAddFieldModal = !this.showAddFieldModal;
    if (!this.showAddFieldModal) {
      this.resetNewField();
    }
  }

  onFieldTypeChange(): void {
    // Reset options when field type changes
    if (this.newField.type !== 'select') {
      this.newFieldOptions = [];
    }
  }
}

