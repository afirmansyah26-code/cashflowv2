export interface TransactionRecord {
  id: number;
  user_id: number;
  category_id: number | null;
  category_name: string;
  type: "income" | "expense";
  amount: number;
  transaction_date: string;
  note: string | null;
  admin_notes?: string | null;
  attachment: string | null;
  username: string;
}

export interface TransactionCategory {
  id: number;
  name: string;
}

export interface TransactionFormValue {
  category_id: string;
  type: "income" | "expense";
  amount: string;
  transaction_date: string;
  note: string;
  admin_notes: string;
  attachment: string;
}

export type TransactionModalMode = "create" | "edit" | "duplicate";

export type OpenTransactionOptions =
  | { mode?: "create" }
  | { mode: "duplicate"; transaction: TransactionRecord };
