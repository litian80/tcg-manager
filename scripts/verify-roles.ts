
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRoleManagement() {
    console.log("=== Role Management Verification ===\n");

    // 1. Test Search
    console.log("Testing Search...");
    const { data: searchResults, error: searchError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .or('email.ilike.%@gmail.com%,first_name.ilike.%Xiaolei%')
        .limit(5);

    if (searchError) {
        console.error("❌ Search failed:", searchError);
    } else {
        console.log("✅ Search successful. Found:", searchResults.length, "users");
    }

    // 2. Test Role Update
    if (searchResults && searchResults.length > 0) {
        const testUser = searchResults[0];
        const originalRole = testUser.role;
        const newRole = originalRole === 'admin' ? 'organizer' : 'admin';

        console.log(`Testing Role Update for user ${testUser.email}: ${originalRole} -> ${newRole}...`);
        
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', testUser.id);

        if (updateError) {
            console.error("❌ Update failed:", updateError);
        } else {
            // Verify update
            const { data: updatedProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', testUser.id)
                .single();

            if (updatedProfile?.role === newRole) {
                console.log("✅ Role updated and verified in DB.");
                
                // Revert to original
                await supabase.from('profiles').update({ role: originalRole }).eq('id', testUser.id);
                console.log("✅ Role reverted to original.");
            } else {
                console.error("❌ Role verification failed in DB.");
            }
        }
    } else {
        console.log("⚠️ No users found to test role update.");
    }
}

verifyRoleManagement();
