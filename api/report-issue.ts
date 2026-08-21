export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      id,
      ticketId = id || `ISSUE-${Math.floor(1000 + Math.random() * 9000)}`,
      category = 'file_error',
      subject = 'Issue Report',
      description = '',
      userName = 'Anonymous',
      userEmail = '',
      fileType = 'N/A',
      fileSizeApprox = 'N/A',
      severity = 'medium',
      browserInfo = 'Not provided',
      createdAt = Date.now(),
    } = req.body || {};

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Construct rich message for Telegram
    const formattedMessage = 
`🚨 *NEW COMPRESSOR ISSUE REPORT*

🎫 *Ticket ID:* \`${ticketId}\`
🏷️ *Category:* ${String(category).replace(/_/g, ' ').toUpperCase()}
⚠️ *Severity:* ${String(severity).toUpperCase()}
👤 *Reported By:* ${userName} ${userEmail ? `(${userEmail})` : ''}
📅 *Date:* ${new Date(createdAt).toLocaleString()}

📌 *Subject:*
${subject}

📝 *Description:*
${description}

📁 *File Info:*
• Type: ${fileType}
• Approximate Size: ${fileSizeApprox}

💻 *System Diagnostic:*
${browserInfo}
`;

    let telegramDelivered = false;
    let telegramError = null;

    if (botToken && chatId) {
      try {
        // Attempt markdown parse first
        let response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: formattedMessage,
            parse_mode: 'Markdown',
          }),
        });

        let data: any = await response.json();

        // Fallback to plain text if markdown formatting failed
        if (!data.ok) {
          response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: formattedMessage.replace(/[*`_]/g, ''),
            }),
          });
          data = await response.json();
        }

        if (data.ok) {
          telegramDelivered = true;
        } else {
          telegramError = data.description || 'Telegram API returned error';
          console.warn('Telegram API response error:', data);
        }
      } catch (tgErr: any) {
        telegramError = tgErr.message || 'Failed to connect to Telegram API';
        console.error('Error posting to Telegram:', tgErr);
      }
    } else {
      telegramError = 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables not set on Vercel deployment';
    }

    return res.status(200).json({
      success: true,
      ticketId,
      telegramDelivered,
      telegramConfigured: Boolean(botToken && chatId),
      telegramError,
      receivedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Server error handling issue report:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to process issue report: ' + (err.message || 'Unknown error'),
    });
  }
}
