"""Build a text-only PDF from USER_MANUAL_0.1.0.md without external packages."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name("USER_MANUAL_0.1.0.md")
OUTPUT = ROOT / "output" / "pdf" / "USER_MANUAL_0.1.0.pdf"
PAGE_WIDTH, PAGE_HEIGHT = 595, 842
LEFT, RIGHT, TOP, BOTTOM = 54, 54, 54, 54
BODY_SIZE, BODY_LEADING = 9.5, 14
GREEN = (0.02, 0.37, 0.12)
BRIGHT_GREEN = (0.03, 0.48, 0.18)
MUTED = (0.37, 0.44, 0.39)
TEXT = (0.06, 0.13, 0.09)


def ascii_text(value: str) -> str:
    for old, new in {"—": "-", "–": "-", "’": "'", "“": '"', "”": '"', "•": "-", "…": "..."}.items():
        value = value.replace(old, new)
    return re.sub(r"\s+", " ", value).strip()


def clean_inline(value: str) -> str:
    return ascii_text(re.sub(r"[`*_]", "", value))


def wrap(value: str, width: int) -> list[str]:
    words = clean_inline(value).split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or [""]


def parse_manual() -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    paragraphs: list[str] = []
    bullets: list[str] = []

    def flush() -> None:
        nonlocal paragraphs, bullets
        if paragraphs:
            blocks.append(("p", " ".join(paragraphs)))
            paragraphs = []
        if bullets:
            blocks.extend(("bullet", item) for item in bullets)
            bullets = []

    for raw in SOURCE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line == "---":
            flush()
            continue
        heading = re.match(r"^(#{1,3})\s+(.+)$", line)
        if heading:
            flush()
            blocks.append((f"h{len(heading.group(1))}", heading.group(2)))
            continue
        bullet = re.match(r"^-\s+(.+)$", line)
        if bullet:
            if paragraphs:
                blocks.append(("p", " ".join(paragraphs)))
                paragraphs = []
            bullets.append(bullet.group(1))
            continue
        paragraphs.append(line)
    flush()
    return blocks


def pdf_string(value: str) -> str:
    value = ascii_text(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    return f"({value})"


def text_command(x: float, y: float, value: str, size: float, color: tuple[float, float, float], font="F1") -> str:
    r, g, b = color
    return f"BT /{font} {size:.1f} Tf {r:.3f} {g:.3f} {b:.3f} rg {x:.1f} {y:.1f} Td {pdf_string(value)} Tj ET"


def line_command(x1: float, y1: float, x2: float, y2: float, color=GREEN, width=1.0) -> str:
    r, g, b = color
    return f"{r:.3f} {g:.3f} {b:.3f} RG {width:.1f} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S"


def make_pdf() -> None:
    blocks = parse_manual()
    pages: list[list[str]] = []
    page: list[str] = []
    y = PAGE_HEIGHT - TOP

    def new_page() -> None:
        nonlocal page, y
        if page:
            pages.append(page)
        page = []
        y = PAGE_HEIGHT - TOP

    def ensure(space: float) -> None:
        nonlocal y
        if y - space < BOTTOM:
            new_page()

    page = [line_command(LEFT, 130, PAGE_WIDTH - RIGHT, 130, GREEN, 5)]
    page.append(text_command(LEFT, 520, "ProH Pharmacy", 29, GREEN, "F2"))
    page.append(text_command(LEFT, 482, "Trekking Operations", 29, GREEN, "F2"))
    page.append(text_command(LEFT, 430, "User Manual", 18, MUTED))
    page.append(text_command(LEFT, 386, "Version 0.1.0 Beta", 11, GREEN, "F2"))
    page.append(text_command(LEFT, 360, "For administrators, coordinators, sales staff, and drivers", 10, MUTED))
    new_page()

    page.append(text_command(LEFT, y, "Contents", 21, GREEN, "F2"))
    y -= 34
    contents = [text for kind, text in blocks if kind == "h2"]
    for index, title in enumerate(contents, 1):
        ensure(22)
        page.append(text_command(LEFT, y, f"{index}. {clean_inline(title)}", 10.5, TEXT))
        y -= 20
    new_page()

    for kind, raw_text in blocks:
        title = clean_inline(raw_text)
        if kind == "h1":
            continue
        if kind == "h2":
            ensure(42)
            y -= 9
            page.append(text_command(LEFT, y, title, 18, GREEN, "F2"))
            y -= 25
            page.append(line_command(LEFT, y, PAGE_WIDTH - RIGHT, y, (0.87, 0.91, 0.88), 0.7))
            y -= 14
            continue
        if kind == "h3":
            ensure(30)
            y -= 5
            page.append(text_command(LEFT, y, title, 12.5, BRIGHT_GREEN, "F2"))
            y -= 19
            continue
        if kind == "bullet":
            lines = wrap(title, 82)
            ensure(len(lines) * BODY_LEADING + 4)
            for line_index, line in enumerate(lines):
                page.append(text_command(LEFT + 8, y, ("- " if line_index == 0 else "  ") + line, BODY_SIZE, TEXT))
                y -= BODY_LEADING
            y -= 2
            continue
        lines = wrap(title, 92)
        ensure(len(lines) * BODY_LEADING + 4)
        for line in lines:
            page.append(text_command(LEFT, y, line, BODY_SIZE, TEXT))
            y -= BODY_LEADING
        y -= 5
    if page:
        pages.append(page)

    for index, commands in enumerate(pages):
        if index > 0:
            commands.insert(0, text_command(LEFT, PAGE_HEIGHT - 30, "ProH Pharmacy Trekking Operations", 7.5, MUTED))
            commands.append(text_command(PAGE_WIDTH / 2 - 18, 26, f"Page {index + 1}", 7.5, MUTED))

    objects: list[bytes] = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"",  # pages object filled below
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ]
    page_refs = " ".join(f"{6 + i * 2} 0 R" for i in range(len(pages)))
    objects[1] = f"<< /Type /Pages /Kids [{page_refs}] /Count {len(pages)} >>".encode()
    for commands in pages:
        stream = "\n".join(commands).encode("latin-1", "replace")
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
        objects.append(b"")
    for i in range(len(pages)):
        stream_object = 5 + i * 2
        page_object = 6 + i * 2
        objects[page_object - 1] = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {stream_object} 0 R >>".encode()

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for number, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{number} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode())
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(pdf)
    print(OUTPUT)


if __name__ == "__main__":
    make_pdf()
