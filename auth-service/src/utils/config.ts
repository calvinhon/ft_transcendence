// auth-service/src/utils/config.ts
export const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production'
  }
};