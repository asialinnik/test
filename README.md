# Ответ маме — WhatsApp Reply Generator

Generates warm, concise Russian reply suggestions from WhatsApp screenshots using Claude's vision API.

## How it works

1. You take a screenshot of Mom's WhatsApp messages
2. Open the web app on your phone (or use the iOS Shortcut)
3. Upload the screenshot → get 3 draft replies instantly
4. Tap **Копировать** and paste into WhatsApp

---

## Setup

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set your API key

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or copy `.env.example` to `.env` and fill it in, then use a tool like `python-dotenv`.

### 3. Run the server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` in your browser.

---

## Deploy (so it works on your phone)

You need the server reachable from your phone. Easiest options:

### Option A — Railway (free tier, 1-click)
1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add env var `ANTHROPIC_API_KEY` in the Railway dashboard
4. Railway gives you a public URL like `https://your-app.up.railway.app`

### Option B — Render (free tier)
Same idea: connect repo, set env var, get public URL.

### Option C — Local + ngrok (quick test)
```bash
ngrok http 8000
```
Gives you a temporary public URL for testing from your phone.

---

## iOS Shortcut (optional — send screenshot, get reply as text)

This lets you share any screenshot directly from the Photos app or Share Sheet and receive the reply options as text — no browser needed.

### Setup

1. Open the **Shortcuts** app on iPhone
2. Create a new Shortcut
3. Add these actions in order:

```
[Receive] Input: Images (from Share Sheet and Quick Actions)

[Get Contents of URL]
  URL: https://YOUR-SERVER-URL/analyze
  Method: POST
  Body: Form
    images → Shortcut Input (repeat for each image if multiple)
    context → (leave empty or add Ask Each Time)

[Get Value from Dictionary]
  Dictionary: Action Result
  Key: replies

[Choose from List]
  List: Action Result
  Prompt: Выбери вариант ответа

[Copy to Clipboard]
  Content: Chosen Item

[Show Notification]
  Title: Скопировано!
  Body: Ответ скопирован в буфер обмена
```

4. Set the Shortcut to appear in the Share Sheet
5. In Photos, select a screenshot → Share → your Shortcut name → pick a reply → paste in WhatsApp

### Detailed Shortcut JSON (import-ready)

You can also build it manually step-by-step in the Shortcuts app — the key action is **"Get Contents of URL"** with multipart form POST, sending the image as the `images` field.

---

## Customizing the tone

Edit the `SYSTEM_PROMPT` in `app.py` to adjust how responses sound.  
For example, you can add notes like:
- "Мама любит слышать про внуков"
- "Мама беспокоится о здоровье — всегда упоминай, что всё хорошо"
- "Мама живёт в Москве, у нас разница во времени"

---

## Project structure

```
.
├── app.py            # FastAPI server + Claude API integration
├── static/
│   └── index.html    # Mobile-friendly web UI
├── requirements.txt
├── .env.example
└── README.md
```
