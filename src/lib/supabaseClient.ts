import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sdpxswejjkychtjblkud.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_LRcvKHwFoCIIYX0JYsHLlQ_1TL8JzbH'

export const supabase = createClient(supabaseUrl, supabaseKey)
