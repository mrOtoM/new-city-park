import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'

// Záloha ide do backups/, ktoré je v .gitignore. Obsahuje osobné údaje
// a nesmie skončiť v repozitári ani v CI artefaktoch.

// Názov projektu sa číta z lokálneho stavu CLI, nie zo vstupu. Ručne zadaný
// štítok by mohol označiť produkčný dump ako vývojový.
function linkedProject() {
  try {
    const linked = JSON.parse(readFileSync('supabase/.temp/linked-project.json', 'utf8'))
    if (linked.name) return { name: linked.name, ref: linked.ref }
  } catch {
    // Nižšie skúsime samotný ref.
  }

  try {
    return { name: null, ref: readFileSync('supabase/.temp/project-ref', 'utf8').trim() }
  } catch {
    return null
  }
}

const project = linkedProject()

if (!project) {
  console.error('Žiadny prepojený projekt. Spusti najprv: npx supabase link --project-ref <ref>')
  process.exit(1)
}

const label = (project.name ?? project.ref).replace(/[^a-zA-Z0-9-]/g, '-')
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
const out = `backups/${label}_${stamp}.sql`

console.log(`Projekt: ${project.name ?? '(neznámy názov)'} [${project.ref}]`)

mkdirSync('backups', { recursive: true })

execFileSync('npx', ['supabase', 'db', 'dump', '--linked', '--data-only', '-f', out], {
  stdio: 'inherit',
  shell: true,
})

console.log(`\nZáloha uložená: ${out}`)
