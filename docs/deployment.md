# GitHub Auto-Deployment Setup

This repository is configured to automatically deploy to production (aibusiness.fun) when code is merged to `main`.

## How It Works

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs on every push to `main` and all PRs
   - Lints, tests, typechecks, and builds
   - Must pass before deployment

2. **Deploy Workflow** (`.github/workflows/deploy.yml`)
   - Triggers automatically after push to `main`
   - Rsyncs code to VPS
   - Builds with `NITRO_PRESET=node-server`
   - Restarts `auraos.service`
   - Runs health checks

## Required GitHub Secrets

Add these secrets in **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**:

### 1. `VPS_SSH_KEY`
Private SSH key with access to the VPS. Generate or use existing:

```bash
# If you don't have one, generate:
ssh-keygen -t ed25519 -C "github-actions@auraos-deploy" -f ~/.ssh/auraos_deploy

# Copy the private key:
cat ~/.ssh/auraos_deploy
# Paste entire output (including BEGIN/END lines) as VPS_SSH_KEY secret

# Add public key to VPS:
ssh-copy-id -i ~/.ssh/auraos_deploy.pub root@186.240.156.50
# Or manually: cat ~/.ssh/auraos_deploy.pub | ssh root@186.240.156.50 "cat >> ~/.ssh/authorized_keys"
```

### 2. `VPS_HOST`
```
186.240.156.50
```

### 3. `VPS_USER`
```
root
```

## Testing the Workflow

### Manual Trigger
Go to **Actions → Deploy to Production → Run workflow** to test deployment without pushing code.

### Test with a Commit
```bash
# Make a trivial change to test
git commit --allow-empty -m "test: trigger deployment"
git push origin main
```

### Monitor
- GitHub Actions: https://github.com/Laszlo23/auraos/actions
- Check deployment logs for errors
- Health check runs automatically at the end

## Security Notes

- SSH key is stored as a GitHub secret (never exposed in logs)
- Deploy key is created and destroyed during workflow
- Only `main` branch triggers deployment
- `.env` file on VPS is never overwritten (contains secrets)

## Troubleshooting

**Deployment fails with "Permission denied":**
- Verify `VPS_SSH_KEY` secret contains the full private key
- Check SSH key is authorized on VPS: `cat /root/.ssh/authorized_keys`

**Build fails on VPS:**
- SSH to VPS and check logs: `journalctl -u auraos -n 100`
- Verify `.env` file exists: `ls -la /opt/auraos/.env`
- Check disk space: `df -h`

**Service won't restart:**
- Check systemd status: `ssh root@186.240.156.50 "systemctl status auraos"`
- View recent logs: `ssh root@186.240.156.50 "journalctl -u auraos -n 50"`

## Manual Deployment (Fallback)

If auto-deployment fails, deploy manually from your local machine:

```bash
cd ~/auraos
git pull origin main
./scripts/deploy-app.sh
```
