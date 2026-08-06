export type AppEnv = {
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    JWT_SECRET: string;
    FRONTEND_URL: string;
    NODE_ENV: string;
  };
  Variables: {
    user: {
      userId: string;
      employeeId: string | null;
      role: string;
    };
  };
};
