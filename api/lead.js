// Vercel Serverless Function: POST /api/lead
// 1. Sends an instant Telegram notification to Henry's phone when a tradie requests a free preview
// 2. Appends the inbound lead straight into Henry's locked Supabase CRM vault
const SUPA_URL = process.env.SUPABASE_URL || 'https://ivjimprvfzlcbjhjtsaw.supabase.co';
const SUPA_KEY = process.env.SUPABASE_KEY || 'sb_publishable_4xfNWpw3GOT-ONgYS9tt6w_WEkY5eht';
const VAULT_ID = process.env.CRM_VAULT_ID || 'mf_vault_33cf3d21d9181f57536f1a4a';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9202795103:AAFa5pr_SCfv1RPKFZZSlFuHiDAEPJw4kcM';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '7433939595';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const business = String(body.business || '').trim().slice(0, 120);
    const first = String(body.first || '').trim().slice(0, 60);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const trade = String(body.trade || 'tradie').trim().slice(0, 80);
    const social = String(body.social || '').trim().slice(0, 250);
    const notes = String(body.notes || '').trim().slice(0, 600);

    if (!business && !phone) {
      return res.status(400).json({ ok: false, error: 'Please enter your business name or phone number.' });
    }

    // 1. Send instant Telegram notification to Henry
    const tgText =
      `🔥 NEW INBOUND TRADIE LEAD (Exciting Websites)\n` +
      `Business: ${business || 'N/A'}\n` +
      `Name: ${first || 'N/A'}\n` +
      `Phone: ${phone || 'N/A'}\n` +
      `Trade: ${trade}\n` +
      `Page/Link: ${social || 'None provided'}\n` +
      (notes ? `Notes: ${notes}` : '');

    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: tgText }),
    }).catch(() => {});

    // 2. Append lead directly into Supabase CRM vault
    const getRes = await fetch(`${SUPA_URL}/rest/v1/crm_state?id=eq.${VAULT_ID}&select=payload`, {
      headers: { apikey: SUPA_KEY },
    });
    if (getRes.ok) {
      const rows = await getRes.json();
      const list = Array.isArray(rows?.[0]?.payload) ? rows[0].payload : [];
      const newProfile = {
        id: Date.now(),
        name: business || `${first || 'New Tradie'} (${trade})`,
        first,
        phone,
        email: '',
        trade,
        detail: notes || `${trade} website preview request`,
        source: 'Inbound Website Form',
        fbUrl: social.includes('facebook') ? social : '',
        igUrl: social.includes('instagram') || social.startsWith('@') ? social : '',
        mapsUrl: social && !social.includes('facebook') && !social.includes('instagram') ? social : '',
        siteUrl: '',
        status: 'REPLIED',
        billingStatus: 'NONE',
        notes: `Inbound request from Exciting Websites landing page. ${social ? 'Link: ' + social : ''} ${notes}`.trim(),
        replies: [
          {
            at: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
            incoming: `Requested free website build via Exciting Websites form (${social || 'no link'})`,
            replySent: '',
          },
        ],
      };
      list.unshift(newProfile);

      await fetch(`${SUPA_URL}/rest/v1/crm_state`, {
        method: 'POST',
        headers: {
          apikey: SUPA_KEY,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ id: VAULT_ID, payload: list, updated_at: new Date().toISOString() }),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err.message || err) });
  }
}
