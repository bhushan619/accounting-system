import { z } from 'zod';
export const invoiceLineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
});
export const createInvoiceSchema = z.object({
  client: z.string().min(1),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.enum(['LKR','AED']).default('LKR'),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  lines: z.array(invoiceLineSchema).min(1),
  notes: z.string().optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
