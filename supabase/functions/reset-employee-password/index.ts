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
    const { data: adminEmployee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('is_admin')
      .ilike('email', user.email || '')
      .single()

    if (empError || !adminEmployee?.is_admin) {
      throw new Error('Unauthorized: Admin access required')
    }

    // Parse request body
    const { employeeId, newPassword } = await req.json()

    if (!employeeId || !newPassword) {
      throw new Error('Missing required fields: employeeId, newPassword')
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }

    // Get the employee to find their auth user ID
    const { data: targetEmployee, error: targetError } = await supabaseAdmin
      .from('employees')
      .select('id, email, is_admin')
      .eq('id', employeeId)
      .single()

    if (targetError || !targetEmployee) {
      throw new Error('Employee not found')
    }

    // Prevent resetting admin passwords through this endpoint
    if (targetEmployee.is_admin) {
      throw new Error('Cannot reset admin passwords through this endpoint')
    }

    // Reset the password using Supabase Admin API
    const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(
      employeeId,
      { password: newPassword }
    )

    if (resetError) {
      throw new Error(`Failed to reset password: ${resetError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Password reset successfully'
      }),
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
