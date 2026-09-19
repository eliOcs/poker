"""Extract approximate preflop frequencies from a locally supplied book PDF.
Requires pymupdf and Pillow. Usage: python extract-ranges.py /path/to/book.pdf
Only derived numerical data is written; the PDF and chart images stay local.
"""
import io
import json
import sys
from pathlib import Path

import pymupdf
from PIL import Image

SOURCES = [('LJ', 200, 47, 17.1), ('HJ', 194, 42, 21.4),
           ('CO', 189, 38, 27.8), ('BTN', 185, 35, 43.4), ('SB', 182, 32, 24.4),
           ('SB_LIMP_BB', 183, 33, 13.4), ('SB_RAISE_BB', 184, 34, 17.2),
           ('BTN_RAISE_SB', 187, 36, 8.1), ('BTN_RAISE_BB', 188, 37, 8.6)]
# Previous chart, previous action, and recommended re-raise total.
FOLLOWUPS = {'SB_LIMP_BB': ('SB', 1, 13), 'SB_RAISE_BB': ('SB', 2, 24),
             'BTN_RAISE_SB': ('BTN', 2, 23), 'BTN_RAISE_BB': ('BTN', 2, 23)}
RANKS = 'AKQJT98765432'


def color(pixel, followup=False):
    r, g, b = pixel[:3]
    if r > 110 and r > g * 1.6 and r > b * 1.6:
        return 2  # raise
    if max(r, g, b) < 100:
        return 1  # call
    if followup and min(r, g, b) > 225:
        return 3  # absent from the range that reached this decision
    return 0  # fold


pdf = pymupdf.open(sys.argv[1])
result = {}
for position, page, chart, _ in SOURCES:
    followup = position in FOLLOWUPS
    entry = max(pdf[page - 1].get_images(), key=lambda item: item[2] * item[3])
    im = Image.open(io.BytesIO(pdf.extract_image(entry[0])['image'])).convert('RGB')
    # The source images have a narrow white margin on their right/bottom edges.
    bbox = im.point(lambda v: 255 if v < 235 else 0).getbbox()
    left, top, right, bottom = bbox
    hands = {}
    for row in range(13):
        for col in range(13):
            x0, x1 = [round(left + (right-left)*v/13) for v in (col, col+1)]
            y0, y1 = [round(top + (bottom-top)*v/13) for v in (row, row+1)]
            counts = [0, 0, 0, 0] if followup else [0, 0, 0]
            for x in range(x0+1, x1-1):
                # Sample below lettering, above horizontal cell borders.
                samples = [color(im.getpixel((x, y)), followup) for y in range(round(y0+(y1-y0)*.70), round(y0+(y1-y0)*.88))]
                c = max(range(len(counts)), key=samples.count)
                if position == 'LJ' and c == 1:
                    c = 2
                elif position != 'SB' and not followup and c == 1:
                    c = 0
                counts[c] += 1
            hand = RANKS[row]+RANKS[col] if row == col else (RANKS[row]+RANKS[col]+'s' if row < col else RANKS[col]+RANKS[row]+'o')
            if followup:
                # White cells never reach this branch; they are not folds.
                if counts[3] > sum(counts) / 2:
                    continue
                counts = counts[:3]
            values = [round(n/sum(counts)*20)*5 for n in counts]
            values[max(range(3), key=counts.__getitem__)] += 100-sum(values)
            hands[hand] = values
    raise_to = FOLLOWUPS[position][2] if followup else 3 if position == 'SB' else 2.5
    result[position] = {'page':page, 'chart':chart, 'raiseTo':raise_to, 'hands':hands}
    weights = {h: (6 if len(h)==2 else 4 if h.endswith('s') else 12) *
               (result[FOLLOWUPS[position][0]]['hands'][h][FOLLOWUPS[position][1]] / 100 if followup else 1)
               for h in hands}
    totals = [sum(v[a]*weights[h] for h,v in hands.items())/sum(weights.values()) for a in range(3)]
    print(position, 'fold/call/raise:', [round(v,2) for v in totals])
Path('src/backend/learn-ranges.json').write_text(json.dumps(result, indent=2)+'\n')
