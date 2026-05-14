# Gemini Proxy Service

Secure proxy for Gemini image/video generation.

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Set required environment variables
   ```bash
   export VITE_GEMINI_API_KEY="<your-gemini-key>"
   export VIDEO_API_KEY="<shared-secret>"
   ```

3. Start locally
   ```bash
   npm start
   ```

## Deploy to Cloud Run

1. Build and submit the container
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/gemini-proxy
   ```
2. Deploy
   ```bash
   gcloud run deploy gemini-proxy \
     --image gcr.io/PROJECT_ID/gemini-proxy \
     --region us-west1 \
     --allow-unauthenticated \
     --set-env-vars VITE_GEMINI_API_KEY="<your-gemini-key>",VIDEO_API_KEY="<shared-secret>"
   ```
3. Test
   ```bash
   curl -H "x-api-key: <shared-secret>" https://<service-url>/health
   ```
