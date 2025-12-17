#!/bin/bash

# Script to set Vercel environment variables via CLI
# Usage: ./scripts/set-vercel-env.sh VARIABLE_NAME value [environment]
#   environment: production, preview, or development (default: all)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
	echo -e "${RED}Error: Vercel CLI is not installed.${NC}"
	echo "Install it with: npm i -g vercel"
	exit 1
fi

# Check if we're linked to a Vercel project
if [ ! -d ".vercel" ]; then
	echo -e "${YELLOW}Warning: Not linked to a Vercel project.${NC}"
	echo "Linking to existing project..."
	
	# Try to link to existing project
	vercel link --yes || {
		echo -e "${RED}Error: Failed to link to Vercel project.${NC}"
		echo "Please run 'vercel link' manually first."
		exit 1
	}
fi

# Parse arguments
VAR_NAME=$1
VAR_VALUE=$2
ENV_TYPE=${3:-all}

if [ -z "$VAR_NAME" ] || [ -z "$VAR_VALUE" ]; then
	echo -e "${RED}Usage: $0 VARIABLE_NAME value [environment]${NC}"
	echo "  environment: production, preview, development, or 'all' (default)"
	exit 1
fi

# Set environment variable
if [ "$ENV_TYPE" = "all" ]; then
	echo -e "${GREEN}Setting $VAR_NAME for all environments...${NC}"
	echo "$VAR_VALUE" | vercel env add "$VAR_NAME" production
	echo "$VAR_VALUE" | vercel env add "$VAR_NAME" preview
	echo "$VAR_VALUE" | vercel env add "$VAR_NAME" development
else
	echo -e "${GREEN}Setting $VAR_NAME for $ENV_TYPE environment...${NC}"
	echo "$VAR_VALUE" | vercel env add "$VAR_NAME" "$ENV_TYPE"
fi

echo -e "${GREEN}✓ Environment variable $VAR_NAME set successfully${NC}"

