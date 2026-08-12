import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL 또는 VITE_SUPABASE_PUBLISHABLE_KEY가 .env에 없습니다.',
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabasePublishableKey ?? '')
