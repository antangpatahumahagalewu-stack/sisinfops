# Netlify Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Configuration Files (Already Set Up)
- ✅ `netlify.toml` - Netlify configuration
- ✅ `.nvmrc` - Node.js version (20)
- ✅ `@netlify/plugin-nextjs` - Installed as dev dependency

### 2. Environment Variables Required in Netlify Dashboard

Go to **Site settings → Environment variables** and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** These must be set in the Netlify dashboard, not in `.env.local` (which is gitignored).

### 3. Build Settings

The Netlify plugin automatically handles:
- Build command: `npm run build`
- Publish directory: `.next` (handled by plugin)
- Function configuration: Automatic

### 4. API Route Considerations

Your API route at `/api/excel/import` has a 10MB file size limit. Netlify Functions have a 6MB request body limit for synchronous functions. If you encounter issues with large file uploads, consider:

- Using Netlify's background functions
- Implementing chunked uploads
- Using Supabase Storage for file uploads instead

### 5. Deployment Steps

1. **Connect Repository** (if not already connected):
   - Go to Netlify Dashboard
   - Add new site → Import from Git
   - Connect your repository

2. **Set Environment Variables**:
   - Site settings → Environment variables
   - Add the Supabase variables listed above

3. **Deploy**:
   - Push to your main branch (auto-deploy)
   - Or trigger manual deploy from Netlify dashboard

### 6. Post-Deployment Verification

After deployment, verify:
- ✅ Site loads at your Netlify URL
- ✅ Authentication works (login page)
- ✅ Dashboard is accessible after login
- ✅ API routes respond correctly
- ✅ File upload functionality works

### 7. Custom Domain (Optional)

To add a custom domain:
- Site settings → Domain management
- Add custom domain
- Follow DNS configuration instructions

## Troubleshooting

### Build Fails
- Check build logs in Netlify dashboard
- Verify Node.js version matches `.nvmrc` (20)
- Ensure all dependencies are in `package.json`

### Environment Variables Not Working
- Verify variables are set in Netlify dashboard (not just `.env.local`)
- Check variable names match exactly (case-sensitive)
- Redeploy after adding/updating variables

### API Routes Not Working
- Check function logs in Netlify dashboard
- Verify Supabase connection
- Check authentication middleware

### Authentication Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Check Supabase project settings
- Verify CORS settings in Supabase dashboard

## Support

For Netlify-specific issues:
- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
