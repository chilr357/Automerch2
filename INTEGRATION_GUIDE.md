# 🚀 Automerch2 - Integration Guide
## Printify Etsy Flow (Exact)

1) Upload design by URL
- POST `/uploads/images.json` with `{ file_name, url }`
- Response returns `id` and `preview_url`

2) Create product in Etsy shop (draft)
- POST `/shops/{etsyShopId}/products.json`
- Body includes:
  - `blueprint_id`, `print_provider_id`
  - `variants`: enable all variant ids you plan to sell (e.g., Drive Fulfillment: 17427, 17428, ...)
  - `print_areas[0].variant_ids`: same full list
  - `print_areas[0].placeholders[0].images[0]`: use `{ src: <image URL> }` (use `id` if your shop validates on id)

3) Poll for mockups
- GET `/shops/{etsyShopId}/products/{productId}.json`
- If 404 (eventual consistency), GET `/shops/{etsyShopId}/products.json` and match by `id` or `title`
- Extract `images[0].src` and display

4) Optional: Publish
- POST `/shops/{etsyShopId}/products/{productId}/publish.json` with typical flags (`title`, `images`, etc.)

### Lessons Learned
- Use URL upload rather than base64; it’s faster and less error-prone
- Some shops require `print_areas` at creation (error 8150); include it
- Some shops validate on `images[].id` instead of `src`; if so, send `id`
- For Etsy shops, always poll from the Etsy shop routes; default shop routes can 404 (wrong shop)
- Add a short settle delay (e.g., 7s) before polling, then poll up to ~2 minutes

This guide will help you set up all the API integrations for your Automerch2 platform.

## 📋 Quick Setup

Run the automated setup script:
```bash
npm run setup
```

This will prompt you for your API keys and create a `.env.local` file automatically.

## 🔑 Required API Keys

### 1. OpenAI API Key (Required)
**Purpose**: AI image generation using DALL-E 3
**Get it**: https://platform.openai.com/api-keys
**Cost**: ~$0.04 per image (1024x1024)

### 2. Midjourney API Key (Optional)
**Purpose**: Anime character generation using Niji model
**Get it**: https://www.midjourney.com/api/
**Cost**: Varies by plan
**Auto-detection**: Automatically uses Niji for anime-related prompts

### 3. ImgBB API Key (Required)
**Purpose**: Image storage and hosting
**Get it**: https://api.imgbb.com/
**Cost**: Free tier available

### 4. Printify API Key (Required)
**Purpose**: Print-on-demand product creation and fulfillment
**Get it**: https://printify.com/app/account/api-keys
**Cost**: Free, pay per product

## 🔧 Manual Setup

If you prefer to set up manually, create a `.env.local` file in the root directory:

```env
# AI Image Generation
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_GROK_API_KEY=your_grok_api_key_here
VITE_MIDJOURNEY_API_KEY=your_midjourney_api_key_here

# Image Storage
VITE_IMGBB_API_KEY=your_imgbb_api_key_here

# Print-on-Demand
VITE_PRINTIFY_API_KEY=your_printify_api_key_here
VITE_PRINTIFY_SHOP_ID=your_printify_shop_id_here

# Payment Processing (Optional)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
VITE_STRIPE_SECRET_KEY=your_stripe_secret_key_here

# Database (Optional - can use local storage for MVP)
VITE_NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
VITE_NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Authentication (Optional - can use local storage for MVP)
VITE_NEXTAUTH_SECRET=your_nextauth_secret_here
VITE_NEXTAUTH_URL=http://localhost:3000

# Legacy support
API_KEY=your_gemini_api_key_here
```

## 🎯 API Integration Details

### AI Image Generation

**OpenAI DALL-E 3**
- High-quality image generation
- Supports various styles and prompts
- 1024x1024 resolution by default
- Cost: ~$0.04 per image

**Midjourney Niji** (Anime Specialized)
- Specialized in anime and manga style art
- Auto-detected for anime-related prompts
- Enhanced prompts for better anime results
- Keywords: anime, manga, kawaii, chibi, waifu, etc.

