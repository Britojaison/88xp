import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is from an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin - use email for reliable lookup
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('is_admin, email')
      .ilike('email', user.email || '')
      .single()

    if (empError || !employee?.is_admin) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Parse request body
    const { employeeId } = await req.json()

    if (!employeeId) {
      throw new Error('Missing employeeId')
    }

    // Delete employee record first
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .delete()
      .eq('id', employeeId)

    if (employeeError) {
      throw new Error(`Failed to delete employee record: ${employeeError.message}`)
    }

    // Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(employeeId)

    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
