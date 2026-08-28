import { existsSync } from 'node:fs'

import bcrypt from 'bcryptjs'
import postgres from 'postgres'
import { z } from 'zod'

if (existsSync('.env.local')) {
  process.loadEnvFile('.env.local')
}

const seedEnvironmentSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
      'DATABASE_URL doit utiliser le protocole PostgreSQL',
    ),
  INITIAL_FAMILY_NAME: z.string().trim().min(1).max(120).default('Famille Martin'),
  INITIAL_ADMIN_EMAIL: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  INITIAL_ADMIN_USERNAME: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Utilise uniquement lettres, chiffres, point, tiret et underscore'),
  INITIAL_ADMIN_PASSWORD: z.string().min(12).max(128),
})

const seedEnvironment = seedEnvironmentSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  INITIAL_FAMILY_NAME: process.env.INITIAL_FAMILY_NAME,
  INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL,
  INITIAL_ADMIN_USERNAME: process.env.INITIAL_ADMIN_USERNAME,
  INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD,
})

const sql = postgres(seedEnvironment.DATABASE_URL, { max: 1 })

const seedAdmin = async () => {
  const passwordHash = await bcrypt.hash(seedEnvironment.INITIAL_ADMIN_PASSWORD, 12)

  return sql.begin(async (transaction) => {
    const existingFamilies = await transaction`
      select id, name
      from families
      order by created_at asc
      limit 1
      for update
    `

    const family = existingFamilies[0] ?? (await transaction`
      insert into families (name)
      values (${seedEnvironment.INITIAL_FAMILY_NAME})
      returning id, name
    `)[0]

    await transaction`
      insert into settings (family_id)
      values (${family.id})
      on conflict (family_id) do nothing
    `

    const existingAdmins = await transaction`
      select id, username, email
      from users
      where family_id = ${family.id}
        and role = 'admin'
      limit 1
    `

    if (existingAdmins.length > 0) {
      return {
        status: 'exists',
        familyName: family.name,
        username: existingAdmins[0].username,
        email: existingAdmins[0].email,
      }
    }

    const conflictingUsers = await transaction`
      select id
      from users
      where family_id = ${family.id}
        and (
          lower(email) = lower(${seedEnvironment.INITIAL_ADMIN_EMAIL})
          or lower(username) = lower(${seedEnvironment.INITIAL_ADMIN_USERNAME})
        )
      limit 1
    `

    if (conflictingUsers.length > 0) {
      throw new Error('Un compte non administrateur utilise déjà cet email ou cet identifiant')
    }

    const createdAdmins = await transaction`
      insert into users (
        family_id,
        username,
        email,
        password_hash,
        display_name,
        role,
        is_active,
        must_change_password
      )
      values (
        ${family.id},
        ${seedEnvironment.INITIAL_ADMIN_USERNAME},
        ${seedEnvironment.INITIAL_ADMIN_EMAIL},
        ${passwordHash},
        ${seedEnvironment.INITIAL_ADMIN_USERNAME},
        'admin',
        true,
        true
      )
      returning username, email
    `

    return {
      status: 'created',
      familyName: family.name,
      username: createdAdmins[0].username,
      email: createdAdmins[0].email,
    }
  })
}

try {
  const result = await seedAdmin()

  if (result.status === 'exists') {
    console.log(`Administrateur déjà présent pour ${result.familyName} : ${result.username} (${result.email})`)
  } else {
    console.log(`Administrateur créé pour ${result.familyName} : ${result.username} (${result.email})`)
    console.log('Le changement de mot de passe sera obligatoire à la première connexion.')
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Échec de l’amorçage administrateur')
  process.exitCode = 1
} finally {
  await sql.end()
}
