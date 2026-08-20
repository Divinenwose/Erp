import { supabase } from '@/lib/supabase';

interface NotificationData {
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  module?: string;
  reference_id?: string;
  action_url?: string;
}

/**
 * Send an in-app notification to a user. Non-blocking — failures are
 * logged but never thrown, matching lib/audit.ts's convention, since a
 * failed notification should never block the action that triggered it.
 */
export async function sendNotification(
  companyId: string,
  userId: string,
  data: NotificationData
) {
  try {
    await supabase.from('notifications').insert({
      company_id: companyId,
      user_id: userId,
      title: data.title,
      message: data.message,
      type: data.type ?? 'info',
      module: data.module,
      reference_id: data.reference_id,
      action_url: data.action_url,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
