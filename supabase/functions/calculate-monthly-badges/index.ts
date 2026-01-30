import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    // Verify the request is from Supabase Cron (check authorization header)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting monthly badge calculation...');

    // Call the database function to calculate and store badges
    const { data, error } = await supabase.rpc('calculate_and_store_badges');

    if (error) {
      console.error('Error calculating badges:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    const badgesEarned = data || [];
    const totalNewBadges = badgesEarned.reduce(
      (sum: number, emp: any) => sum + (emp.badges_earned?.length || 0), 
      0
    );

    console.log(`Badge calculation complete. ${totalNewBadges} new badges earned by ${badgesEarned.length} employees.`);

    // Optional: Send notifications to employees who earned badges
    // You could integrate with email service, push notifications, etc.
    for (const emp of badgesEarned) {
      console.log(`${emp.employee_name} earned: ${emp.badges_earned.join(', ')}`);
      // TODO: Send notification to employee
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Badge calculation complete`,
        employees_with_new_badges: badgesEarned.length,
        total_new_badges: totalNewBadges,
        details: badgesEarned
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
});
