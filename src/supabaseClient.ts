import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yrnniiqlytwynkpcimbl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlybm5paXFseXR3eW5rcGNpbWJsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjk0MzUxMywiZXhwIjoyMDc4NTE5NTEzfQ.z5Rz2xY1IwseZbuK6W6ENWzRLdr7L2uzJY-b-yKJAvs'

export const supabase = createClient(supabaseUrl, supabaseKey)