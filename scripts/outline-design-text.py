#!/usr/bin/env python3
"""Outline existing local type, preserving HarfBuzz shaping and CSS line boxes."""
import json
import subprocess
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

runs = json.loads(sys.argv[1])
paths = []
all_bounds = []
for run in runs:
    font = TTFont(run['font'])
    glyphs = font.getGlyphSet()
    scale = run['size'] / font['head'].unitsPerEm
    line = run['size'] * run.get('line', .86)
    ascent = font['hhea'].ascent * scale
    descent = font['hhea'].descent * scale
    baseline = run.get('y', 0) + (line - ascent + descent) / 2 + ascent
    shaped = json.loads(subprocess.check_output(['hb-shape', run['font'], run['text'], '--output-format=json'], text=True))
    outline = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    x = y = 0
    for item in shaped:
        transform = (scale, 0, 0, -scale, run.get('x', 0) + (x + item['dx']) * scale, baseline - (y + item['dy']) * scale)
        glyphs[item['g']].draw(TransformPen(outline, transform))
        glyphs[item['g']].draw(TransformPen(bounds, transform))
        x += item['ax'] + run.get('tracking', 0) / scale
        y += item['ay']
    paths.append('<path fill="' + run.get('color', '#553D3D') + '" d="' + outline.getCommands() + '"/>')
    if bounds.bounds:
        all_bounds.append(bounds.bounds)
print(json.dumps({'paths': ''.join(paths), 'bounds': [min(b[0] for b in all_bounds), min(b[1] for b in all_bounds), max(b[2] for b in all_bounds), max(b[3] for b in all_bounds)]}))
