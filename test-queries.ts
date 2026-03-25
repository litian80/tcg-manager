import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// using anon key since createClient() in nextjs uses anon key but passes auth cookie
// Actually, server components use cookie-based client. Let's write a simple Next.js script to test directly using the action.
