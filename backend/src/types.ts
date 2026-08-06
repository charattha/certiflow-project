export interface AppBindings {
  DATABASE_URL: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  NODE_ENV: string;
}

export interface AppUser {
  userId: string;
  role: string;
  employeeId?: string;
  empId?: string;
  name: string;
  mustChangePassword: boolean;
}

export interface AppEnv {
  Bindings: AppBindings;
  Variables: {
    user: AppUser;
  };
}
