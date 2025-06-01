# Deployment Guide for Scrum Poker

## Custom Domain Setup

This application is configured to deploy on Cloudflare Workers with a custom domain. Follow these steps:

### Prerequisites
1. A Cloudflare account
2. Your domain managed by Cloudflare DNS
3. Cloudflare CLI (`wrangler`) authenticated

### Domain Configuration

1. **Add your domain to Cloudflare**:
   - Go to Cloudflare Dashboard
   - Add your domain (`hyrivera.com`)
   - Update your domain's nameservers to use Cloudflare

2. **Create a Custom Domain**:
   - In Cloudflare Dashboard, go to Workers & Pages
   - Go to your worker (scrum-poker)
   - Click "Custom Domains" tab
   - Add `scrum-poker.hyrivera.com`

### Deployment Steps

1. **Build the frontend**:
   ```bash
   npm run build
   ```

2. **Deploy to Cloudflare Workers**:
   ```bash
   ./deploy.sh
   ```

   Or manually:
   ```bash
   cd workers
   npm run deploy:production
   ```

### Configuration Files

- `wrangler.toml`: Cloudflare Workers configuration
- `deploy.sh`: Automated deployment script

### Environment Variables

The application uses these environment variables:
- `ENVIRONMENT`: "production" or "development"
- `VITE_SOCKET_URL`: The WebSocket URL for the application
- `NODE_ENV`: Node environment
- `DEV`: Development flag

### Troubleshooting

**"Unreachable level" error**: 
- Ensure your domain is properly configured in Cloudflare
- Check that the custom domain is added to your Worker
- Verify DNS is propagated (can take up to 24 hours)

**Build errors**:
- Run `npm install` in both root and `workers/` directories
- Ensure TypeScript compilation succeeds: `npm run build`

**Deployment errors**:
- Check `wrangler whoami` to ensure you're authenticated
- Verify your account has the necessary permissions
- Check the `wrangler.toml` configuration 