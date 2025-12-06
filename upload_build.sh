#!/bin/bash

# Script to upload locally built frontend to server

SERVER="root@134.209.54.16"
SERVER_PATH="/root/whatsapp-dashboard/client/build"
LOCAL_BUILD="client/build"

echo "📦 Uploading build files to server..."

# Check if build directory exists
if [ ! -d "$LOCAL_BUILD" ]; then
    echo "❌ Build directory not found: $LOCAL_BUILD"
    echo "   Please run 'npm run build' in the client directory first"
    exit 1
fi

# Upload build files using rsync (more efficient than scp)
echo "🚀 Uploading files..."
rsync -avz --delete \
    --exclude='.DS_Store' \
    --exclude='*.map' \
    "$LOCAL_BUILD/" "$SERVER:$SERVER_PATH/"

if [ $? -eq 0 ]; then
    echo "✅ Build files uploaded successfully!"
    echo ""
    echo "🔄 Restarting frontend service on server..."
    ssh $SERVER "pm2 restart whatsapp-frontend"
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend service restarted!"
        echo ""
        echo "🎉 Deployment complete!"
        echo "📍 Check: https://whatsapp.almajd.info"
    else
        echo "⚠️  Files uploaded but failed to restart service"
        echo "   Please manually restart: ssh $SERVER 'pm2 restart whatsapp-frontend'"
    fi
else
    echo "❌ Failed to upload build files"
    exit 1
fi

