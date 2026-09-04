from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size):
    # Create high-res image with transparent background
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Padding and rounded box dimensions
    pad = int(size * 0.04)
    radius = int(size * 0.22)
    box = [pad, pad, size - pad, size - pad]

    # Background rounded rectangle: #11141a
    draw.rounded_rectangle(box, radius=radius, fill=(17, 20, 26, 255), outline=(255, 255, 255, 35), width=max(1, int(size * 0.02)))

    # Corner crosshairs (+)
    plus_len = int(size * 0.08)
    plus_pad = int(size * 0.12)
    plus_color = (255, 255, 255, 75)
    pw = max(1, int(size * 0.02))

    # Top-Left crosshair
    draw.line([(plus_pad - plus_len//2, plus_pad), (plus_pad + plus_len//2, plus_pad)], fill=plus_color, width=pw)
    draw.line([(plus_pad, plus_pad - plus_len//2), (plus_pad, plus_pad + plus_len//2)], fill=plus_color, width=pw)

    # Bottom-Right crosshair
    br_x, br_y = size - plus_pad, size - plus_pad
    draw.line([(br_x - plus_len//2, br_y), (br_x + plus_len//2, br_y)], fill=plus_color, width=pw)
    draw.line([(br_x, br_y - plus_len//2), (br_x, br_y + plus_len//2)], fill=plus_color, width=pw)

    # Center symbol: ⇲ (Compress / Bottom-Right Arrow with corner bracket)
    # Let's draw the geometry cleanly for vector-sharp precision at all sizes!
    # A diagonal arrow pointing to bottom-right, into an angle bracket (compression symbol)
    center = size / 2
    accent_color = (0, 255, 135, 255) # #00ff87 Neon Green

    # Draw corner bracket at bottom-right of center:
    # Bracket corner:
    bw = max(2, int(size * 0.075)) # line width
    b_margin = int(size * 0.25)
    
    # Horizontal line of bracket: from center to right
    # Vertical line of bracket: from center to bottom
    x_right = size - b_margin
    y_bottom = size - b_margin
    x_mid = int(size * 0.42)
    y_mid = int(size * 0.42)

    # Draw bottom-right bracket:
    draw.line([(x_mid, y_bottom), (x_right, y_bottom)], fill=accent_color, width=bw)
    draw.line([(x_right, y_mid), (x_right, y_bottom)], fill=accent_color, width=bw)

    # Draw diagonal arrow: from top-left towards bottom-right corner
    arrow_start = (int(size * 0.28), int(size * 0.28))
    arrow_end = (int(size * 0.65), int(size * 0.65))
    draw.line([arrow_start, arrow_end], fill=accent_color, width=bw)

    # Arrow head (pointing towards bottom-right):
    ah_len = int(size * 0.16)
    draw.line([(arrow_end[0] - ah_len, arrow_end[1]), arrow_end], fill=accent_color, width=bw)
    draw.line([(arrow_end[0], arrow_end[1] - ah_len), arrow_end], fill=accent_color, width=bw)

    return img

public_dir = "d:/zipstream project/public"

# 1. Generate PNGs
img_512 = create_icon(512)
img_512.save(os.path.join(public_dir, "logo512.png"))

img_192 = create_icon(192)
img_192.save(os.path.join(public_dir, "logo192.png"))

img_180 = create_icon(180)
img_180.save(os.path.join(public_dir, "apple-touch-icon.png"))

img_48 = create_icon(48)
img_48.save(os.path.join(public_dir, "favicon-48x48.png"))

img_32 = create_icon(32)
img_32.save(os.path.join(public_dir, "favicon-32x32.png"))

img_16 = create_icon(16)
img_16.save(os.path.join(public_dir, "favicon-16x16.png"))

# 2. Generate multi-resolution ICO (16, 32, 48) - Google's preferred format
img_512.save(
    os.path.join(public_dir, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)]
)

print("Icons successfully generated!")
