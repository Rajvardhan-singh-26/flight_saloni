"""Generates the A4 charter quotation PDF, matching the dashboard's quote sheet design:
serif brand header, gold section headings, aircraft photo, three-column cost table,
and an authorised-signature block.
"""
from __future__ import annotations

import io
import os
from datetime import date
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from backend.models.schemas import Aircraft, PricingBreakdown, QuoteRequest

NAVY = colors.HexColor("#122441")
NAVY_DEEP = colors.HexColor("#0b1730")
GOLD = colors.HexColor("#c9a24b")
GREY = colors.HexColor("#5a6472")
GREY_LIGHT = colors.HexColor("#9aa3af")
LIGHT_BG = colors.HexColor("#f4f6f9")
INK = colors.HexColor("#1a2233")

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm

# Aircraft photos live in the frontend's public folder so both apps share them.
PHOTO_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "public"

SERIF = "Times-Roman"
SERIF_BOLD = "Times-Bold"


def _styles() -> dict[str, ParagraphStyle]:
    return {
        "goldHead": ParagraphStyle("goldHead", fontName="Helvetica-Bold", fontSize=9.5, textColor=GOLD, spaceBefore=7, spaceAfter=4, leading=12),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=14),
        "kvLabel": ParagraphStyle("kvLabel", fontName="Helvetica", fontSize=9, textColor=GREY, leading=15),
        "kvValue": ParagraphStyle("kvValue", fontName="Helvetica-Bold", fontSize=9, textColor=INK, leading=15),
        "placeholder": ParagraphStyle("placeholder", fontName="Helvetica-Oblique", fontSize=9.5, textColor=GREY_LIGHT, leading=14),
        "terms": ParagraphStyle("terms", fontName="Helvetica", fontSize=8, textColor=GREY, leading=12.5),
        "sigLabel": ParagraphStyle("sigLabel", fontName="Helvetica", fontSize=8.5, textColor=GREY, leading=12),
        "sigName": ParagraphStyle("sigName", fontName=SERIF, fontSize=15, textColor=INK, leading=18),
        "sigRole": ParagraphStyle("sigRole", fontName="Helvetica", fontSize=8, textColor=GREY, leading=11),
        "brandSub": ParagraphStyle("brandSub", fontName="Helvetica", fontSize=8.5, textColor=GREY, leading=12),
        "qMeta": ParagraphStyle("qMeta", fontName="Helvetica", fontSize=9, textColor=GREY, leading=13, alignment=TA_RIGHT),
    }


def _header_footer(canvas, doc):
    canvas.saveState()
    # Brand header (white sheet, serif wordmark, gold divider below)
    canvas.setFillColor(NAVY)
    canvas.setFont(SERIF_BOLD, 19)
    brand_left = "CAREWELL "
    canvas.drawString(MARGIN, PAGE_H - 18 * mm, brand_left)
    w = canvas.stringWidth(brand_left, SERIF_BOLD, 19)
    canvas.setFillColor(GOLD)
    canvas.drawString(MARGIN + w, PAGE_H - 18 * mm, "AVIATION")
    canvas.setFillColor(GREY)
    canvas.setFont("Helvetica", 8.5)
    canvas.drawString(MARGIN, PAGE_H - 23 * mm, "Charter Operations · Executive Aviation Services · The Wings of Imagination")

    canvas.setFillColor(NAVY)
    canvas.setFont(SERIF_BOLD, 21)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 16.5 * mm, "QUOTATION")
    canvas.setFont("Helvetica", 9)
    canvas.setFillColor(GREY)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 21.5 * mm, doc.quote_id)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 25.5 * mm, date.today().strftime("%d %B %Y"))

    canvas.setFillColor(GOLD)
    canvas.rect(MARGIN, PAGE_H - 29 * mm, PAGE_W - 2 * MARGIN, 0.8 * mm, fill=1, stroke=0)

    # Footer strip
    canvas.setFillColor(NAVY_DEEP)
    canvas.rect(0, 0, PAGE_W, 12 * mm, fill=1, stroke=0)
    canvas.setFont(SERIF_BOLD, 9)
    canvas.setFillColor(colors.white)
    canvas.drawString(MARGIN, 4.8 * mm, "CAREWELL")
    w = canvas.stringWidth("CAREWELL ", SERIF_BOLD, 9)
    canvas.setFillColor(GOLD)
    canvas.drawString(MARGIN + w, 4.8 * mm, "AVIATION")
    canvas.setFillColor(colors.whitesmoke)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(PAGE_W / 2, 4.8 * mm, "carewellaviation.com  ·  commercials@carewellaviation.com  ·  +91 98741 64445")
    canvas.drawRightString(PAGE_W - MARGIN, 4.8 * mm, doc.quote_id)
    canvas.restoreState()


