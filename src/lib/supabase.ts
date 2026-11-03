import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Cliente único da aplicação.
//
// `Database` vem de database.types.ts, gerado a partir do schema real pelo
// `npm run db:types`. É isso que faz o TypeScript recusar `status: 'concluída'`
// (com acento) ou um nome de coluna que não existe — erro de compilação em vez
// de erro em produção.
//
// IMPORTANTE: rode `npm run db:types` sempre que criar uma migration. Sem
// isso os tipos ficam descrevendo um banco que não existe mais, e o
// TypeScript passa a mentir com confiança.

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Falha alto e cedo. Sem isto o app sobe e só quebra na primeira consulta,
  // com "Failed to fetch" — que não diz a ninguém que o problema é o .env.
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas.\n' +
      'Copie o template e preencha:  cp .env.example .env\n' +
      'Para o ambiente local, rode `npm run db:start` e use os valores que ele imprime.\n' +
      'Veja docs/setup-ambiente.md.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Atalhos de tipo para o resto do app não precisar navegar a árvore gerada.
export type Tabelas = Database['public']['Tables']
export type Linha<T extends keyof Tabelas> = Tabelas[T]['Row']
export type Insercao<T extends keyof Tabelas> = Tabelas[T]['Insert']
export type Atualizacao<T extends keyof Tabelas> = Tabelas[T]['Update']
export type Enums = Database['public']['Enums']
