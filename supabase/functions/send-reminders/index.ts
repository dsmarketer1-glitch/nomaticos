import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!;

webpush.setVapidDetails(
  'mailto:ds.marketer1@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 1. Get Pending Tasks for today
  const { data: tasks } = await supabase
    .from('tasks')
    .select('title, client_name')
    .eq('date', todayStr)
    .neq('status', 'Done');

  // 2. Get Payment Reminders
  const { data: payments } = await supabase
    .from('client_payments')
    .select('*')
    .eq('reminder_date', todayStr)
    .eq('payment_received', false);

  if ((!tasks || tasks.length === 0) && (!payments || payments.length === 0)) {
    return new Response(JSON.stringify({ message: 'No reminders today' }), { status: 200 });
  }

  // Build the message
  let body = '';
  if (tasks && tasks.length > 0) {
    body += '📋 Today\'s Tasks:\n';
    tasks.forEach(t => body += `- ${t.title} (${t.client_name})\n`);
  }

  if (payments && payments.length > 0) {
    body += '\n💰 Payment Reminders:\n';
    payments.forEach(p => {
      if (p.invoice_sent) {
        body += `- Confirm payment: ${p.client_name} (${p.amount})\n`;
      } else {
        body += `- Next due soon: ${p.client_name} (Due in 3 days)\n`;
      }
    });

    // 3. Update recurring reminder dates (Every 3 days if invoice sent but not paid)
    for (const p of payments) {
      if (p.invoice_sent && !p.payment_received) {
        const nextReminder = new Date(today);
        nextReminder.setDate(nextReminder.getDate() + 3);
        const nextReminderStr = nextReminder.toISOString().split('T')[0];
        
        await supabase
          .from('client_payments')
          .update({ reminder_date: nextReminderStr })
          .eq('id', p.id);
      }
    }
  }

  // 4. Get Subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('subscription');
  if (!subs || subs.length === 0) return new Response('No subscribers', { status: 200 });

  const notifications = subs.map(s => 
    webpush.sendNotification(s.subscription, JSON.stringify({
      title: 'Nomatic OS Reminder',
      body: body || 'You have pending activities today.',
      url: '/payments'
    }))
  );

  await Promise.allSettled(notifications);
  return new Response(JSON.stringify({ sent: notifications.length, body }), { status: 200 });
});
