export interface TransactionTemplate {
  id: number;
  user_id: number | null;
  name: string;
  type: "income" | "expense";
  category_id: number | null;
  category_name: string;
  amount: number | null;
  note: string | null;
  admin_notes?: string | null;
  is_global: boolean;
  is_active: boolean;
  owner_name: string;
  can_edit: boolean;
}

export interface TransactionTemplateFormValue {
  name: string;
  type: "income" | "expense";
  category_id: string;
  amount: string;
  note: string;
  admin_notes: string;
  is_global: boolean;
  is_active: boolean;
}

export interface TransactionTemplatesResponse {
  templates?: TransactionTemplate[];
  total?: number;
  totalPages?: number;
  error?: string;
}
