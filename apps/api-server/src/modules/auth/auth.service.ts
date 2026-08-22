import { getDb, getPool } from '@genyuga/database';
import bcrypt from 'bcryptjs';
import { generateToken, generateRefreshToken } from '../../security/jwt';
import { kafkaProducer } from '../../core/kafka/producer.service';
import crypto from 'crypto';

export class AuthService {
  /**
   * Email/Password Login
   */
  static async loginLocal(email: string, password: string, tenantSlug: string) {
    const db = getDb();
    
    const user = await db('users').where({ email }).first();
    
    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const refreshToken = generateRefreshToken();
    const pool = getPool();
    
    // Save refresh token in public schema
    await pool('public.refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      tenant_slug: tenantSlug,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return {
      token: generateToken({ 
        userId: user.id, 
        role: user.role, 
        tenantSlug 
      }),
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }

  /**
   * Google Login (Placeholder)
   */
  static async loginGoogle(googleId: string, email: string, tenantSlug: string) {
    const db = getDb();
    
    let user = await db('users').where({ google_id: googleId }).orWhere({ email }).first();

    if (!user) {
      // Logic for auto-registration can be added here
      throw new Error('User not registered');
    }

    // Update google_id if it's missing but email matched
    if (!user.google_id) {
       await db('users').where({ id: user.id }).update({ google_id: googleId });
    }

    return {
      token: generateToken({ userId: user.id, role: user.role, tenantSlug }),
      user
    };
  }

  /**
   * WhatsApp Login (Stub)
   */
  static async loginWhatsApp(whatsappId: string, tenantSlug: string) {
    const db = getDb();
    const user = await db('users').where({ whatsapp_id: whatsappId }).first();

    if (!user) {
      throw new Error('WhatsApp identity not linked');
    }

    return {
      token: generateToken({ userId: user.id, role: user.role, tenantSlug }),
      user
    };
  }

  /**
   * Refresh Access Token
   */
  static async refreshAccessToken(refreshToken: string) {
    const pool = getPool();
    const rt = await pool('public.refresh_tokens').where({ token: refreshToken }).first();

    if (!rt || new Date() > new Date(rt.expires_at)) {
      throw new Error('Invalid or expired refresh token');
    }

    // Fetch user from the appropriate schema
    const user = await pool('users')
      .withSchema(rt.tenant_slug)
      .where({ id: rt.user_id })
      .first();

    if (!user) {
      throw new Error('User no longer exists');
    }

    return {
      token: generateToken({ 
        userId: user.id, 
        role: user.role, 
        tenantSlug: rt.tenant_slug 
      })
    };
  }

  /**
   * Change Password
   */
  static async changePassword(userId: string, currentPass: string, newPass: string) {
    const db = getDb();
    const user = await db('users').where({ id: userId }).first();

    if (!user || !user.password_hash) {
      throw new Error('User not found');
    }

    const isValid = await bcrypt.compare(currentPass, user.password_hash);
    if (!isValid) {
      throw new Error('Incorrect current password');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await db('users').where({ id: userId }).update({ 
      password_hash: newHash,
      updated_at: new Date()
    });

    return { success: true };
  }

  /**
   * Forgot Password
   */
  static async forgotPassword(email: string, tenantSlug: string) {
    const db = getDb();
    const user = await db('users').where({ email }).first();

    if (!user) {
      // Return success anyway for security (prevent email enumeration)
      return { success: true };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const pool = getPool();
    
    await pool('public.password_reset_tokens').insert({
      user_id: user.id,
      token,
      tenant_slug: tenantSlug,
      expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour
    });

    // Emit Kafka event for notification
    await kafkaProducer.sendEvent('SEND_NOTIFICATION', {
      type: 'PASSWORD_RESET',
      userId: user.id,
      tenantSlug,
      data: {
        resetToken: token,
        studentName: user.name,
        email: user.email
      }
    });

    return { success: true };
  }

  /**
   * Reset Password
   */
  static async resetPassword(token: string, newPass: string) {
    const pool = getPool();
    const rt = await pool('public.password_reset_tokens').where({ token }).first();

    if (!rt || new Date() > new Date(rt.expires_at)) {
      throw new Error('Invalid or expired reset token');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    
    await pool('users')
      .withSchema(rt.tenant_slug)
      .where({ id: rt.user_id })
      .update({ 
        password_hash: newHash,
        updated_at: new Date()
      });

    // Delete used token
    await pool('public.password_reset_tokens').where({ id: rt.id }).delete();

    return { success: true };
  }
}
