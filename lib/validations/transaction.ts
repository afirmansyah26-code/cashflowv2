import { z } from 'zod';

export const dateSchema = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    return value;
  },
  z.coerce.date({
    message: "Tanggal wajib diisi dan valid",
  })
);

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    message: "Tipe transaksi tidak valid",
  }),
  amount: z.coerce
    .number({
      message: "Nominal wajib diisi dan berupa angka",
    })
    .finite("Nominal tidak valid")
    .positive("Nominal harus positif")
    .max(999999999999.99, "Nominal melebihi batas yang diizinkan"),
  transaction_date: dateSchema,
  category_id: z.coerce.number().int().positive().nullable().optional(),
  note: z.string().max(2000, "Catatan terlalu panjang").nullable().optional(),
  attachment: z.string().max(255, "Path attachment terlalu panjang").nullable().optional(),
}).strict();

export const adminTransactionSchema = transactionSchema.extend({
  admin_notes: z.string().max(2000, "Catatan admin terlalu panjang").nullable().optional(),
}).strict();

export const updateTransactionSchema = transactionSchema.partial().strict().refine(
  data => Object.keys(data).length > 0,
  "Minimal satu kolom harus diisi untuk update"
);

export const adminUpdateTransactionSchema = adminTransactionSchema.partial().strict().refine(
  data => Object.keys(data).length > 0,
  "Minimal satu kolom harus diisi untuk update"
);

export const getTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  limit: z.coerce.number().int().min(1).max(100).catch(25),
  search: z.string().max(100, "Pencarian terlalu panjang").catch(""),
  filter_type: z.enum(['income', 'expense', '']).catch(""),
  filter_category: z.coerce.number().int().positive().catch(0),
  date_from: dateSchema.optional().catch(undefined),
  date_to: dateSchema.optional().catch(undefined),
}).strict();

export const transactionIdSchema = z.coerce
  .number({
    message: "ID transaksi wajib diisi dan berupa angka",
  })
  .int("ID transaksi harus angka bulat")
  .positive("ID transaksi tidak valid");
