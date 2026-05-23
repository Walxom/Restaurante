import re
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
import os

md_path = r"D:\syntara biz\mibend-Cocinería\Bendistaurante\docs\calidad y pruebas de software\PPF_Bendistaurante_Plan_Pruebas_Funcionales.md"
docx_path = r"D:\syntara biz\mibend-Cocinería\Bendistaurante\docs\calidad y pruebas de software\PPF_Bendistaurante_Plan_Pruebas_Funcionales.docx"

with open(md_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

doc = Document()

# ---- STYLES ----
style = doc.styles["Normal"]
font = style.font
font.name = "Calibri"
font.size = Pt(10.5)
style.paragraph_format.space_after = Pt(4)
style.paragraph_format.line_spacing = 1.15

# Configure heading styles
for i in range(1, 5):
    hs = doc.styles[f"Heading {i}"]
    hs.font.name = "Calibri"
    hs.font.color.rgb = RGBColor(0x1F, 0x3A, 0x5F)
    if i == 1:
        hs.font.size = Pt(18)
        hs.font.bold = True
    elif i == 2:
        hs.font.size = Pt(14)
        hs.font.bold = True
    elif i == 3:
        hs.font.size = Pt(12)
        hs.font.bold = True
    else:
        hs.font.size = Pt(11)
        hs.font.bold = True

# Set margins
for section in doc.sections:
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.5)
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)


def parse_inline(text):
    """Convert **bold** and `code` to runs."""
    parts = []
    # Split by **bold** or `code`
    pattern = r"(\*\*(.+?)\*\*|`(.+?)`)"
    last_end = 0
    for m in re.finditer(pattern, text):
        if m.start() > last_end:
            parts.append(("normal", text[last_end : m.start()]))
        if m.group(2) is not None:
            parts.append(("bold", m.group(2)))
        else:
            parts.append(("code", m.group(3)))
        last_end = m.end()
    if last_end < len(text):
        parts.append(("normal", text[last_end:]))
    return parts


def add_rich_paragraph(para, text):
    """Add rich text (bold, code) to a paragraph."""
    parts = parse_inline(text)
    for typ, t in parts:
        run = para.add_run(t)
        if typ == "bold":
            run.bold = True
        elif typ == "code":
            run.font.name = "Consolas"
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0xE0, 0x4F, 0x1A)


def make_table_cell_shading(cell, color):
    """Set background color of a table cell."""
    shading = cell._element.get_or_add_tcPr()
    shading_elm = shading.makeelement(qn("w:shd"), {
        qn("w:val"): "clear",
        qn("w:color"): "auto",
        qn("w:fill"): color,
    })
    shading.append(shading_elm)


# ---- PARSE ----
i = 0
in_code_block = False
code_buffer = []
table_buffer = []
in_table = False
table_headers_done = False

while i < len(lines):
    line = lines[i].rstrip()

    # Code block toggle
    if line.startswith("```"):
        if in_code_block:
            # End code block
            para = doc.add_paragraph()
            para.paragraph_format.space_before = Pt(2)
            para.paragraph_format.space_after = Pt(2)
            run = para.add_run("\n".join(code_buffer))
            run.font.name = "Consolas"
            run.font.size = Pt(8.5)
            run.font.color.rgb = RGBColor(0x33, 0x33, 0x33)
            code_buffer = []
            in_code_block = False
        else:
            in_code_block = True
        i += 1
        continue
    if in_code_block:
        code_buffer.append(line)
        i += 1
        continue

    # Skip empty lines in certain contexts
    if not line.strip():
        i += 1
        continue

    # Tables
    if line.startswith("|"):
        if not in_table:
            in_table = True
            table_buffer = []
            table_headers_done = False

        # Skip separator rows (| --- | --- |)
        if re.match(r"^\|[\s\-:]+\|", line):
            table_headers_done = True
            i += 1
            continue

        cells = [c.strip() for c in line.split("|")[1:-1]]
        table_buffer.append(cells)
        i += 1
        continue
    else:
        if in_table and table_buffer:
            # Flush table
            ncols = max(len(r) for r in table_buffer)
            table = doc.add_table(rows=len(table_buffer), cols=ncols)
            table.style = "Table Grid"
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            for ri, row_data in enumerate(table_buffer):
                for ci in range(ncols):
                    cell = table.cell(ri, ci)
                    val = row_data[ci] if ci < len(row_data) else ""
                    cell.text = ""
                    para = cell.paragraphs[0]
                    para.paragraph_format.space_before = Pt(1)
                    para.paragraph_format.space_after = Pt(1)
                    # Bold for header row
                    if ri == 0:
                        add_rich_paragraph(para, val)
                        for p in cell.paragraphs:
                            for r in p.runs:
                                r.bold = True
                        make_table_cell_shading(cell, "1F3A5F")
                        for p in cell.paragraphs:
                            for r in p.runs:
                                r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    else:
                        add_rich_paragraph(para, val)

            # Fix cell widths to be proportional
            for row in table.rows:
                for cell in row.cells:
                    cell.width = Cm(14 / ncols)

            table_buffer = []
            in_table = False
            table_headers_done = False
            # Do NOT increment i (re-process this non-table line)
            continue

    # Headers
    h_match = re.match(r"^(#{1,4})\s+(.+)$", line)
    if h_match:
        level = len(h_match.group(1))
        text = h_match.group(2)
        # Remove HTML comments like <!-- ... -->
        text = re.sub(r"<[^>]+>", "", text).strip()
        # Remove image syntax
        text = re.sub(r"!\[.*?\]\(.*?\)", "", text).strip()
        if text:
            para = doc.add_heading(text, level=level)
        i += 1
        continue

    # Horizontal rule
    if re.match(r"^-{3,}\s*$", line):
        para = doc.add_paragraph()
        run = para.add_run("─" * 60)
        run.font.color.rgb = RGBColor(0xCC, 0xCC, 0xCC)
        run.font.size = Pt(6)
        i += 1
        continue

    # Regular paragraph (handle bold, code)
    text = re.sub(r"<[^>]+>", "", line).strip()
    if text:
        para = doc.add_paragraph()
        add_rich_paragraph(para, text)
    i += 1

# Flush remaining table buffer
if table_buffer:
    ncols = max(len(r) for r in table_buffer)
    table = doc.add_table(rows=len(table_buffer), cols=ncols)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for ri, row_data in enumerate(table_buffer):
        for ci in range(ncols):
            cell = table.cell(ri, ci)
            val = row_data[ci] if ci < len(row_data) else ""
            cell.text = val

# Flush remaining code buffer
if code_buffer:
    para = doc.add_paragraph()
    run = para.add_run("\n".join(code_buffer))
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)

# ---- Add page numbers in footer ----
for section in doc.sections:
    footer = section.footer
    footer.is_linked_to_previous = False
    para = footer.paragraphs[0]
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = para.add_run("Página ")
    run.font.size = Pt(8)
    run.font.color.rgb = RGBColor(0x99, 0x99, 0x99)

    # Add page number field
    fldChar1 = run._element.makeelement(qn("w:fldChar"), {qn("w:fldCharType"): "begin"})
    run._element.addnext(fldChar1)
    instrText = run._element.makeelement(qn("w:instrText"), {})
    instrText.text = " PAGE "
    fldChar1.addnext(instrText)
    fldChar2 = run._element.makeelement(qn("w:fldChar"), {qn("w:fldCharType"): "end"})
    instrText.addnext(fldChar2)

# ---- Save ----
doc.save(docx_path)
print(f"[OK] Documento DOCX generado: {docx_path}")
