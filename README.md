# ◈ TaskFlow — Futuristic To-Do App

A minimal, futuristic task manager with dark/light mode, reminders, and Google Auth support.

## Features
- ✅ Create tasks with due time & reminder notifications
- 🔔 Browser notifications for reminders
- ☑️ Mark tasks complete (records completion time)
- 🏷️ Priority levels: Normal / High / Critical
- 🌙 Dark & Light mode toggle
- 👤 Google Auth (or demo name login)
- 💾 Data persisted in localStorage
- 📱 Fully responsive

## Deploy to Vercel (Free)

1. Fork or push this repo to your GitHub
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Framework: **Other** (Static)
5. Click **Deploy** — done! Free HTTPS URL in seconds.

## Local Development

Just open `index.html` in your browser — no build step needed.

## File Structure

```
taskflow/
├── index.html    # Main HTML structure
├── style.css     # Futuristic dark/light theme
├── app.js        # All app logic
└── vercel.json   # Vercel deployment config
```

## Future Upgrades
- 🗄️ Real database (Supabase / Firebase) for multi-device sync
- 📸 Photo upload on task completion
- 🔐 Full Google OAuth flow
- 📊 Productivity analytics dashboard