**Grok AI** (Alternative)
- Alternative AI provider
- Different pricing model
- API endpoints may vary

### 🎨 Auto-Detection Feature

The app automatically detects anime-related content and switches to Midjourney Niji for optimal results:

**Anime Keywords Detected**:
- anime, manga, otaku, kawaii, chibi, moe, waifu, husbando
- shoujo, shounen, seinen, josei, mecha, magical girl
- ninja, samurai, yokai, japanese, tokyo, kyoto
- school uniform, kimono, yukata, cherry blossom
- character, protagonist, hero, heroine, villain
- tsundere, yandere, dandere, kuudere

**How it works**:
1. User enters a prompt
2. System analyzes for anime keywords
3. If detected, automatically uses Midjourney Niji
4. If not detected, uses OpenAI DALL-E 3
5. Visual indicator shows which AI was used

### Image Storage (ImgBB)

**Features**:
- Free image hosting
- Direct image URLs
- No authentication required for viewing
- 32MB file size limit
- Supports: JPG, PNG, GIF, WebP

**Usage**:
```javascript
// Upload image
const response = await fetch('/api/designs/upload', {
  method: 'POST',
  body: formData
})

// Get persistent URL
const { imageUrl } = await response.json()
```

### Print-on-Demand (Printify)

**Features**:
- 850+ products available
- Global fulfillment network
- Real-time pricing
- Order tracking

**Product Types Available**:
- T-shirts, Hoodies, Sweatshirts
- Mugs, Phone Cases, Stickers
- Posters, Canvas Prints
- Tote Bags, Notebooks
- And many more...

**Usage**:
```javascript
// Get available products
const response = await fetch('/api/products/printify?action=blueprints')

// Create product
const product = await fetch('/api/products/printify', {
  method: 'POST',
  body: JSON.stringify({
    action: 'create-product',
    title: 'My Custom Design',
    blueprint_id: 5, // T-shirt
    print_provider_id: 1,
    // ... other product data
  })
})
```

## 🧪 Testing Your Integrations

### 1. Test AI Generation
1. Go to `/create`
2. Enter a prompt like "minimalist sunset landscape"
3. Click "Generate Design"
4. Verify image appears

### 2. Test Image Upload
1. Go to `/create`
2. Upload an image file
3. Verify image appears and is stored

### 3. Test Printify Integration
1. Go to `/api/products/printify?action=blueprints`
2. Verify you get a list of available products
3. Check console for any API errors

## 🔍 Troubleshooting

### Common Issues

**OpenAI API Errors**:
- Check API key is valid
- Verify account has credits
- Check rate limits

**ImgBB Upload Errors**:
- Verify API key
- Check file size (max 32MB)
- Ensure valid file type

**Printify API Errors**:
- Verify API key and shop ID
- Check shop is active
- Ensure proper permissions

### Debug Mode

Enable debug logging by adding to `.env.local`:
```env
DEBUG=true
```

## 📊 Cost Estimation

**Monthly costs for 1000 users**:
- OpenAI: ~$40 (1000 images)
- ImgBB: Free
- Printify: Pay per product sold
- Total: ~$40/month

## 🚀 Production Deployment

### Environment Variables for Production

Update your production environment with:
```env
VITE_NEXTAUTH_URL=https://yourdomain.com
VITE_NEXTAUTH_SECRET=your_production_secret
```

### Security Considerations

1. **Never commit API keys** to version control
2. **Use environment variables** for all sensitive data
3. **Implement rate limiting** for API endpoints
4. **Add authentication** for production use
5. **Monitor API usage** and costs

## 📈 Scaling Considerations

### Performance
- Implement image caching
- Use CDN for image delivery
- Add database for user management
- Implement proper error handling

### Cost Optimization
- Cache generated images
- Implement usage limits
- Monitor API usage
- Consider bulk pricing

## 🆘 Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all API keys are correct
3. Test individual API endpoints
4. Check API provider status pages
5. Review this guide for common solutions

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [ImgBB API Documentation](https://api.imgbb.com/)
- [Printify API Documentation](https://printify.com/app/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Happy creating! 🎨**
