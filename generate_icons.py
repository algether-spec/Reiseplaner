#!/usr/bin/env python3
"""Generiert PWA-Icons mit 🚐 Emoji auf grünem Hintergrund."""

from PIL import Image, ImageDraw, ImageFont

EMOJI_FONT = "/System/Library/Fonts/Apple Color Emoji.ttc"
# Apple Color Emoji unterstützt nur diese Bitmap-Größen:
EMOJI_BITMAP_SIZES = [160, 96, 64, 48, 40, 32, 20]
BG_COLOR = (26, 107, 90)  # #1a6b5a
EMOJI = "🚐"


def render_emoji_img(font_size):
    """Rendert das Emoji in einem temporären Bild und gibt es als RGBA zurück."""
    font = ImageFont.truetype(EMOJI_FONT, font_size)
    tmp = Image.new("RGBA", (font_size * 2, font_size * 2), (0, 0, 0, 0))
    draw = ImageDraw.Draw(tmp)
    bbox = draw.textbbox((0, 0), EMOJI, font=font, embedded_color=True)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = font_size - w // 2 - bbox[0]
    y = font_size - h // 2 - bbox[1]
    draw.text((x, y), EMOJI, font=font, embedded_color=True)
    # Croppen auf tatsächliche Emoji-Fläche
    cropped = tmp.crop((x + bbox[0], y + bbox[1], x + bbox[0] + w, y + bbox[1] + h))
    return cropped


def generate_icon(size, output_path):
    radius = int(size * 0.20)

    # Hintergrund mit Rounded Corners
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG_COLOR)

    # Emoji in größter verfügbarer Bitmap-Größe rendern
    emoji_img = render_emoji_img(160)

    # Auf Zielgröße skalieren (65% der Icon-Breite)
    target_emoji_size = int(size * 0.65)
    emoji_img = emoji_img.resize(
        (target_emoji_size, target_emoji_size),
        Image.LANCZOS
    )

    # Zentriert einfügen
    paste_x = (size - target_emoji_size) // 2
    paste_y = (size - target_emoji_size) // 2
    img.paste(emoji_img, (paste_x, paste_y), emoji_img)

    img.save(output_path, "PNG")
    print(f"  ✓ {output_path} ({size}x{size}px)")


if __name__ == "__main__":
    print("Generiere PWA Icons...")
    generate_icon(192, "icon-192.png")
    generate_icon(512, "icon-512.png")
    generate_icon(512, "icon-maskable.png")
    print("Fertig.")
