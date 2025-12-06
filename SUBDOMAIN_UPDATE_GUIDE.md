# Subdomain Update Guide: whatsapp.almajdmeet.org → whatsapp.almajd.info

## Prerequisites

1. **DNS Configuration**: Make sure `whatsapp.almajd.info` DNS A record points to your server IP: `134.209.54.16`
2. **SSH Access**: You need SSH access to the server

## Steps to Update Subdomain

### Step 1: Update DNS (Do this first!)

In your DNS provider (where `almajd.info` is managed), add an A record:
- **Type**: A
- **Name**: whatsapp
- **Value**: 134.209.54.16
- **TTL**: 300 (or default)

Wait a few minutes for DNS to propagate. You can check with:
```bash
dig whatsapp.almajd.info
# or
nslookup whatsapp.almajd.info
```

### Step 2: SSH into the Server

```bash
ssh root@134.209.54.16
```

### Step 3: Pull Latest Changes

```bash
cd /root/whatsapp-dashboard
git pull origin main
```

### Step 4: Run the Update Script

```bash
cd /root/whatsapp-dashboard
chmod +x update_subdomain.sh
./update_subdomain.sh
```

The script will:
- ✅ Create new Nginx configuration for `whatsapp.almajd.info`
- ✅ Enable the new site
- ✅ Test Nginx configuration
- ✅ Reload Nginx
- ✅ Obtain SSL certificate using Certbot

### Step 5: Update Frontend Environment

The frontend `.env.production` file has been updated. Rebuild the frontend:

```bash
cd /root/whatsapp-dashboard/client
npm run build
pm2 restart whatsapp-frontend
```

### Step 6: (Optional) Remove Old Domain Configuration

After confirming the new domain works, you can remove the old configuration:

```bash
# Remove old site
rm /etc/nginx/sites-enabled/whatsapp.almajdmeet.org
rm /etc/nginx/sites-available/whatsapp.almajdmeet.org

# Test and reload
nginx -t
systemctl reload nginx
```

## Verification

1. **Check Nginx Status**:
   ```bash
   systemctl status nginx
   ```

2. **Check SSL Certificate**:
   ```bash
   certbot certificates
   ```

3. **Test the New Domain**:
   - Open: https://whatsapp.almajd.info
   - Should load without SSL warnings
   - API calls should work: https://whatsapp.almajd.info/api/devices

## Troubleshooting

### If SSL Certificate Fails:
- Make sure DNS is pointing to the server
- Check if port 80 is open: `ufw status`
- Try manually: `certbot --nginx -d whatsapp.almajd.info`

### If Nginx Fails:
- Check logs: `tail -f /var/log/nginx/error.log`
- Test config: `nginx -t`

### If Frontend Doesn't Load:
- Check PM2: `pm2 status`
- Check frontend logs: `pm2 logs whatsapp-frontend`
- Verify build: `ls -la /root/whatsapp-dashboard/client/build`

## Summary

After completing these steps:
- ✅ New domain: https://whatsapp.almajd.info
- ✅ SSL certificate installed
- ✅ Frontend updated with new API URL
- ✅ All services running

The old domain (`whatsapp.almajdmeet.org`) can be removed after confirming everything works.

