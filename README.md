# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js, npm, and **Docker Desktop** (for local Supabase).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run db:start          # local Supabase on :54321 (see docs/supabase.md)
# ensure .env.local points at http://127.0.0.1:54321 (created for you in-repo template)
bash scripts/fetch-media.sh   # large hero/act MP4s (gitignored)
npm run dev
```

Do **not** buy a second Supabase Pro just to work around Lovable. Day-to-day schema work uses local Docker; keep one owned cloud project for production cutover. Details: [docs/supabase.md](docs/supabase.md).

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase (local Docker → your cloud at cutover)
