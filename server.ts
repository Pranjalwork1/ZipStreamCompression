import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Telegram Issue Dispatch API
  app.post('/api/report-issue', async (req, res) => {
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
🏷️ *Category:* ${category.replace(/_/g, ' ').toUpperCase()}
⚠️ *Severity:* ${severity.toUpperCase()}
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

          let data = await response.json();

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
        error: 'Failed to process issue report',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Compressor server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
