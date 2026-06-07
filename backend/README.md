# idea-backend

Express API server for cross-device note sync. Runs on **Hugging Face Spaces** (Docker) with a local SQLite file stored in persistent storage (`/data/notes.db`).

No external database needed — data survives redeploys via HF Spaces persistent storage.

## Local Development

```bash
cd backend
npm install
node server.js          # uses local.db in current folder
```

The server starts on port 7860.

## Deploy to Hugging Face Spaces

1. Create a new Space at https://huggingface.co/new-space
   - Choose **Docker** as the SDK
   - Set visibility to Public (free tier)

2. In Space Settings → **Storage**, enable **Persistent Storage** (free small tier is enough)

3. Push the `backend/` folder contents to your HF Space repo:
   ```bash
   cd backend
   git init
   git remote add space https://huggingface.co/spaces/YOUR_USER/idea-backend
   git add .
   git commit -m "initial deploy"
   git push space main
   ```

4. Once deployed, your API will be at:
   `https://YOUR_USER-idea-backend.hf.space`

## Connect Frontend

Set the environment variable on Vercel:
- `VITE_API_URL` = `https://YOUR_USER-idea-backend.hf.space`

Or for local dev, create `.env` in the project root:
```
VITE_API_URL=http://localhost:7860
```
