// Vercel Serverless Function: POST /api/lead
// 1. Sends an instant Telegram notification to Henry's phone when a tradie requests a free preview
// 2. Leads are added to the private Machine Faith Leads page by hand (via Claude); nothing is stored here.
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // set in Vercel project settings, never in code
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

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

    if (!TG_TOKEN || !TG_CHAT) {
      console.error('lead: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
      return res.status(500).json({ ok: false, error: 'Sorry, that did not go through. Please text Henry instead.' });
    }
    const tg = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: tgText }),
    });
    if (!tg.ok) {
      console.error('lead: Telegram send failed', tg.status);
      return res.status(502).json({ ok: false, error: 'Sorry, that did not go through. Please text Henry instead.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead:', err);
    return res.status(500).json({ ok: false, error: 'Sorry, that did not go through. Please text Henry instead.' });
  }
}
