import { z } from "zod";

const optionalAmountSchema = z.preprocess(
  (value) => value === "" || value === undefined ? null : value,
  z.coerce
    .number({ message: "Nominal harus berupa angka" })
    .finite("Nominal tidak valid")
    .positive("Nominal harus lebih dari 0")
    .max(999999999999.99, "Nominal melebihi batas")
    .nullable(),
);

export const transactionTemplateSchema = z.object({
  name: z.string().trim().min(1, "Nama template wajib diisi").max(150, "Nama template terlalu panjang"),
  type: z.enum(["income", "expense"], { message: "Jenis transaksi tidak valid" }),
  category_id: z.coerce.number().int().positive().nullable().optional(),
  amount: optionalAmountSchema,
  note: z.string().max(2000, "Catatan terlalu panjang").nullable().optional(),
  admin_notes: z.string().max(2000, "Admin Notes terlalu panjang").nullable().optional(),
  is_global: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
}).strict();

export const updateTransactionTemplateSchema = transactionTemplateSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Minimal satu kolom harus diubah");

export const getTransactionTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(50).catch(12),
  search: z.string().max(100, "Pencarian terlalu panjang").catch(""),
  active_only: z.enum(["true", "false"]).catch("false"),
}).strict();

export const transactionTemplateIdSchema = z.coerce
  .number({ message: "ID template wajib berupa angka" })
  .int("ID template harus angka bulat")
  .positive("ID template tidak valid");
