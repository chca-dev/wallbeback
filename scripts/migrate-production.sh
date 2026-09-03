#!/usr/bin/env bash

set -Eeuo pipefail

expected_host='postgresql-chca.alwaysdata.net'
expected_user='chca_wallbeback'
expected_database='chca_wallbeback'
project_directory="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

cleanup() {
  unset DATABASE_URL DATABASE_URL_INPUT database_url_input database_url_normalized
}

trap cleanup EXIT HUP INT TERM

for required_command in node npm; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    printf 'Commande requise introuvable : %s\n' "$required_command" >&2
    exit 1
  fi
done

cd "$project_directory"

printf '%s\n' 'Migration PostgreSQL de production Wall Be Back'
printf '%s\n' 'Exemple : postgresql://utilisateur:mot-de-passe@serveur:5432/base'
IFS= read -r -s -p 'Colle la DATABASE_URL de production : ' database_url_input
printf '\n'

if [[ -z "$database_url_input" ]]; then
  printf '%s\n' 'Migration annulée : aucune URL fournie.' >&2
  exit 1
fi

if ! database_url_normalized="$(
  DATABASE_URL_INPUT="$database_url_input" node --input-type=module <<'NODE'
const rawUrl = process.env.DATABASE_URL_INPUT ?? ''
const url = new URL(rawUrl)

if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
  throw new Error('La DATABASE_URL doit utiliser le protocole PostgreSQL')
}

process.stdout.write(url.toString())
NODE
)"; then
  printf '%s\n' 'Migration annulée : la DATABASE_URL est invalide.' >&2
  exit 1
fi

unset database_url_input
export DATABASE_URL="$database_url_normalized"

connection_details="$(
  node --input-type=module <<'NODE'
const url = new URL(process.env.DATABASE_URL ?? '')

process.stdout.write([
  url.hostname,
  decodeURIComponent(url.username),
  decodeURIComponent(url.pathname.slice(1)),
].join('\n'))
NODE
)"

mapfile -t connection_values <<< "$connection_details"
connection_host="${connection_values[0]:-}"
connection_user="${connection_values[1]:-}"
connection_database="${connection_values[2]:-}"

printf 'Hôte détecté : %s\n' "$connection_host"
printf 'Utilisateur détecté : %s\n' "$connection_user"
printf 'Base déclarée : %s\n' "$connection_database"

if [[ "$connection_host" != "$expected_host" \
  || "$connection_user" != "$expected_user" \
  || "$connection_database" != "$expected_database" ]]; then
  printf '%s\n' 'Migration annulée : la connexion ne correspond pas à Wall Be Back.' >&2
  exit 1
fi

target_database="$(
  node --input-type=module <<'NODE'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL, { max: 1 })

try {
  const [result] = await sql`select current_database() as name`
  process.stdout.write(result.name)
} finally {
  await sql.end()
}
NODE
)"

if [[ "$target_database" != "$expected_database" ]]; then
  printf "Migration annulée : PostgreSQL a ouvert la base '%s'.\n" "$target_database" >&2
  exit 1
fi

printf 'Base PostgreSQL vérifiée : %s\n' "$target_database"
printf '%s\n' 'Exemple de confirmation : MIGRER'
IFS= read -r -p 'Tape MIGRER pour appliquer les migrations : ' confirmation

if [[ "$confirmation" != 'MIGRER' ]]; then
  printf '%s\n' 'Migration annulée : confirmation incorrecte.'
  exit 0
fi

npm run db:migrate
printf '%s\n' 'Migration de production terminée avec succès.'
