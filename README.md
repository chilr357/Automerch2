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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
