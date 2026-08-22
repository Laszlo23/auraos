# Add Gigerl to Wien Directory

Gigerl has been paid (99€ local seat) but needs to be added to the production database.

## Quick Start (Choose ONE method)

### Method 1: Run Node Script (Recommended - 30 seconds)

On your local machine or VPS where you have Supabase credentials:

```bash
# Set your Supabase credentials
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the script
node add-gigerl-direct.mjs
```

The script will:
- ✅ Insert Gigerl as a paid local business
- ✅ Assign a local cohort number (1-1000)
- ✅ Grant 200 boost credits
- ✅ Make it live on /wien and /b/gigerl

### Method 2: Call API Endpoint

After deploying this branch:

```bash
curl -X POST https://aibusiness.fun/api/ops/add-gigerl
```

### Method 3: Run SQL in Supabase Dashboard

Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new

Run the SQL from: `add-gigerl-direct.sql`

## What Gets Added

- **Name**: Gigerl
- **Type**: Traditional Viennese Heuriger
- **Address**: Rauhensteingasse 3 (Eingang Blumenstockgasse 2), 1010 Wien
- **Phone**: +43 1 513 44 31
- **Email**: office@gigerl.at
- **Website**: https://www.gigerl.at/
- **Hours**: Mo–Sa 16:00–24:00 | Warme Küche bis 23:00
- **Status**: ✅ Paid local seat (99€)
- **Services**: Heurigenbuffet, Wiener Küche, Weinverkostung, Gastgarten, Kaiserschmarrn, BIO-zertifiziert

## After Running

Gigerl will be live at:
- Wien directory: https://aibusiness.fun/wien
- Business page: https://aibusiness.fun/b/gigerl

## Troubleshooting

If the script fails with "No users found", make sure you have at least one user in your Supabase auth.users table.

## Cleanup

After successfully adding Gigerl, you can delete:
- `add-gigerl-direct.mjs`
- `add-gigerl-direct.sql`
- `src/routes/api/ops/add-gigerl.ts`
- This README file
