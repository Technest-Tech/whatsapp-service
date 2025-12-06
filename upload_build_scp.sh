#!/bin/bash

# Alternative upload script using scp (if rsync is not available)

SERVER="root@134.209.54.16"
SERVER_PATH="/root/whatsapp-dashboard/client"
LOCAL_BUILD="client/build"

echo "📦 Uploading build files to server using scp..."

# Check if build directory exists
if [ ! -d "$LOCAL_BUILD" ]; then
    echo "❌ Build directory not found: $LOCAL_BUILD"
    echo "   Please run 'npm run build' in the client directory first"
    exit 1
fi

# Create a temporary tar archive
echo "📦 Creating archive..."
tar -czf /tmp/build.tar.gz -C client build

if [ $? -ne 0 ]; then
    echo "❌ Failed to create archive"
    exit 1
fi

# Upload archive
echo "🚀 Uploading archive..."
scp /tmp/build.tar.gz "$SERVER:/tmp/"

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload archive"
    rm /tmp/build.tar.gz
    exit 1
fi

# Extract on server
echo "📂 Extracting on server..."
ssh $SERVER "cd $SERVER_PATH && rm -rf build && tar -xzf /tmp/build.tar.gz && rm /tmp/build.tar.gz"

if [ $? -eq 0 ]; then
    echo "✅ Build files uploaded successfully!"
    echo ""
    echo "🔄 Restarting frontend service..."
    ssh $SERVER "pm2 restart whatsapp-frontend"
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend service restarted!"
        echo ""
        echo "🎉 Deployment complete!"
        echo "📍 Check: https://whatsapp.almajd.info"
    else
        echo "⚠️  Files uploaded but failed to restart service"
    fi
    
    # Clean up local archive
    rm /tmp/build.tar.gz
else
    echo "❌ Failed to extract files on server"
    rm /tmp/build.tar.gz
    exit 1
fi

