# DNS Setup Guide for Custom Domain

## Problem

Your custom domain `scrum-poker.hyrivera.com` isn't working because there's no DNS record pointing to your Cloudflare Worker.

## Solution

### Step 1: Add DNS Record in Cloudflare Dashboard

1. **Go to Cloudflare Dashboard**:
   - Visit: <https://dash.cloudflare.com/>
   - Select domain: `hyrivera.com`

2. **Navigate to DNS**:
   - Click **DNS** → **Records**

3. **Add DNS Record**:
   Click **Add record** and use these settings:

   **Option A - AAAA Record (Recommended)**:

   ```yaml
   Type: AAAA
   Name: scrum-poker
   IPv6 address: 100::
   Proxy status: 🟠 Proxied (IMPORTANT!)
   TTL: Auto
   ```

   **Option B - A Record**:

   ```yaml
   Type: A
   Name: scrum-poker
   IPv4 address: 192.0.2.1
   Proxy status: 🟠 Proxied (IMPORTANT!)
   TTL: Auto
   ```

   **Option C - CNAME Record**:

   ```yaml
   Type: CNAME
   Name: scrum-poker
   Target: scrum-poker.workers.dev
   Proxy status: 🟠 Proxied (IMPORTANT!)
   TTL: Auto
   ```

### Step 2: Add Custom Domain to Worker

1. **In Cloudflare Dashboard**:
   - Go to **Workers & Pages**
   - Find your worker: `scrum-poker`
   - Click on it

2. **Add Custom Domain**:
   - Click **Settings** tab
   - Scroll down to **Domains & Routes**
   - Click **Add Custom Domain**
   - Enter: `scrum-poker.hyrivera.com`
   - Click **Add Domain**

### Step 3: Redeploy Worker

After adding the DNS record and custom domain:

```bash
cd workers
pnpm run deploy:production
```

### Step 4: Wait for Propagation

- DNS changes can take 5-10 minutes
- Full global propagation: up to 24 hours
- Test with: `dig scrum-poker.hyrivera.com`

## Verification

### Check DNS Resolution

```bash
dig scrum-poker.hyrivera.com
# Should show an A or AAAA record
```

### Check HTTP Response

```bash
curl -I https://scrum-poker.hyrivera.com
# Should return HTTP 200 or redirect
```

## Troubleshooting

### Still not working?

1. Ensure the DNS record has **Proxy status: Proxied** (🟠 orange cloud)
2. Wait 10-15 minutes for DNS propagation
3. Clear your browser cache
4. Try incognito/private browsing mode

### Error "This domain is not registered"

- The custom domain hasn't been added to the Worker
- Follow Step 2 above

### Error 1001 or 522

- DNS record exists but isn't proxied
- Make sure the orange cloud (🟠) is enabled in DNS settings

## Current Status

Your worker is deployed and working at:

- ✅ `https://scrum-poker.workers.dev` (working)
- ❌ `https://scrum-poker.hyrivera.com` (needs DNS record)

Once you add the DNS record, both URLs will work!
