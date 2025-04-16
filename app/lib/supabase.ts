import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to get the current user ID
export const getUserId = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user?.id || null;
};

// Helper function to create a Supabase client with an explicit auth token
export const createAuthClient = (authToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
};
