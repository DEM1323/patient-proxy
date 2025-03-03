export interface UserSession {
  user: {
    id: string;
    email?: string;
    user_metadata: {
      avatar_url?: string;
      full_name?: string;
      email?: string;
    };
  } | null;
}
