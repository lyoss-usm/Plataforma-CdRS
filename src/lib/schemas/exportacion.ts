import { z } from 'zod';

export const exportDatasetSchema = z.enum(['prestamos', 'solicitudes', 'inventario', 'nomina']);
export type ExportDataset = z.infer<typeof exportDatasetSchema>;