import { isAbsolute, parse, resolve } from 'node:path'

import { z } from 'zod'

const positiveIntegerFromEnvironment = (defaultValue: number) => z.preprocess(
  (value) => value === undefined || value === '' ? defaultValue : value,
  z.coerce.number().int().positive(),
)

const optionalEnvironmentString = z.preprocess(
  (value) => value === '' ? undefined : value,
  z.string().trim().min(1).optional(),
)

const serverEnvironmentSchema = z
  .object({
    DATABASE_URL: z
      .string()
      .url()
      .refine(
        (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
        'DATABASE_URL doit utiliser le protocole PostgreSQL',
      ),
    SESSION_SECRET: z.string().min(32),
    UPLOAD_DIR: z.string().trim().min(1).default('./data/uploads'),
    MAX_UPLOAD_BYTES: positiveIntegerFromEnvironment(20 * 1024 * 1024),
    MAX_IMAGE_PIXELS: positiveIntegerFromEnvironment(25_000_000),
    MAX_STORAGE_BYTES: positiveIntegerFromEnvironment(512 * 1024 * 1024),
    WEB_PUSH_PUBLIC_KEY: optionalEnvironmentString,
    WEB_PUSH_PRIVATE_KEY: optionalEnvironmentString,
    WEB_PUSH_SUBJECT: optionalEnvironmentString,
  })
  .superRefine((environment, context) => {
    const resolvedUploadDirectory = resolve(environment.UPLOAD_DIR)

    if (process.env.NODE_ENV === 'production' && !isAbsolute(environment.UPLOAD_DIR)) {
      context.addIssue({
        code: 'custom',
        path: ['UPLOAD_DIR'],
        message: 'UPLOAD_DIR doit être un chemin absolu en production',
      })
    }

    if (resolvedUploadDirectory === parse(resolvedUploadDirectory).root) {
      context.addIssue({
        code: 'custom',
        path: ['UPLOAD_DIR'],
        message: 'UPLOAD_DIR ne peut pas être la racine d’un disque',
      })
    }

    const pushValues = [
      environment.WEB_PUSH_PUBLIC_KEY,
      environment.WEB_PUSH_PRIVATE_KEY,
      environment.WEB_PUSH_SUBJECT,
    ]
    const configuredPushValues = pushValues.filter(Boolean).length
    if (configuredPushValues > 0 && configuredPushValues < pushValues.length) {
      context.addIssue({
        code: 'custom',
        path: ['WEB_PUSH_PUBLIC_KEY'],
        message: 'Les trois variables WEB_PUSH doivent être configurées ensemble',
      })
    }
  })

export const serverEnvironment = serverEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  UPLOAD_DIR: process.env.UPLOAD_DIR,
  MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
  MAX_IMAGE_PIXELS: process.env.MAX_IMAGE_PIXELS,
  MAX_STORAGE_BYTES: process.env.MAX_STORAGE_BYTES,
  WEB_PUSH_PUBLIC_KEY: process.env.WEB_PUSH_PUBLIC_KEY,
  WEB_PUSH_PRIVATE_KEY: process.env.WEB_PUSH_PRIVATE_KEY,
  WEB_PUSH_SUBJECT: process.env.WEB_PUSH_SUBJECT,
})
