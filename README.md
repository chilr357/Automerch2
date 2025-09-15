<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app
## Overview

Automerch2 lets you generate designs (OpenAI), create Printify products in your Etsy shop, and preview the mockups in-app. The integration mirrors a proven iOS flow (Merchable):

- Upload design to Printify by URL
- Create draft in Etsy shop with `print_areas` and full `variant_ids`
- Poll Etsy shop product for generated mockups
- Show the first mockup URL in the app

See `INTEGRATION_GUIDE.md` for exact API calls and lessons learned.

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1yPJJ5WKrm90DtAehtz26wrxDRKf8_T4d

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure environment (either):
   - Run the guided setup: `npm run setup`
   - Or create `.env.local` with at least:
     ```env
     VITE_GEMINI_API_KEY=your_gemini_key
     VITE_OPENAI_API_KEY=your_openai_key
     VITE_GROK_API_KEY=your_grok_key  # optional
     VITE_DEFAULT_AI_PROVIDER=openai  # or grok/midjourney/gemini
     # Optional Grok endpoint override if needed
     # VITE_GROK_API_BASE=https://api.x.ai/v1
     # VITE_GROK_IMAGE_PATH=/images
     # VITE_GROK_OPENAI_COMPAT=1
     VITE_IMGBB_API_KEY=your_imgbb_key
     VITE_PRINTIFY_API_KEY=your_printify_key
     VITE_PRINTIFY_SHOP_ID=your_printify_shop_id
     # Proxy base for local API server
     VITE_API_BASE=http://localhost:8787/api
     ```
3. Run the app:
   `npm run dev`

### Verbose Mode
- Use `npm run dev:verbose` to enable extra client logs without editing env files.
- Or set `VITE_DEBUG=1` in `.env.local` and restart.

### Grok Key Helper
- Set your Grok key quickly:
  - `npm run set:grok -- --api-key=YOUR_KEY`
  - Add `--default` to also set `VITE_DEFAULT_AI_PROVIDER=grok`.

### Optional Video Ads
- Enable automatic fashion/chic video ads (as 6th & 7th mockups):
  - Add `VITE_ENABLE_VIDEO_ADS=1` to `.env.local`
  - Videos are generated client-side from the first two adfusion stills created by Gemini.
  - On the Mockup Page, use the “Auto-refresh for videos” checkbox to poll for a few seconds so the two video tiles appear as soon as they finish.
  - Default for the checkbox can be set via `VITE_AUTO_REFRESH_VIDEOS=1`.
