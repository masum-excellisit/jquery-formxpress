// Type definitions for form-master 1.0.0
// Project: https://github.com/masum-excellisit/form-master
// Definitions by: Masum

/// <reference types="jquery" />

export interface FormMasterMessages {
  required?: string;
  email?: string;
  url?: string;
  number?: string;
  minLength?: string; // uses {min}
  maxLength?: string; // uses {max}
  min?: string; // uses {min}
  max?: string; // uses {max}
  pattern?: string;
  fileSize?: string; // uses {size}
  fileType?: string;
  phone?: string;
  [key: string]: string | undefined;
}

export interface FormMasterOptions {
  submitButton?: string | null;
  errorClass?: string;
  errorSpanClass?: string;
  progressBarClass?: string;
  previewClass?: string;
  showNameError?: boolean;
  humanizeNames?: boolean;
  successMessage?: string;
  ajax?: boolean;
  resetAfterSubmit?: boolean;
  maxFileSize?: number; // bytes
  allowedFileTypes?: string[]; // mime types or */*
  customRules?: { [fieldName: string]: (value: string, input: JQuery) => string | null };

  // Hooks
  beforeValidate?: (form: JQuery) => void;
  afterValidate?: (form: JQuery, isValid: boolean) => void;
  beforeSubmit?: (form: JQuery, formData: FormData) => boolean;
  onSuccess?: (response: any, form: JQuery) => void;
  onError?: (xhr: XMLHttpRequest, form: JQuery) => void;
  onProgress?: (percent: number, form: JQuery) => void;

  // Messages
  messages?: FormMasterMessages;
}

export interface FormMasterInstance {
  reset: () => void;
  validate: () => boolean;
  clearErrors: () => void;
}

declare global {
  interface JQuery {
    FormMaster(options?: FormMasterOptions): JQuery;
  }
}

export {};