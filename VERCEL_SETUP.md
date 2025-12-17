# Vercel Setup Guide

This guide explains how to use Vercel CLI commands in this project without breaking your existing CI/CD pipeline.

## Current Setup

Your project is already connected to Vercel via GitHub integration with continuous deployment enabled. This means:
- Every push to your main branch triggers a deployment
- Pull requests get preview deployments
- The `.vercel` directory is gitignored (won't affect CI/CD)

## Linking Local Project to Existing Vercel Project

To use Vercel CLI commands locally without creating a new project:

1. **Link to your existing project:**
   ```bash
   vercel link
   ```

2. **When prompted:**
   - Select "Link to existing project"
   - Choose your project from the list
   - Accept the default settings

3. **Verify the link:**
   ```bash
   vercel ls
   ```
   This should show your existing deployments.

## Setting Environment Variables

### Option 1: Using the Scripts

**Bash script:**
```bash
./scripts/set-vercel-env.sh VARIABLE_NAME value [environment]
```

**Node.js script:**
```bash
node scripts/set-vercel-env.mjs VARIABLE_NAME value [environment]
```

**Examples:**
```bash
# Set for all environments (production, preview, development)
./scripts/set-vercel-env.sh LINEAR_API_KEY lin_api_your_key_here

# Set only for production
./scripts/set-vercel-env.sh LINEAR_API_KEY lin_api_your_key_here production

# Set only for preview deployments
./scripts/set-vercel-env.sh LINEAR_API_KEY lin_api_your_key_here preview
```

### Option 2: Using Vercel CLI Directly

```bash
# Set for all environments
echo "your_value" | vercel env add VARIABLE_NAME production
echo "your_value" | vercel env add VARIABLE_NAME preview
echo "your_value" | vercel env add VARIABLE_NAME development

# Or set interactively
vercel env add VARIABLE_NAME
```

### Option 3: Via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add your variables there

## Common Commands

```bash
# List all environment variables
vercel env ls

# Pull environment variables to .env.local
vercel env pull .env.local

# View project info
vercel inspect

# View deployments
vercel ls

# View logs
vercel logs [deployment-url]
```

## Important Notes

### `.vercel` Directory

The `.vercel` directory contains:
- `project.json` - Project ID and name
- `.gitignore` - Already gitignored

**This directory is gitignored and will NOT affect your CI/CD pipeline.** Your GitHub integration will continue to work as before.

### Environment Variables

- Environment variables set via CLI are synced to Vercel's dashboard
- Variables set in the dashboard are available to CLI commands
- The `.env.local` file (if you create one) is for local development only and is gitignored

### CI/CD Pipeline

Your existing GitHub integration will continue to work:
- ✅ Pushes to main → Production deployments
- ✅ Pull requests → Preview deployments
- ✅ CLI commands don't interfere with this

The CLI is useful for:
- Managing environment variables
- Viewing logs and deployments locally
- Testing deployments before pushing

## Troubleshooting

### "Project not found" error

If you get an error about the project not being found:

1. Make sure you're logged in:
   ```bash
   vercel login
   ```

2. Link to the project again:
   ```bash
   vercel link
   ```

3. Verify your project:
   ```bash
   vercel ls
   ```

### "Already linked" warning

If you see a warning about being already linked, that's fine. The script will use the existing link.

### Environment variables not appearing

1. Check they're set for the right environment:
   ```bash
   vercel env ls
   ```

2. Make sure you've redeployed after setting variables:
   - Push a new commit, or
   - Use `vercel --prod` to trigger a deployment

## Example Workflow

```bash
# 1. Link to existing project (one-time setup)
vercel link

# 2. Set environment variables
./scripts/set-vercel-env.sh LINEAR_API_KEY lin_api_your_key_here

# 3. Verify variables are set
vercel env ls

# 4. Pull variables for local development (optional)
vercel env pull .env.local

# 5. Continue working - CI/CD will handle deployments
git push origin main
```

## Security Best Practices

1. **Never commit `.env` files** - They're gitignored for a reason
2. **Use `.env.example`** - Document required variables without exposing secrets
3. **Set variables per environment** - Use different values for production/preview/development
4. **Rotate keys regularly** - Update API keys periodically
5. **Use Vercel's dashboard** - For sensitive production variables, use the dashboard for better control

