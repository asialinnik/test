import base64
import os
from pathlib import Path

import anthropic
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="WhatsApp Reply Generator")

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

SYSTEM_PROMPT = """Ты помогаешь составлять тёплые, краткие ответы на сообщения мамы в WhatsApp.

Правила:
- Тон: любящий, внимательный, немного неформальный — как пишет заботливый взрослый ребёнок маме
- Длина: 1–3 предложения, не больше
- Язык: только русский
- Не используй шаблонные фразы вроде «Конечно!» или «Разумеется!»
- Отвечай по существу на то, что написала мама
- Если мама делится новостью — прояви интерес или радость
- Если мама беспокоится — успокой её
- Если мама спрашивает — дай короткий, понятный ответ

Предложи РОВНО 3 варианта ответа. Каждый вариант — отдельная строка, без нумерации и без лишних пояснений.
Верни только сами варианты ответов, ничего больше."""


def encode_image(image_bytes: bytes, media_type: str) -> dict:
    encoded = base64.standard_b64encode(image_bytes).decode("utf-8")
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": media_type,
            "data": encoded,
        },
    }


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = STATIC_DIR / "index.html"
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))


@app.post("/analyze")
async def analyze(
    images: list[UploadFile] = File(...),
    context: str = Form(default=""),
):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not set")

    if not images:
        raise HTTPException(status_code=400, detail="No images provided")

    client = anthropic.Anthropic(api_key=api_key)

    content: list[dict] = []

    for upload in images:
        raw = await upload.read()
        media_type = upload.content_type or "image/jpeg"
        if media_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
            media_type = "image/jpeg"
        content.append(encode_image(raw, media_type))

    user_text = "Вот скриншот(ы) переписки с мамой в WhatsApp. Предложи 3 варианта ответа."
    if context.strip():
        user_text += f"\n\nДополнительный контекст: {context.strip()}"
    content.append({"type": "text", "text": user_text})

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}],
    )

    raw_text = message.content[0].text.strip()
    replies = [line.strip() for line in raw_text.splitlines() if line.strip()]

    return JSONResponse({"replies": replies})
