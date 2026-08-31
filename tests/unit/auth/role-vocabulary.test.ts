import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ROLES } from '@/lib/auth/roles'

/**
 * Slovník rolí existuje na dvoch miestach: v `lib/auth/roles.ts` a v CHECK
 * constrainte migrácie `*_three_role_model.sql`. Rozídenie tých dvoch by
 * znamenalo, že databáza pustí rolu, ktorú aplikácia odmietne (alebo naopak).
 * Tento test je poistka, aby sa to nedalo urobiť potichu.
 */

// Migračné súbory majú timestamp prefix, ktorý sa pri premenovaní mení,
// preto sa hľadá podľa stabilnej časti názvu.
const migrationsDir = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url))
const migrationFile = readdirSync(migrationsDir).find((name) => name.endsWith('_three_role_model.sql'))

if (!migrationFile) {
  throw new Error('V supabase/migrations sa nenašla migrácia *_three_role_model.sql')
}

const migration = readFileSync(`${migrationsDir}${migrationFile}`, 'utf8')

function rolesFromCheckConstraint(sql: string): string[] {
  const match = sql.match(/CONSTRAINT users_role_allowed_values\s*\n?\s*CHECK \(role IN \(([^)]*)\)\)/)

  if (!match) {
    throw new Error('V migrácii 002 sa nenašiel CHECK constraint users_role_allowed_values')
  }

  return match[1].split(',').map((value) => value.trim().replace(/^'|'$/g, ''))
}

describe('slovník rolí v databáze', () => {
  it('CHECK constraint obsahuje presne tie isté roly ako ROLES', () => {
    expect(rolesFromCheckConstraint(migration).sort()).toEqual([...ROLES].sort())
  })

  it('registračný invariant vkladá literál user', () => {
    expect(migration).toMatch(/COALESCE\(NEW\.raw_user_meta_data->>'phone_number', NULL\),\s*(--[^\n]*\n\s*)*'user'/)
  })

  it('migrácia neodvodzuje rolu z metadát klienta', () => {
    expect(migration).not.toMatch(/raw_user_meta_data->>'[^']*role[^']*'/i)
    expect(migration).not.toMatch(/raw_app_meta_data/i)
  })

  it('SECURITY DEFINER funkcie majú nastavený search_path', () => {
    // Bez odstránenia komentárov by test počítal aj zmienky v poznámkach.
    const code = migration.replace(/--[^\n]*/g, '')
    const definerCount = code.match(/SECURITY DEFINER/g)?.length ?? 0
    const searchPathCount = code.match(/SET search_path = public, pg_temp/g)?.length ?? 0

    expect(definerCount).toBeGreaterThan(0)
    expect(searchPathCount).toBe(definerCount)
  })

  it('neexistuje aplikačná cesta, ktorá by rolu priraďovala', () => {
    expect(migration).not.toMatch(/GRANT[^;]*\brole\b[^;]*TO (authenticated|anon)/i)
  })
})
