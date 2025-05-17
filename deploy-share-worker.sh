#!/bin/bash

# Script to deploy the share-zine-worker and set up a Cloudflare D1 database

echo "Deploying the zinate share worker and setting up Cloudflare D1 database..."

# Navigate to the workers directory
cd "$(dirname "$0")/workers"

# Check if wrangler CLI is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI is not installed. Please install it using 'npm install -g wrangler'."
    exit 1
fi

# Create the D1 database if it doesn't exist
echo "Creating D1 database if it doesn't exist..."
wrangler d1 create zinate-shared-zines 2>/dev/null || true

# Get the database ID
echo "Getting database ID..."
DB_ID=$(wrangler d1 list | grep zinate-shared-zines | awk '{print $1}')

if [ -z "$DB_ID" ]; then
    echo "Error: Failed to get database ID for zinate-shared-zines."
    exit 1
fi

echo "Database ID: $DB_ID"

# Update the wrangler.toml file with the actual database ID
sed -i '' "s/database_id = \"zinate-shared-zines\"/database_id = \"$DB_ID\"/g" wrangler.toml

# Apply the database schema
echo "Applying database schema..."
wrangler d1 execute zinate-shared-zines --file=schema.sql

# Deploy the share-zine-worker
echo "Deploying share-zine-worker..."
wrangler deploy share-zine-worker.js --env share_zine

# Get the worker URL
ECHO "Getting share worker URL..."
SHARE_WORKER_URL=$(wrangler whoami | grep -A 1 "zinate-share" | tail -n 1 | awk '{print $3}')

if [ -z "$SHARE_WORKER_URL" ]; then
    echo "Warning: Failed to automatically get the share worker URL."
    echo "Please manually add the share worker URL to your .env file as NEXT_PUBLIC_SHARE_ZINE_WORKER_URL"
else
    echo "Share worker URL: $SHARE_WORKER_URL"
    
    # Update .env file with the share worker URL
    if [ -f "../.env" ]; then
        # Check if the variable already exists in the file
        if grep -q "NEXT_PUBLIC_SHARE_ZINE_WORKER_URL" "../.env"; then
            # Replace the existing value
            sed -i '' "s|NEXT_PUBLIC_SHARE_ZINE_WORKER_URL=.*|NEXT_PUBLIC_SHARE_ZINE_WORKER_URL=$SHARE_WORKER_URL|g" "../.env"
        else
            # Add the new variable
            echo "\nNEXT_PUBLIC_SHARE_ZINE_WORKER_URL=$SHARE_WORKER_URL" >> "../.env"
        fi
        echo "Updated .env file with share worker URL."
    else
        echo "Warning: .env file not found. Please manually add the share worker URL."
    fi
    
    # Update .env.cloudflare file for deployment
    if [ -f "../.env.cloudflare" ]; then
        if grep -q "NEXT_PUBLIC_SHARE_ZINE_WORKER_URL" "../.env.cloudflare"; then
            sed -i '' "s|NEXT_PUBLIC_SHARE_ZINE_WORKER_URL=.*|NEXT_PUBLIC_SHARE_ZINE_WORKER_URL=$SHARE_WORKER_URL|g" "../.env.cloudflare"
        else
            echo "\nNEXT_PUBLIC_SHARE_ZINE_WORKER_URL=$SHARE_WORKER_URL" >> "../.env.cloudflare"
        fi
        echo "Updated .env.cloudflare file with share worker URL."
    fi
fi

echo "Deployment complete! Share your zines with the world!"
