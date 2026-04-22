import { supabase } from '@/lib/customSupabaseClient.js';

export async function listUsers(clinicId) {
    // This is a placeholder as there is no direct way to list all auth.users
    // without admin privileges on the auth schema.
    // A common pattern is to have a public `profiles` table that mirrors users.
    // For now, we will fetch users from user_clinics which is what we need.
    const { data, error } = await supabase
        .rpc('list_clinic_members', { p_clinic: clinicId });

    if (error) throw error;
    
    const userIds = data.map(m => m.user_id);

    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email')
        .in('id', userIds);
    
    if (usersError) {
        console.warn("Could not fetch user emails, returning IDs instead. Error: ", usersError.message);
        return data.map(d => ({ id: d.user_id, email: `user_id: ${d.user_id.substring(0,8)}...` }));
    }

    return usersData;
}

export async function getUserNameById(userId) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.warn(`Could not fetch user name for ${userId}:`, error.message);
            return userId.substring(0, 8) + '...';
        }
        
        return data.full_name || data.email || userId.substring(0, 8) + '...';
    } catch (err) {
        console.warn(`Error fetching user name for ${userId}:`, err);
        return userId.substring(0, 8) + '...';
    }
}