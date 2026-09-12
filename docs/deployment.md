# Production deploy

aibusiness.fun is shipped from this machine with `scripts/deploy-app.sh`.
GitHub Actions does **not** deploy. The old `Deploy to Production` workflow
was removed — it ran on every `main` push with empty `VPS_*` secrets and
failed in ~12 seconds.

## Ship

```bash
cd ~/auraos
./scripts/deploy-app.sh
```

That rsyncs to the VPS, refuses `AURA_T0_KEY` / `AURA_ALLOW_PRE_T0_CA` on the
server, builds with `NITRO_PRESET=node-server`, restarts `auraos.service`,
installs the 10-minute worker cron if missing, and curls the homepage.

`.env` on the VPS is never overwritten.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on pull requests:
tests first, then lint (Prettier-as-error deferred), typecheck (non-blocking),
then a production build with dummy Supabase keys.

CI is not a deploy gate. Do not add a GitHub deploy workflow later without
`needs: check` and real `VPS_HOST` / `VPS_USER` / `VPS_SSH_KEY` secrets.

## Troubleshooting

```bash
ssh -i "$HOME/.ssh/id_ed25519" -o IdentitiesOnly=yes root@186.240.156.50 \
  "systemctl status auraos --no-pager; journalctl -u auraos -n 50"
```
