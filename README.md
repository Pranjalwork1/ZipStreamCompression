<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/0282376f-3129-4c78-a480-66df23f7bad7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy on Railway

Create a Railway project from this GitHub repository and deploy the repository root. Railway will use `railway.json` automatically.

Required variables:

- `NODE_ENV=production`
- `ENABLE_TUNNEL=false`
- `DISABLE_HMR=true`

Optional variables:

- `GEMINI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

For the most reliable P2P connections across restrictive mobile networks, optionally configure a TURN provider with `TURN_SERVER_URL`, `TURN_USERNAME`, and `TURN_CREDENTIAL`. STUN-only connections remain supported when these are blank.

Railway provides `PORT` automatically. Do not set it manually. The health check endpoint is `/api/health`.
