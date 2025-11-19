import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ApiResponse } from '../types.js';
import { db } from '../auth-logic.js';

export default async function setupAuthPasswordRoutes(fastify: FastifyInstance): Promise<void> {
  // Forgot password endpoint
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email } = request.body as { email: string };

    console.log('Forgot password request received for email:', email);

    if (!email) {
      return reply.status(400).send({
        success: false,
        error: 'Email is required'
      } as ApiResponse);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({
        success: false,
        error: 'Invalid email format'
      } as ApiResponse);
    }

    return new Promise<void>((resolve, reject) => {
      // First check if user exists
      db.get(
        'SELECT id, email FROM users WHERE email = ?',
        [email],
        async (err: Error | null, user: any) => {
          if (err) {
            console.error('Database error during forgot password:', err);
            reply.status(500).send({
              success: false,
              error: 'Database error'
            } as ApiResponse);
            reject(err);
            return;
          }

          if (!user) {
            // Return success even if user doesn't exist for security
            console.log('Password reset requested for non-existent email:', email);
            reply.send({
              success: true,
              message: 'If an account with that email exists, a password reset link has been sent.'
            } as ApiResponse);
            resolve();
            return;
          }

          // Generate a reset token
          const resetToken = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

          console.log('Generated reset token for user:', user.id, 'Token:', resetToken);

          // Create password_reset_tokens table if it doesn't exist
          db.run(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              token TEXT NOT NULL UNIQUE,
              expires_at DATETIME NOT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              used BOOLEAN DEFAULT FALSE,
              FOREIGN KEY (user_id) REFERENCES users (id)
            )
          `, (createErr: Error | null) => {
            if (createErr) {
              console.error('Error creating password_reset_tokens table:', createErr);
              reply.status(500).send({
                success: false,
                error: 'Database error'
              } as ApiResponse);
              reject(createErr);
              return;
            }

            // Insert the reset token
            db.run(
              'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
              [user.id, resetToken, expiresAt.toISOString()],
              function(insertErr: Error | null) {
                if (insertErr) {
                  console.error('Error storing reset token:', insertErr);
                  reply.status(500).send({
                    success: false,
                    error: 'Database error'
                  } as ApiResponse);
                  reject(insertErr);
                  return;
                }

                console.log('Reset token stored successfully for user:', user.id);

                // In a real app, you would send an email here
                // For development, we'll just log the reset link
                const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
                console.log('\n=== PASSWORD RESET EMAIL (Development) ===');
                console.log(`To: ${email}`);
                console.log(`Reset Link: ${resetLink}`);
                console.log('==========================================\n');

                reply.send({
                  success: true,
                  message: 'If an account with that email exists, a password reset link has been sent.',
                  // In development, include the token for testing
                  ...(process.env.NODE_ENV === 'development' && { resetToken, resetLink })
                } as ApiResponse);
                resolve();
              }
            );
          });
        }
      );
    });
  });

  // Reset password endpoint
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const { token, newPassword } = request.body as { token: string; newPassword: string };

    console.log('Password reset request received with token:', token);

    if (!token || !newPassword) {
      return reply.status(400).send({
        success: false,
        error: 'Token and new password are required'
      } as ApiResponse);
    }

    if (newPassword.length < 6) {
      return reply.status(400).send({
        success: false,
        error: 'Password must be at least 6 characters'
      } as ApiResponse);
    }

    return new Promise<void>((resolve, reject) => {
      // Find the reset token
      db.get(
        `SELECT prt.*, u.email, u.username
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token = ? AND prt.used = FALSE`,
        [token],
        async (err: Error | null, resetRecord: any) => {
          if (err) {
            console.error('Database error during password reset:', err);
            reply.status(500).send({
              success: false,
              error: 'Database error'
            } as ApiResponse);
            reject(err);
            return;
          }

          if (!resetRecord) {
            console.log('Invalid or already used reset token:', token);
            reply.status(400).send({
              success: false,
              error: 'Invalid or expired reset token'
            } as ApiResponse);
            resolve();
            return;
          }

          // Check if token has expired
          const expiresAt = new Date(resetRecord.expires_at);
          if (expiresAt < new Date()) {
            console.log('Reset token has expired:', token);
            reply.status(400).send({
              success: false,
              error: 'Reset token has expired'
            } as ApiResponse);
            resolve();
            return;
          }

          // Hash the new password
          const hashedPassword = await bcrypt.hash(newPassword, 10);

          // Update the user's password
          db.run(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, resetRecord.user_id],
            function(updateErr: Error | null) {
              if (updateErr) {
                console.error('Error updating password:', updateErr);
                reply.status(500).send({
                  success: false,
                  error: 'Failed to update password'
                } as ApiResponse);
                reject(updateErr);
                return;
              }

              // Mark token as used
              db.run(
                'UPDATE password_reset_tokens SET used = TRUE WHERE token = ?',
                [token],
                (markErr: Error | null) => {
                  if (markErr) {
                    console.error('Error marking token as used:', markErr);
                    // Don't fail the request since password was already updated
                  }

                  console.log('Password successfully reset for user:', resetRecord.user_id);

                  reply.send({
                    success: true,
                    message: 'Password has been reset successfully',
                    data: {
                      username: resetRecord.username,
                      email: resetRecord.email
                    }
                  } as ApiResponse);
                  resolve();
                }
              );
            }
          );
        }
      );
    });
  });
}