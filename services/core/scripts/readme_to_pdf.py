#!/usr/bin/env python3
"""
Generate README.pdf from README.md at project root.
Requires: pip install fpdf2 markdown
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
README_MD = ROOT / "README.md"
README_PDF = ROOT / "README.pdf"

# Replace Unicode chars that Helvetica (Latin-1) cannot render
UNICODE_REPLACES = [
    ("\u2014", "--"),   # em dash
    ("\u2013", "-"),    # en dash
    ("\u2018", "'"),    # left single quote
    ("\u2019", "'"),    # right single quote
    ("\u201c", '"'),    # left double quote
    ("\u201d", '"'),    # right double quote
    ("\u2026", "..."),  # ellipsis
    ("\u00a0", " "),    # nbsp
]


def main():
    if not README_MD.exists():
        print(f"Error: {README_MD} not found.", file=sys.stderr)
        sys.exit(1)

    try:
        import markdown
        from fpdf import FPDF
    except ImportError as e:
        print("Install dependencies: pip install fpdf2 markdown", file=sys.stderr)
        raise SystemExit(1) from e

    text = README_MD.read_text(encoding="utf-8", errors="replace")
    for old, new in UNICODE_REPLACES:
        text = text.replace(old, new)
    # Ensure PDF-safe: keep only ASCII so Helvetica/Courier work (no Unicode font required)
    text = re.sub(r"[^\x00-\x7f\n]", " ", text)
    text = re.sub(r" +", " ", text)  # collapse spaces
    text = re.sub(r"\n +", "\n", text)  # no leading spaces on lines
    html = markdown.markdown(
        text,
        extensions=["extra", "sane_lists", "nl2br"],
    )
    # fpdf2 has limited table support; flatten tables to divs with line breaks
    html = re.sub(r"<table[^>]*>", "<div>", html, flags=re.IGNORECASE)
    html = re.sub(r"</table>", "</div>", html, flags=re.IGNORECASE)
    html = re.sub(r"<thead[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"</thead>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<tbody[^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"</tbody>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<tr[^>]*>", "<br/>", html, flags=re.IGNORECASE)
    html = re.sub(r"</tr>", "", html, flags=re.IGNORECASE)
    html = re.sub(r"<t[dh][^>]*>", " | ", html, flags=re.IGNORECASE)
    html = re.sub(r"</t[dh]>", "", html, flags=re.IGNORECASE)
    # Point internal fragment links to external URL so fpdf2 does not require named destinations
    html = re.sub(r' href="#([^"]*)"', r' href="https://github.com/axionaxprotocol/axionax-core-universe#\1"', html, flags=re.IGNORECASE)
    html = re.sub(r' id="[^"]*"', "", html, flags=re.IGNORECASE)
    # Wrap in a minimal body for consistent rendering
    html = f"<body style='font-family: Helvetica; font-size: 11pt;'>{html}</body>"

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    pdf.write_html(html)
    pdf.output(str(README_PDF))
    print(f"Created {README_PDF}")


if __name__ == "__main__":
    main()
