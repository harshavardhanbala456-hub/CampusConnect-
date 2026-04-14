const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qekmytpwnajcspeyzqiv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla215dHB3bmFqY3NwZXl6cWl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjE2ODc5OCwiZXhwIjoyMDkxNzQ0Nzk4fQ.XD4b7zkRIdh5pRq4l7HzZYUt6n0lOtM08YA_25jxzWU';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success, found records:', data);
  }
}
test();