# Rupee (INR) and Dirham (AED) glyphs aren't in the core PDF fonts' base-14
# encoding, so those two fall back to an ASCII prefix to avoid rendering as
# a blank box; the other symbols are all present in WinAnsiEncoding.
_CURRENCY_SYMBOLS = {
    "USD": "$",
    "INR": "Rs. ",
    "JPY": "¥",
    "EUR": "€",
    "GBP": "£",
    "AED": "AED ",
    "SGD": "S$",
}


def _money(v: float, currency: str = "USD") -> str:
    symbol = _CURRENCY_SYMBOLS.get(currency, currency + " ")
    return f"{symbol}{v:,.0f}"


def _kv_rows(pairs: list[tuple[str, str]], styles) -> Table:
    data = [[Paragraph(k, styles["kvLabel"]), Paragraph(v, styles["kvValue"])] for k, v in pairs]
    t = Table(data, colWidths=[26 * mm, 55 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def generate_quote_pdf(quote: QuoteRequest, aircraft: Aircraft | None, pricing: PricingBreakdown, quote_id: str) -> bytes:
    buf = io.BytesIO()
    styles = _styles()

    doc = BaseDocTemplate(
        buf, pagesize=A4,
        topMargin=33 * mm, bottomMargin=15 * mm, leftMargin=MARGIN, rightMargin=MARGIN,
        title=f"Charter Quotation {quote_id}",
    )
    doc.quote_id = quote_id
    frame = Frame(MARGIN, 14 * mm, PAGE_W - 2 * MARGIN, PAGE_H - 47 * mm, id="body")
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=_header_footer)])

    story = []
    cust, flight = quote.customer, quote.flight
    content_w = PAGE_W - 2 * MARGIN

    # PREPARED FOR | FLIGHT SUMMARY
    if cust.customer_name or cust.company or cust.email or cust.phone:
        left_cell = _kv_rows(
            [(k, v) for k, v in [
                ("Client", cust.customer_name or "—"),
                ("Company", cust.company or "—"),
                ("Phone", cust.phone or "—"),
                ("Email", cust.email or "—"),
            ]],
            styles,
        )
    else:
        left_cell = Paragraph("Client details will appear here", styles["placeholder"])

    right_cell = _kv_rows(
        [
            ("Route", f"{flight.departure_airport or '—'}  →  {flight.arrival_airport or '—'}"),
            ("Date", flight.departure_date or "—"),
            ("Passengers", str(flight.passengers) if flight.passengers else "—"),
            ("Aircraft", aircraft.name if aircraft else "—"),
            ("Category", aircraft.category if aircraft else "—"),
        ],
        styles,
    )

    two_col = Table(
        [
            [Paragraph("PREPARED FOR", styles["goldHead"]), Paragraph("FLIGHT SUMMARY", styles["goldHead"])],
            [left_cell, right_cell],
        ],
        colWidths=[content_w / 2, content_w / 2],
    )
    two_col.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(two_col)
    story.append(Spacer(1, 6))

    # Aircraft photo band with category caption
    if aircraft:
        photo_path = PHOTO_DIR / aircraft.image.lstrip("/")
        if photo_path.exists():
            img = ImageReader(str(photo_path))
            iw, ih = img.getSize()
            target_w = content_w
            target_h = min(target_w * ih / iw, 47 * mm)
            story.append(Image(str(photo_path), width=target_w, height=target_h))
            caption = Table(
                [[Paragraph(f'<font color="#c9a24b"><b>{aircraft.category.upper()}</b></font>&nbsp;&nbsp;'
                            f'<font color="#ffffff"><b>{aircraft.manufacturer} {aircraft.name}</b></font>&nbsp;&nbsp;'
                            f'<font color="#c8d0dc">{aircraft.max_passengers} pax · {aircraft.max_range_nm:,} nm · {aircraft.cruise_speed_kt} kt</font>',
                            styles["body"])]],
                colWidths=[content_w],
            )
            caption.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), NAVY_DEEP),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(caption)
        story.append(Spacer(1, 4))

    # COST BREAKDOWN
    story.append(Paragraph("COST BREAKDOWN", styles["goldHead"]))
    currency = quote.charges.currency
    hours_detail = f"{flight.flight_hours:g} hrs × {_money(quote.charges.hourly_rate, currency)}/hr"
    rows = [
        ("Charter Flight Cost", hours_detail, _money(pricing.flight_cost, currency)),
        ("Landing Charges", "Per sector", _money(pricing.landing_charges, currency)),
        ("Handling Charges", "Ground services", _money(pricing.handling_charges, currency)),
        ("Fuel Surcharge", f"{flight.flight_hours:g} hrs", _money(pricing.fuel_charges, currency)),
        ("Parking", "Overnight", _money(pricing.parking_charges, currency)),
    ]
    if pricing.discount:
        rows.append(("Discount", "Negotiated", f"− {_money(pricing.discount, currency)}"))
    rows.append((f"Taxes & Levies", f"{quote.charges.gst_percent:g}% applicable", _money(pricing.gst_amount, currency)))

    data = [["Description", "Details", "Amount"]] + [list(r) for r in rows]
    col_w = [content_w * 0.42, content_w * 0.33, content_w * 0.25]
    t = Table(data, colWidths=col_w)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTNAME", (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 1), (1, -1), "Helvetica"),
        ("FONTNAME", (2, 1), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("TEXTCOLOR", (0, 1), (0, -1), INK),
        ("TEXTCOLOR", (1, 1), (1, -1), GREY),
        ("TEXTCOLOR", (2, 1), (2, -1), INK),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("ALIGN", (2, 0), (2, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)

    total = Table(
        [[Paragraph('<font color="#ffffff" size="11"><b>GRAND TOTAL</b></font>', styles["body"]),
          Paragraph(f'<font color="#c9a24b" size="14" face="{SERIF_BOLD}"><b>{_money(pricing.grand_total, currency)}</b></font>',
                    ParagraphStyle("gt", alignment=TA_RIGHT, leading=17))]],
        colWidths=[content_w * 0.6, content_w * 0.4],
    )
    total.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY_DEEP),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(total)

    if quote.notes:
        story.append(Paragraph("SPECIAL REQUIREMENTS", styles["goldHead"]))
        story.append(Paragraph(quote.notes, styles["body"]))

    # TERMS & CONDITIONS (matching the design's five terms)
    story.append(Paragraph("TERMS &amp; CONDITIONS", styles["goldHead"]))
    story.append(Paragraph(
        "1. This quotation is valid for 72 hours from the date of issue.<br/>"
        "2. A 50% deposit is required upon confirmation of booking.<br/>"
        "3. Pricing is subject to change based on fuel price fluctuations beyond ±5%.<br/>"
        "4. Cancellation within 24 hours of departure is non-refundable.<br/>"
        "5. All prices are exclusive of applicable government fees and airport charges unless stated.",
        styles["terms"],
    ))

    # Signatures
    story.append(Spacer(1, 6))
    sales_name = os.getenv("SALES_NAME", "Charter Consultant")
    sig = Table(
        [
            [Paragraph("Authorised Signature", styles["sigLabel"]), Paragraph("Client Acceptance", styles["sigLabel"])],
            [Paragraph(sales_name, styles["sigName"]), Spacer(1, 14)],
            [Paragraph("Charter Consultant · Carewell Aviation", styles["sigRole"]),
             Paragraph("Signature &amp; Date", styles["sigLabel"])],
        ],
        colWidths=[content_w / 2, content_w / 2],
    )
    sig.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("LINEBELOW", (0, 1), (0, 1), 0.5, GREY_LIGHT),
        ("LINEBELOW", (1, 1), (1, 1), 0.5, GREY_LIGHT),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 3),
    ]))
    story.append(sig)

    doc.build(story)
    return buf.getvalue()
