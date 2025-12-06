#!/bin/bash

# Script to update subdomain from whatsapp.almajdmeet.org to whatsapp.almajd.info

OLD_DOMAIN="whatsapp.almajdmeet.org"
NEW_DOMAIN="whatsapp.almajd.info"

echo "🔄 Updating subdomain from $OLD_DOMAIN to $NEW_DOMAIN..."

# 1. Create new Nginx configuration
echo "📝 Creating new Nginx configuration..."
cat > /etc/nginx/sites-available/$NEW_DOMAIN << 'EOF'
server {
    server_name whatsapp.almajd.info;

    # Backend API - Must come first and be very specific
    location ~ ^/api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO - Must come before the catch-all route
    location ~ ^/socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend (React app) - Catch-all route must come last
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 80;
}
EOF

# 2. Enable the new site
echo "🔗 Enabling new site..."
ln -sf /etc/nginx/sites-available/$NEW_DOMAIN /etc/nginx/sites-enabled/$NEW_DOMAIN

# 3. Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # 4. Reload Nginx
    echo "🔄 Reloading Nginx..."
    systemctl reload nginx
    
    # 5. Get SSL certificate
    echo "🔒 Obtaining SSL certificate for $NEW_DOMAIN..."
    certbot --nginx -d $NEW_DOMAIN --non-interactive --agree-tos --email admin@almajd.info
    
    if [ $? -eq 0 ]; then
        echo "✅ SSL certificate obtained successfully!"
        echo ""
        echo "🎉 Subdomain update complete!"
        echo "📍 New URL: https://$NEW_DOMAIN"
        echo ""
        echo "⚠️  Don't forget to:"
        echo "   1. Update DNS records to point $NEW_DOMAIN to your server IP"
        echo "   2. Update frontend .env.production file with new domain"
        echo "   3. Rebuild and restart frontend"
    else
        echo "❌ Failed to obtain SSL certificate"
        echo "   Make sure DNS is pointing to this server first"
    fi
else
    echo "❌ Nginx configuration test failed"
    exit 1
fi

