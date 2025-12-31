import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface DynamicField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'date' | 'number' | 'select' | 'textarea' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  value?: any;
  order?: number;
  nonDeletable?: boolean; // If true, field cannot be removed
}

export interface FormConfig {
  formId: string;
  fields: DynamicField[];
}

@Injectable({
  providedIn: 'root'
})
export class DynamicFormService {
  private formConfigs = new BehaviorSubject<{ [key: string]: FormConfig }>({});
  public formConfigs$ = this.formConfigs.asObservable();

  constructor() {
    this.loadFormConfigs();
  }

  // Load form configurations from localStorage
  private loadFormConfigs(): void {
    const stored = localStorage.getItem('dynamicFormConfigs');
    if (stored) {
      try {
        this.formConfigs.next(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading form configs:', e);
      }
    }
  }

  // Save form configurations to localStorage
  private saveFormConfigs(): void {
    localStorage.setItem('dynamicFormConfigs', JSON.stringify(this.formConfigs.value));
  }

  // Get form configuration
  getFormConfig(formId: string): FormConfig | null {
    return this.formConfigs.value[formId] || null;
  }

  // Initialize form with default fields
  initializeForm(formId: string, defaultFields: DynamicField[]): void {
    const existing = this.formConfigs.value[formId];
    // Always update to ensure all default fields are included (especially for customer_id)
    const config: FormConfig = {
      formId,
      fields: defaultFields.map((field, index) => ({
        ...field,
        id: field.id || `field_${index}`,
        order: field.order || index
      }))
    };
    
    // If form exists, merge with existing fields to preserve custom fields
    if (existing) {
      const existingFieldIds = new Set(existing.fields.map(f => f.id));
      const defaultFieldIds = new Set(defaultFields.map(f => f.id));
      
      // Add any default fields that don't exist, or restore non-deletable fields
      defaultFields.forEach(field => {
        if (!existingFieldIds.has(field.id)) {
          existing.fields.push({
            ...field,
            id: field.id || `field_${existing.fields.length}`,
            order: field.order || existing.fields.length
          });
        } else {
          // Update existing field with default values (preserve custom fields but update defaults)
          const existingFieldIndex = existing.fields.findIndex(f => f.id === field.id);
          if (existingFieldIndex !== -1) {
            // If field is non-deletable, ensure it's restored with correct properties
            if (field.nonDeletable) {
              existing.fields[existingFieldIndex] = {
                ...existing.fields[existingFieldIndex],
                ...field,
                id: existing.fields[existingFieldIndex].id, // Preserve existing ID
                order: field.order !== undefined ? field.order : existing.fields[existingFieldIndex].order,
                nonDeletable: true // Ensure non-deletable flag is set
              };
            } else {
              existing.fields[existingFieldIndex] = {
                ...existing.fields[existingFieldIndex],
                ...field,
                id: existing.fields[existingFieldIndex].id, // Preserve existing ID
                order: field.order !== undefined ? field.order : existing.fields[existingFieldIndex].order
              };
            }
          }
        }
      });
      
      // Remove any fields that were deleted but are non-deletable (restore them)
      const nonDeletableFieldIds = new Set(defaultFields.filter(f => f.nonDeletable).map(f => f.id));
      const missingNonDeletableFields = defaultFields.filter(f => {
        const fieldId = f.id || f.name;
        return f.nonDeletable && !existing.fields.some(existingField => existingField.id === fieldId);
      });
      
      if (missingNonDeletableFields.length > 0) {
        missingNonDeletableFields.forEach(field => {
          existing.fields.push({
            ...field,
            id: field.id || `field_${existing.fields.length}`,
            order: field.order || existing.fields.length
          });
        });
      }
      
      // Sort by order
      existing.fields.sort((a, b) => (a.order || 0) - (b.order || 0));
      this.updateFormConfig(formId, existing);
    } else {
      this.updateFormConfig(formId, config);
    }
  }

  // Update form configuration
  updateFormConfig(formId: string, config: FormConfig): void {
    const current = this.formConfigs.value;
    current[formId] = config;
    this.formConfigs.next(current);
    this.saveFormConfigs();
  }

  // Add field to form
  addField(formId: string, field: DynamicField): void {
    const config = this.getFormConfig(formId);
    if (config) {
      const newField: DynamicField = {
        ...field,
        id: field.id || `field_${Date.now()}`,
        order: field.order || config.fields.length
      };
      config.fields.push(newField);
      this.updateFormConfig(formId, config);
    }
  }

  // Remove field from form
  removeField(formId: string, fieldId: string): void {
    const config = this.getFormConfig(formId);
    if (config) {
      const field = config.fields.find(f => f.id === fieldId);
      // Prevent removal of non-deletable fields
      if (field && field.nonDeletable) {
        return;
      }
      config.fields = config.fields.filter(f => f.id !== fieldId);
      this.updateFormConfig(formId, config);
    }
  }

  // Update field in form
  updateField(formId: string, fieldId: string, updates: Partial<DynamicField>): void {
    const config = this.getFormConfig(formId);
    if (config) {
      const fieldIndex = config.fields.findIndex(f => f.id === fieldId);
      if (fieldIndex !== -1) {
        config.fields[fieldIndex] = { ...config.fields[fieldIndex], ...updates };
        this.updateFormConfig(formId, config);
      }
    }
  }

  // Reorder fields
  reorderFields(formId: string, fieldIds: string[]): void {
    const config = this.getFormConfig(formId);
    if (config) {
      const fieldsMap = new Map(config.fields.map(f => [f.id, f]));
      config.fields = fieldIds.map((id, index) => {
        const field = fieldsMap.get(id);
        if (field) {
          field.order = index;
          return field;
        }
        return null;
      }).filter(f => f !== null) as DynamicField[];
      this.updateFormConfig(formId, config);
    }
  }

  // Reset form to default fields
  resetForm(formId: string, defaultFields: DynamicField[]): void {
    const config: FormConfig = {
      formId,
      fields: defaultFields.map((field, index) => ({
        ...field,
        id: field.id || `field_${index}`,
        order: field.order || index
      }))
    };
    this.updateFormConfig(formId, config);
  }
}

