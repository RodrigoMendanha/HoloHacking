"""Folha de conferencia: junta os quadros de saida/<id>/quadros num so JPG.  python3 folha.py <id> <saida.jpg>"""
import sys, glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob(f'saida/{sys.argv[1]}/quadros/*.jpg'))
w, hh, cols = 300, 533, 6
rows = (len(fs) + cols - 1) // cols
S = Image.new('RGB', (cols * (w + 8), rows * (hh + 30)), 'white'); d = ImageDraw.Draw(S)
for i, f in enumerate(fs):
    x, y = (i % cols) * (w + 8), (i // cols) * (hh + 30)
    S.paste(Image.open(f).resize((w, hh)), (x, y)); d.text((x + 4, y + hh + 6), f.split('q-')[-1], fill='black')
S.save(sys.argv[2], quality=85)
