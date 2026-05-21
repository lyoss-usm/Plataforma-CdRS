import { z } from 'zod';

export const integerIdSchema = z.number().int().positive();
export const positiveIntegerSchema = z.number().int().positive();
export const nonNegativeIntegerSchema = z.number().int().nonnegative();
export const uuidSchema = z.string().uuid();
export const nonEmptyTextSchema = z.string().trim().min(1);
export const nullableTextSchema = z.string().trim().min(1).nullable();
export const nullableUrlSchema = z.string().trim().url().nullable();
export const timestampSchema = z.iso.datetime({ local: true, offset: true });
export const dateSchema = z.iso.date();

export const rutSchema = positiveIntegerSchema;
export const rolSchema = positiveIntegerSchema;
export const telefonoSchema = positiveIntegerSchema;
