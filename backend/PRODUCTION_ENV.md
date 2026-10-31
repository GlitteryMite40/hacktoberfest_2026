# Kalp.io production environment

Set these values on the **`kalp-api` Vercel project, Production environment**.
Never put secrets in the frontend (`NEXT_PUBLIC_*`) project.

| Variable | Value / source |
|---|---|
| `SUPABASE_URL` | `https://qxvqcedrfexztfywshyb.supabase.co` |
| `SUPABASE_SECRET_KEY` | Create/copy the project's **secret key** in Supabase Dashboard → Project Settings → API Keys. Use the secret key (or legacy service_role key), not the publishable/anon key. |
| `GEMMA_API_KEY` | Google AI Studio API key with Gemini API access. |
| `GEMMA_MODEL` | `gemma-4-26b-a4b-it` |
| `GEMMA_FALLBACK_MODEL` | `gemma-4-31b-it` |
| `APP_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://kalp-io.vercel.app` |
| `OWNER_COOKIE_SECURE` | `true` |

The Supabase secret key is backend-only. Do not prefix it with `NEXT_PUBLIC_`, do not commit it, and do not paste it into chat. The project has RLS enabled and no public table policies, so a publishable/anon key must not be substituted for this server credential.

After setting the variables, redeploy `kalp-api` so the Python process initializes with them. Then verify:

1. `GET https://kalp-api.vercel.app/api/db/status` returns HTTP 200 with `status: connected`.
2. `GET https://kalp-api.vercel.app/api/llm/status` reports `provider: Google Gemma 4` and `configured: true`.
3. `POST https://kalp-api.vercel.app/api/llm/test` returns HTTP 200 with `status: ready`.
4. Create a project from `https://kalp-io.vercel.app`, run all four stages, confirm graph nodes/edges render, refresh the page, and verify the project remains in the list.

The `GEMINI_API_KEY` variable remains a temporary compatibility fallback in code, but configure `GEMMA_API_KEY` for the final deployment.
