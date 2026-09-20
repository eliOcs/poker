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
           ('BTN_RAISE_SB', 187, 36, 8.1), ('BTN_RAISE_BB', 188, 37, 8.6),
           ('CO_RAISE_BTN', 191, 39, 20.6), ('CO_RAISE_SB', 192, 40, 11.1),
           ('CO_RAISE_BB', 193, 41, 10.3),
           ('HJ_RAISE_CO', 196, 43, 22.2), ('HJ_RAISE_BTN', 197, 44, 21.6),
           ('HJ_RAISE_SB', 198, 45, 11.1), ('HJ_RAISE_BB', 199, 46, 9.6),
           ('LJ_RAISE_HJ', 202, 48, 21.8), ('LJ_RAISE_CO', 203, 49, 23.8),
           ('LJ_RAISE_BTN', 204, 50, 21.9), ('LJ_RAISE_SB', 205, 51, 11.5),
           ('LJ_RAISE_BB', 206, 52, 9.5)]
# Previous chart, previous action, and recommended re-raise total.
FOLLOWUPS = {'SB_LIMP_BB': ('SB', 1, 13), 'SB_RAISE_BB': ('SB', 2, 24),
             'BTN_RAISE_SB': ('BTN', 2, 23), 'BTN_RAISE_BB': ('BTN', 2, 23),
             'CO_RAISE_BTN': ('CO', 2, 23), 'CO_RAISE_SB': ('CO', 2, 23),
             'CO_RAISE_BB': ('CO', 2, 23),
             'HJ_RAISE_CO': ('HJ', 2, 23), 'HJ_RAISE_BTN': ('HJ', 2, 23),
             'HJ_RAISE_SB': ('HJ', 2, 23), 'HJ_RAISE_BB': ('HJ', 2, 23),
             'LJ_RAISE_HJ': ('LJ', 2, 23), 'LJ_RAISE_CO': ('LJ', 2, 23),
             'LJ_RAISE_BTN': ('LJ', 2, 23), 'LJ_RAISE_SB': ('LJ', 2, 23),
             'LJ_RAISE_BB': ('LJ', 2, 23)}
RANKS = 'AKQJT98765432'
# Acting position versus the earlier action, independent of who is the learner.
# Key, PDF page, chart, published raise percentage, and raise total in BB.
FACING_SOURCES = [
    ('HJ_VS_LJ_OPEN', 217, 56, 8.1, 8.5), ('CO_VS_LJ_OPEN', 219, 58, 8.6, 8.5),
    ('CO_VS_HJ_OPEN', 221, 60, 9.9, 8.5), ('BTN_VS_LJ_OPEN', 224, 62, 7.3, 8.5),
    ('BTN_VS_HJ_OPEN', 226, 64, 8.8, 8.5), ('BTN_VS_CO_OPEN', 228, 66, 11.7, 8.5),
    ('SB_VS_LJ_OPEN', 230, 68, 7.3, 10), ('SB_VS_HJ_OPEN', 232, 70, 8.7, 10),
    ('SB_VS_CO_OPEN', 234, 72, 10.9, 10), ('SB_VS_BTN_OPEN', 236, 74, 15, 10),
    ('BB_VS_LJ_OPEN', 239, 76, 5.8, 10), ('BB_VS_HJ_OPEN', 241, 78, 7.6, 10),
    ('BB_VS_CO_OPEN', 243, 80, 9.7, 10), ('BB_VS_BTN_OPEN', 245, 82, 13.4, 10),
    ('BB_VS_SB_OPEN', 247, 84, 16.3, 9), ('BB_VS_SB_LIMP', 249, 86, 40.6, 3.5),
]


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


def extract_hands(page, followup=False, opening_position=None):
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
                if opening_position == 'LJ' and c == 1:
                    c = 2
                elif opening_position not in (None, 'SB') and c == 1:
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
    return hands


result = {}
for position, page, chart, _ in SOURCES:
    followup = position in FOLLOWUPS
    hands = extract_hands(page, followup, None if followup else position)
    raise_to = FOLLOWUPS[position][2] if followup else 3 if position == 'SB' else 2.5
    result[position] = {'page':page, 'chart':chart, 'raiseTo':raise_to,
                        'actions': ['fold', 'call', 'raise'], 'hands':hands}
    weights = {h: (6 if len(h)==2 else 4 if h.endswith('s') else 12) *
               (result[FOLLOWUPS[position][0]]['hands'][h][FOLLOWUPS[position][1]] / 100 if followup else 1)
               for h in hands}
    totals = [sum(v[a]*weights[h] for h,v in hands.items())/sum(weights.values()) for a in range(3)]
    print(position, 'fold/call/raise:', [round(v,2) for v in totals])

# Keep the complete strategies. Opponent views select an action at runtime.
for situation, page, chart, published, raise_to in FACING_SOURCES:
    hands = extract_hands(page)
    if situation == 'BTN_VS_HJ_OPEN':
        # Page 227 explicitly gives 54s a 4% 3-bet. Its thin red strip
        # disappears in pixel sampling; retain it at five-point precision.
        hands['54s'] = [65, 30, 5]
    total = sum(values[2] * (6 if len(hand) == 2 else 4 if hand.endswith('s') else 12)
                for hand, values in hands.items()) / 1326
    assert abs(total - published) < 1, (situation, total, published)
    actions = ['fold', 'call', 'raise']
    if situation.endswith('_LIMP'):
        actions = ['check', 'raise']
        # All non-raising weight is checking when BB faces an SB limp.
        hands = {hand: [values[0] + values[1], values[2]] for hand, values in hands.items()}
    result[situation] = {'page': page, 'chart': chart, 'raiseTo': raise_to,
                         'actions': actions, 'hands': hands}
    print(situation, 'raise:', round(total, 2))
# Responses after 3-betting and facing a 4-bet. White cells did not reach
# this decision. Weight totals by the earlier 3-bet, not a first-in range.
for key, page, chart, previous, published in [
    ('HJ_VS_LJ_4BET', 218, 57, 'HJ_VS_LJ_OPEN', [38.3, 43.3, 18.4]),
    ('CO_VS_LJ_4BET', 220, 59, 'CO_VS_LJ_OPEN', [37.4, 45.1, 17.5]),
    ('CO_VS_HJ_4BET', 222, 61, 'CO_VS_HJ_OPEN', [35.8, 48.2, 16.1]),
    ('BTN_VS_LJ_4BET', 225, 63, 'BTN_VS_LJ_OPEN', [40.6, 40, 19.4]),
    ('BTN_VS_HJ_4BET', 227, 65, 'BTN_VS_HJ_OPEN', [40, 41.6, 18.4]),
    ('BTN_VS_CO_4BET', 229, 67, 'BTN_VS_CO_OPEN', [37.3, 45.2, 17.1]),
]:
    hands = extract_hands(page, followup=True)
    result[key] = {'page': page, 'chart': chart, 'raiseTo': 100,
                   'actions': ['fold', 'call', 'raise'], 'hands': hands}
    weights = {hand: (6 if len(hand) == 2 else 4 if hand.endswith('s') else 12) *
               result[previous]['hands'][hand][2] / 100 for hand in hands}
    totals = [sum(values[action] * weights[hand] for hand, values in hands.items()) /
              sum(weights.values()) for action in range(3)]
    assert all(abs(actual - expected) < 1 for actual, expected in zip(totals, published)), (key, totals)
    print(key, 'fold/call/raise:', [round(value, 2) for value in totals])
Path('src/backend/learn-ranges.json').write_text(json.dumps(result, indent=2)+'\n')
