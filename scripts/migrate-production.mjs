import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { loadEnvFile } from 'node:process'
import { createInterface } from 'node:readline/promises'

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const expectedTarget = {
  host: 'postgresql-chca.alwaysdata.net',
  user: 'chca_wallbeback',
  database: 'chca_wallbeback',
}

const printErrorChain = (error) => {
  let currentError = error

  while (currentError instanceof Error) {
    console.error(currentError)
    currentError = currentError.cause
  }
}

const createPrompts = () => {
  const prompts = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  })

  return {
    text: (message) => prompts.question(message),
    close: () => prompts.close(),
  }
}

const getProductionDatabaseUrl = () => {
  loadEnvFile('.env.local')

  const databaseUrl = process.env.PRODUCTION_DATABASE_URL?.trim()
  if (!databaseUrl) {
    throw new Error('PRODUCTION_DATABASE_URL est absente de .env.local')
  }

  return databaseUrl
}

const getLatestRepositoryMigration = async () => {
  const journalContents = await readFile('./src/db/migrations/meta/_journal.json', 'utf8')
  const journal = JSON.parse(journalContents)
  const latestEntry = journal.entries.at(-1)
  if (!latestEntry) throw new Error('Le dépôt ne contient aucune migration Drizzle')

  const migrationContents = await readFile(
    `./src/db/migrations/${latestEntry.tag}.sql`,
    'utf8',
  )

  return {
    tag: latestEntry.tag,
    timestamp: latestEntry.when,
    hash: createHash('sha256').update(migrationContents).digest('hex'),
  }
}

const runProductionMigration = async () => {
  const prompts = createPrompts()
  let client

  try {
    const databaseUrl = getProductionDatabaseUrl()
    const url = new URL(databaseUrl)
    const target = {
      host: url.hostname,
      user: decodeURIComponent(url.username),
      database: decodeURIComponent(url.pathname.slice(1)),
    }

    console.log('Connexion chargée depuis PRODUCTION_DATABASE_URL dans .env.local.')
    console.log('Cible détectée :', target)
    if (
      target.host !== expectedTarget.host
      || target.user !== expectedTarget.user
      || target.database !== expectedTarget.database
    ) {
      throw new Error('Migration refusée : cette connexion ne correspond pas à Wall Be Back')
    }

    const confirmation = await prompts.text('Tape MIGRER pour continuer : ')
    if (confirmation !== 'MIGRER') {
      console.log('Migration annulée.')
      return
    }

    client = postgres(databaseUrl, { max: 1 })
    const [connection] = await client`select current_database() as database`
    if (connection.database !== expectedTarget.database) {
      throw new Error(`Migration refusée : PostgreSQL a ouvert ${connection.database}`)
    }

    const latestRepositoryMigration = await getLatestRepositoryMigration()
    await migrate(drizzle(client), { migrationsFolder: './src/db/migrations' })

    const [latestDatabaseMigration] = await client`
      select hash, created_at
      from drizzle.__drizzle_migrations
      order by created_at desc
      limit 1
    `
    if (
      latestDatabaseMigration?.hash !== latestRepositoryMigration.hash
      || Number(latestDatabaseMigration?.created_at) !== latestRepositoryMigration.timestamp
    ) {
      throw new Error(
        `Historique incomplet : ${latestRepositoryMigration.tag} n’est pas enregistrée en production`,
      )
    }

    console.log(`Migration vérifiée : ${latestRepositoryMigration.tag}`)
    console.log('Migration de production terminée avec succès.')
  } finally {
    prompts.close()
    if (client) await client.end()
  }
}

runProductionMigration().catch((error) => {
  printErrorChain(error)
  process.exitCode = 1
})
