from __future__ import annotations

import csv
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reports" / "ananya_goenka_bagaria_performance_report_feb_apr_2026.pdf"

CSV_FILES = {
    "February 2026": Path("/Users/apple/Downloads/Untitled-report-Feb-1-2026-to-Feb-28-2026.csv"),
    "March 2026": Path("/Users/apple/Downloads/Untitled-report-Mar-1-2026-to-Mar-31-2026.csv"),
    "April 1-28, 2026": Path("/Users/apple/Downloads/Untitled-report-Apr-1-2026-to-Apr-28-2026.csv"),
}
LOGO_PATH = Path("/Users/apple/Downloads/Ananya Goenka Bagaria/imgi_6_AGB_x_Final-12_1.png")

PAGE_W, PAGE_H = landscape(A4)
M = 34

INK = colors.HexColor("#171717")
MUTED = colors.HexColor("#66625b")
SOFT = colors.HexColor("#f6f3ee")
LINE = colors.HexColor("#ddd6cc")
GOLD = colors.HexColor("#b58a3a")
GREEN = colors.HexColor("#49745a")
RED = colors.HexColor("#a4483d")
BLUE = colors.HexColor("#395b7f")
BLACK = colors.HexColor("#0b0b0b")


@dataclass
class Campaign:
    name: str
    status: str
    result_type: str
    results: float
    cost_per_result: float
    spend: float
    impressions: float
    reach: float
    link_clicks: float
    cpc_link: float
    frequency: float
    views: float
    ctr_all: float
    clicks_all: float
    video25: float
    page_engagement: float
    ctr_link: float


def num(value: str | None) -> float:
    if value is None:
        return 0.0
    value = str(value).strip().replace(",", "").replace("₹", "")
    if not value or value == "-":
        return 0.0
    try:
        return float(value)
    except ValueError:
        return 0.0


def load_csv(path: Path) -> tuple[Campaign, list[Campaign]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    campaigns: list[Campaign] = []
    total_row = rows[0]

    def mk(row: dict[str, str]) -> Campaign:
        return Campaign(
            name=(row.get("Campaign name") or "Total").strip() or "Total",
            status=(row.get("Delivery status") or "").strip(),
            result_type=(row.get("Result type") or "Mixed").strip() or "Mixed",
            results=num(row.get("Results")),
            cost_per_result=num(row.get("Cost per result")),
            spend=num(row.get("Amount spent (INR)")),
            impressions=num(row.get("Impressions")),
            reach=num(row.get("Reach")),
            link_clicks=num(row.get("Link clicks")),
            cpc_link=num(row.get("CPC (cost per link click)")),
            frequency=num(row.get("Frequency")),
            views=num(row.get("Views")),
            ctr_all=num(row.get("CTR (all)")),
            clicks_all=num(row.get("Clicks (all)")),
            video25=num(row.get("Video plays at 25%")),
            page_engagement=num(row.get("Page engagement")),
            ctr_link=num(row.get("CTR (link click-through rate)")),
        )

    total = mk(total_row)
    for row in rows[1:]:
        campaigns.append(mk(row))
    return total, campaigns


MONTHS = {month: load_csv(path) for month, path in CSV_FILES.items()}


def money(n: float) -> str:
    return f"INR {n:,.0f}"


def whole(n: float) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}M"
    if n >= 1_000:
        return f"{n / 1_000:.1f}K"
    return f"{n:,.0f}"


def pct(n: float) -> str:
    return f"{n:.2f}%"


def wrap_text(c: canvas.Canvas, text: str, max_width: float, font: str, size: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = (current + " " + word).strip()
        if c.stringWidth(trial, font, size) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def text(c, x, y, value, size=10, color=INK, font="Helvetica", max_width=None, leading=None):
    c.setFillColor(color)
    c.setFont(font, size)
    if max_width:
        lead = leading or size * 1.35
        for line in wrap_text(c, value, max_width, font, size):
            c.drawString(x, y, line)
            y -= lead
        return y
    c.drawString(x, y, value)
    return y


def center_text(c, x, y, value, size=10, color=INK, font="Helvetica"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawCentredString(x, y, value)


def right_text(c, x, y, value, size=10, color=INK, font="Helvetica"):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawRightString(x, y, value)


def hr(c, y, x1=M, x2=PAGE_W - M, color=LINE):
    c.setStrokeColor(color)
    c.setLineWidth(0.7)
    c.line(x1, y, x2, y)


def rounded(c, x, y, w, h, fill=colors.white, stroke=LINE, radius=8, lw=0.7):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(lw)
    c.roundRect(x, y, w, h, radius, fill=1, stroke=1)


def pill(c, x, y, label, fill=SOFT, color=INK, w=None):
    width = w or c.stringWidth(label, "Helvetica", 8) + 18
    c.setFillColor(fill)
    c.roundRect(x, y - 6, width, 18, 8, fill=1, stroke=0)
    text(c, x + 9, y, label, 8, color, "Helvetica-Bold")
    return width


def header(c, page_no: int, title: str):
    text(c, M, PAGE_H - 28, "ANANYA GOENKA BAGARIA", 8, MUTED, "Helvetica-Bold")
    right_text(c, PAGE_W - M, PAGE_H - 28, f"Performance Report | Page {page_no}/8", 8, MUTED, "Helvetica")
    hr(c, PAGE_H - 38)
    text(c, M, PAGE_H - 58, title, 18, INK, "Helvetica-Bold")


def footer(c):
    hr(c, 28)
    text(c, M, 15, "Sumvaik Consulting Group | Performance Marketing Review | Feb 1-Apr 28, 2026", 7.5, MUTED)
    right_text(c, PAGE_W - M, 15, "Our analysis basis: Meta Ads Manager exports, website review, and brand observations", 7.5, MUTED)


def metric_card(c, x, y, w, h, label, value, note="", accent=GOLD):
    rounded(c, x, y, w, h, colors.white, LINE, 8)
    c.setFillColor(accent)
    c.roundRect(x, y, 5, h, 3, fill=1, stroke=0)
    text(c, x + 16, y + h - 20, label.upper(), 7.5, MUTED, "Helvetica-Bold")
    text(c, x + 16, y + h - 45, value, 18, INK, "Helvetica-Bold")
    if note:
        text(c, x + 16, y + 12, note, 8, MUTED, max_width=w - 28)


def bullet(c, x, y, value, color=INK, max_width=230, size=9.2):
    c.setFillColor(GOLD)
    c.circle(x, y + 3, 2.2, fill=1, stroke=0)
    return text(c, x + 10, y, value, size, color, max_width=max_width, leading=size * 1.35)


def table(c, x, y, col_widths: list[float], rows: list[list[str]], header_fill=BLACK):
    base_row_h = 24
    line_h = 9.2
    total_w = sum(col_widths)
    c.setFillColor(header_fill)
    c.roundRect(x, y - base_row_h, total_w, base_row_h, 5, fill=1, stroke=0)
    cx = x
    for i, cell in enumerate(rows[0]):
        text(c, cx + 8, y - 16, cell, 7.5, colors.white, "Helvetica-Bold")
        cx += col_widths[i]
    y -= base_row_h
    for r, row in enumerate(rows[1:]):
        wrapped = [
            wrap_text(c, str(cell), max(20, col_widths[i] - 16), "Helvetica-Bold" if i == 0 else "Helvetica", 7.5)
            for i, cell in enumerate(row)
        ]
        row_h = max(base_row_h, 13 + max(len(lines) for lines in wrapped) * line_h)
        fill = colors.white if r % 2 == 0 else SOFT
        c.setFillColor(fill)
        c.rect(x, y - row_h, total_w, row_h, fill=1, stroke=0)
        c.setStrokeColor(colors.HexColor("#eee8df"))
        c.line(x, y - row_h, x + total_w, y - row_h)
        cx = x
        for i, lines in enumerate(wrapped):
            cy = y - 14
            for line in lines:
                text(c, cx + 8, cy, line, 7.5, INK if i != 0 else BLACK, "Helvetica-Bold" if i == 0 else "Helvetica")
                cy -= line_h
            cx += col_widths[i]
        y -= row_h
    return y


def bar_chart(c, x, y, w, h, labels: list[str], values: list[float], color=GOLD, suffix=""):
    max_v = max(values) if values else 1
    bar_w = w / len(values) * 0.55
    gap = w / len(values)
    c.setStrokeColor(LINE)
    c.line(x, y, x + w, y)
    for i, value in enumerate(values):
        bx = x + i * gap + (gap - bar_w) / 2
        bh = h * (value / max_v)
        c.setFillColor(color if i != len(values) - 1 else BLUE)
        c.roundRect(bx, y, bar_w, bh, 4, fill=1, stroke=0)
        center_text(c, bx + bar_w / 2, y - 14, labels[i], 7.5, MUTED)
        label = money(value) if suffix == "money" else whole(value)
        center_text(c, bx + bar_w / 2, y + bh + 8, label, 7.5, INK, "Helvetica-Bold")


def section_label(c, x, y, value):
    text(c, x, y, value.upper(), 7.5, GOLD, "Helvetica-Bold")


totals = {m: data[0] for m, data in MONTHS.items()}
campaigns = {m: data[1] for m, data in MONTHS.items()}
grand_spend = sum(t.spend for t in totals.values())
grand_impressions = sum(t.impressions for t in totals.values())
grand_reach = sum(t.reach for t in totals.values())
grand_link_clicks = sum(t.link_clicks for t in totals.values())
grand_clicks = sum(t.clicks_all for t in totals.values())
grand_engagement = sum(t.page_engagement for t in totals.values())
grand_video25 = sum(t.video25 for t in totals.values())

profile_visits = sum(c.results for month in campaigns.values() for c in month if "profile visits" in c.result_type.lower())
messages = sum(c.results for month in campaigns.values() for c in month if "messaging" in c.result_type.lower())
adds_to_cart = sum(c.results for month in campaigns.values() for c in month if "adds to cart" in c.result_type.lower())


def page1(c):
    c.setFillColor(colors.white)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.setFillColor(BLACK)
    c.rect(0, PAGE_H - 150, PAGE_W, 150, fill=1, stroke=0)
    if LOGO_PATH.exists():
        img = ImageReader(str(LOGO_PATH))
        c.drawImage(img, M, PAGE_H - 120, width=252, height=94, mask="auto", preserveAspectRatio=True)
    text(c, M, PAGE_H - 192, "Performance Marketing Report", 30, INK, "Helvetica-Bold")
    text(c, M, PAGE_H - 218, "Prepared by Sumvaik Consulting Group for Ananya Goenka Bagaria", 13, MUTED)
    pill(c, M, PAGE_H - 252, "Our Feb-Mar-Apr review", fill=SOFT, color=INK, w=190)
    pill(c, M + 202, PAGE_H - 252, "Southern Avenue Kolkata popup", fill=SOFT, color=INK, w=190)
    pill(c, M + 404, PAGE_H - 252, "Objective: quality footfall", fill=SOFT, color=INK, w=160)

    rounded(c, M, 88, PAGE_W - 2 * M, 210, colors.white, LINE, 10)
    text(c, M + 24, 266, "Our position", 12, GOLD, "Helvetica-Bold")
    y = text(
        c,
        M + 24,
        240,
        "This is our consolidated performance review for February, March, and April till date. As AGB's performance marketing partner, our focus has been to build the right demand for a premium ready-to-wear brand, where online impulse sales cannot be treated as the primary success metric. The campaigns are strongest at awareness, profile interest, and popup-intent signals. For the next two months, we will convert this attention into qualified store visits through video-led proof, founder trust, styling context, WhatsApp appointment flows, and invite-led audience building.",
        12,
        INK,
        max_width=PAGE_W - 2 * M - 48,
        leading=18,
    )
    text(c, M + 24, y - 14, "Our direct reading: the funnel is alive. We now need stronger video content and a more personal conversion path to turn attention into visits.", 11, MUTED, max_width=620)
    right_text(c, PAGE_W - M, 50, "Report date: 28 April 2026", 9, MUTED)
    c.showPage()


def page2(c):
    header(c, 2, "Three-Month Performance Snapshot")
    y = PAGE_H - 104
    metric_card(c, M, y - 80, 178, 74, "Total media spend", money(grand_spend), "Across Feb, Mar and Apr 1-28", GOLD)
    metric_card(c, M + 192, y - 80, 178, 74, "Impressions", whole(grand_impressions), "Top-of-funnel presence we built", BLUE)
    metric_card(c, M + 384, y - 80, 178, 74, "Reach", whole(grand_reach), "Monthly reach is not deduplicated", GREEN)
    metric_card(c, M + 576, y - 80, 178, 74, "Link clicks", whole(grand_link_clicks), "Website/IG traffic we generated", GOLD)

    rows = [["Month", "Spend", "Impressions", "Reach", "Link clicks", "CTR all", "Page engagement"]]
    for month, t in totals.items():
        rows.append([month.replace(", 2026", ""), money(t.spend), whole(t.impressions), whole(t.reach), whole(t.link_clicks), pct(t.ctr_all), whole(t.page_engagement)])
    table(c, M, y - 120, [112, 92, 104, 92, 86, 70, 108], rows)

    section_label(c, M, 205, "Trend view")
    bar_chart(c, M, 76, 250, 94, ["Feb", "Mar", "Apr"], [t.spend for t in totals.values()], GOLD, "money")
    text(c, M, 47, "Our spend distribution stayed consistent enough to compare month-on-month.", 8.5, MUTED, max_width=260)
    bar_chart(c, M + 310, 76, 250, 94, ["Feb", "Mar", "Apr"], [t.link_clicks for t in totals.values()], BLUE)
    text(c, M + 310, 47, "March generated the highest link-click volume from our traffic and sales creative mix.", 8.5, MUTED, max_width=260)
    bar_chart(c, M + 620, 76, 160, 94, ["Feb", "Mar", "Apr"], [t.page_engagement for t in totals.values()], GREEN)
    text(c, M + 620, 47, "We saw March engagement spike; April shifted toward messaging and reach.", 8.5, MUTED, max_width=180)
    footer(c)
    c.showPage()


def page3(c):
    header(c, 3, "Campaign Learning by Month")
    y = PAGE_H - 96
    rows = [["Month", "Primary work done", "Best signal", "Learning"]]
    rows.append(["Feb", "We ran awareness, IG profile visits, and Galentines sales testing", "18,327 profile visits; 34 adds to cart", "We proved audience curiosity; premium checkout needs more proof before purchase."])
    rows.append(["Mar", "We added influencer traffic, Women's Day, and popup messaging", "60,025 video 25% plays; 115 messages", "Video-led proof improved engagement quality and mid-funnel action."])
    rows.append(["Apr 1-28", "We focused on popup messaging plus awareness", "281 message starts; 2.55M reach", "The popup-intent funnel became clearer and more actionable for us."])
    table(c, M, y, [66, 230, 172, 280], rows)

    section_label(c, M, 270, "Our signal interpretation")
    rounded(c, M, 96, 232, 145, colors.white, LINE, 9)
    text(c, M + 16, 218, "What worked for us", 12, GREEN, "Helvetica-Bold")
    yy = 194
    for b in [
        "Awareness delivery was efficient: April reach cost improved versus February and March.",
        "Profile and message actions showed that this audience wants conversation before purchase.",
        "Popup campaigns created measurable mid-funnel demand that we can now build on.",
    ]:
        yy = bullet(c, M + 16, yy, b, max_width=198)

    rounded(c, M + 260, 96, 232, 145, colors.white, LINE, 9)
    text(c, M + 276, 218, "What we will improve", 12, RED, "Helvetica-Bold")
    yy = 194
    for b in [
        "We will not judge success only by website checkout because this is a high-ticket boutique purchase.",
        "We need stronger video inventory before increasing aggressive conversion budgets.",
        "We will reduce dependence on static/catalogue creatives for INR 12k-42k products.",
    ]:
        yy = bullet(c, M + 276, yy, b, max_width=198)

    rounded(c, M + 520, 96, 260, 145, SOFT, LINE, 9)
    text(c, M + 536, 218, "Our action direction", 12, INK, "Helvetica-Bold")
    text(c, M + 536, 194, "We will keep online sales campaigns as retargeting support and move the main budget toward popup footfall, WhatsApp appointments, profile engagement, and high-intent lookalike audiences built from engagers, website visitors, and message starts.", 9.4, INK, max_width=228, leading=14)
    footer(c)
    c.showPage()


def page4(c):
    header(c, 4, "Where We Stand in the Funnel")
    x0 = M + 42
    levels = [
        ("Awareness", whole(grand_reach), "Strong", BLUE, 560),
        ("Interest", f"{whole(profile_visits)} IG visits", "Working", GREEN, 455),
        ("Consideration", f"{whole(messages)} messages", "Growing", GOLD, 330),
        ("Intent", f"{whole(adds_to_cart)} ATC", "Thin", RED, 230),
        ("Purchase / visit", "Now tracking", "Offline-first", BLACK, 150),
    ]
    y = PAGE_H - 125
    for label, value, status, col, width in levels:
        c.setFillColor(col)
        c.roundRect(x0, y, width, 42, 7, fill=1, stroke=0)
        text(c, x0 + 14, y + 25, label, 9, colors.white, "Helvetica-Bold")
        text(c, x0 + 14, y + 10, value, 8, colors.white)
        text(c, x0 + width - 86, y + 17, status, 8, colors.white, "Helvetica-Bold")
        y -= 56

    rounded(c, M + 605, PAGE_H - 410, 180, 282, colors.white, LINE, 10)
    text(c, M + 624, PAGE_H - 155, "Our funnel reading", 13, GOLD, "Helvetica-Bold")
    text(c, M + 624, PAGE_H - 185, "We have built upper and mid-funnel momentum. The next job is not only media buying; it is trust-building content and a warmer conversion mechanism.", 9.5, INK, max_width=142, leading=14)
    text(c, M + 624, PAGE_H - 252, "For premium fashion, the store visit is the conversion event. Our campaigns will now sell the reason to visit, not only the garment.", 9.5, INK, max_width=142, leading=14)

    section_label(c, M, 110, "How we will track the next phase")
    text(c, M, 86, "We will move every campaign into a measured WhatsApp/store-visit flow: ad -> landing or profile -> WhatsApp appointment -> store visit -> trial -> sale. This will allow our monthly reports to show actual popup impact, not only online metrics.", 10, INK, max_width=720)
    footer(c)
    c.showPage()


def page5(c):
    header(c, 5, "Our Audience and Positioning Direction")
    left = M
    top = PAGE_H - 104
    rounded(c, left, top - 170, 360, 150, colors.white, LINE, 10)
    text(c, left + 18, top - 44, "Audience we will prioritise", 13, INK, "Helvetica-Bold")
    y = top - 72
    for b in [
        "Women 28-48 in Kolkata with premium discretionary fashion spend.",
        "Founders, professionals, entrepreneurs, consultants, creators, and socially visible homemakers.",
        "Occasion-led buyers: work events, dinners, soirees, art/culture evenings, holidays, pre-wedding events.",
    ]:
        y = bullet(c, left + 18, y, b, max_width=318)

    rounded(c, left + 392, top - 170, 360, 150, colors.white, LINE, 10)
    text(c, left + 410, top - 44, "How we will filter quality", 13, INK, "Helvetica-Bold")
    y = top - 72
    for b in [
        "Location focus: Southern Avenue, Ballygunge, Alipore, Park Street, Salt Lake, New Alipore, Camac Street.",
        "Interests: luxury fashion, designer wear, art galleries, fine dining, premium salons, clubs, boutique hotels.",
        "Behavior: engaged shoppers, IG engagers, website visitors, WhatsApp responders, event attendees.",
    ]:
        y = bullet(c, left + 410, y, b, max_width=318)

    section_label(c, M, 275, "Our positioning message")
    text(c, M, 250, "We will not sell AGB as discount-led ecommerce. We will position it as sculpted, intentional wardrobe architecture for women who lead with presence.", 17, BLACK, "Helvetica-Bold", max_width=720, leading=23)

    rounded(c, M, 82, 240, 120, SOFT, LINE, 9)
    text(c, M + 16, 176, "What we will say", 11, GREEN, "Helvetica-Bold")
    text(c, M + 16, 152, "Visit the popup to experience fit, fall, tailoring, and styling personally.", 10, INK, max_width=205)
    rounded(c, M + 270, 82, 240, 120, SOFT, LINE, 9)
    text(c, M + 286, 176, "What we will avoid", 11, RED, "Helvetica-Bold")
    text(c, M + 286, 152, "Hard-selling online checkout, generic fashion hooks, or broad mass-fashion messaging.", 10, INK, max_width=205)
    rounded(c, M + 540, 82, 240, 120, SOFT, LINE, 9)
    text(c, M + 556, 176, "Proof we need", 11, GOLD, "Helvetica-Bold")
    text(c, M + 556, 152, "Founder voice, real try-ons, client styling, garment construction, and store experience.", 10, INK, max_width=205)
    footer(c)
    c.showPage()


def page6(c):
    header(c, 6, "Our Two-Month Media and Footfall Plan")
    rows = [["Month", "Objective", "Campaigns", "Success metric"]]
    rows.append(["May", "We will rebuild trust and create reasons to visit", "Video views, IG engagement, WhatsApp appointment, popup retargeting", "Profile visits, messages, booked visits, store walk-ins"])
    rows.append(["June", "We will scale qualified footfall and social proof", "Lookalikes from engagers, event/invite campaigns, client proof retargeting", "Visit quality, trials, sales assisted by ads"])
    table(c, M, PAGE_H - 96, [72, 210, 290, 180], rows)

    section_label(c, M, 307, "Our budget allocation")
    split = [("Awareness video", 30, BLUE), ("Engagement/profile", 20, GREEN), ("WhatsApp appointment", 30, GOLD), ("Retargeting", 15, BLACK), ("Testing", 5, RED)]
    x = M
    for label, val, col in split:
        w = 720 * val / 100
        c.setFillColor(col)
        c.rect(x, 270, w, 24, fill=1, stroke=0)
        center_text(c, x + w / 2, 277, f"{val}%", 8, colors.white, "Helvetica-Bold")
        x += w
    x = M
    y = 238
    for label, val, col in split:
        c.setFillColor(col)
        c.circle(x + 4, y + 4, 4, fill=1, stroke=0)
        text(c, x + 14, y, label, 8.5, INK)
        x += 145

    rounded(c, M, 78, 360, 120, colors.white, LINE, 10)
    text(c, M + 18, 172, "What we will execute in May", 12, INK, "Helvetica-Bold")
    text(c, M + 18, 148, "We will launch 5-7 new videos, set up WhatsApp quick replies, run weekly popup invitation ads, and retarget all website/IG engagers with appointment-led creative.", 9.5, INK, max_width=322, leading=14)
    rounded(c, M + 392, 78, 360, 120, colors.white, LINE, 10)
    text(c, M + 410, 172, "What we will execute in June", 12, INK, "Helvetica-Bold")
    text(c, M + 410, 148, "We will create a monthly styling event, invite premium micro-communities, run client proof videos, and build a warm audience from all May visitors and message starters.", 9.5, INK, max_width=322, leading=14)
    footer(c)
    c.showPage()


def page7(c):
    header(c, 7, "Content We Need From AGB to Scale Performance")
    rows = [["Content", "Format", "What we need", "How we will use it"]]
    rows.extend([
        ["Founder note", "30-45 sec reel", "Ananya explaining why the popup exists and who it is designed for.", "Trust and warm retargeting"],
        ["Store walkthrough", "15-25 sec reel", "Entrance, rack, mirror, trial-room, styling desk, founder/stylist greeting.", "Popup footfall"],
        ["3 ways to style", "3 reels weekly", "One jacket/waistcoat styled for work, dinner, and occasion.", "Education and saves"],
        ["Fit/fabric closeups", "Macro clips", "Buttons, seams, structure, fall, lining, movement, hand detail.", "Premium justification"],
        ["Real client moments", "UGC/photo/reel", "Clients trying pieces, mirror reactions, approved testimonials.", "Social proof"],
        ["Appointment invite", "Talking-head + B-roll", "Limited styling slots this weekend at Southern Avenue.", "WhatsApp conversion"],
    ])
    table(c, M, PAGE_H - 94, [110, 98, 360, 178], rows)

    section_label(c, M, 118, "Minimum monthly asset bank we need")
    text(c, M, 94, "To scale responsibly, we need 12 reels, 20 short B-roll clips, 12 product photos, 4 founder clips, 4 client/social proof pieces, 2 popup/event invitations, and one monthly offer that is value-led rather than discount-led.", 11, BLACK, "Helvetica-Bold", max_width=740, leading=16)
    footer(c)
    c.showPage()


def page8(c):
    header(c, 8, "Our 60-Day Performance Execution Roadmap")
    rows = [["Week", "What SCG will execute", "Input needed from AGB", "Output"]]
    rows.extend([
        ["May W1", "Build campaign structure, WhatsApp appointment flow, audience buckets, and retargeting pools", "Product focus, store timings, available content assets", "Clean funnel setup"],
        ["May W2", "Launch popup footfall, IG engagement, and WhatsApp appointment campaigns", "Approved videos/photos/reels for popup and styling communication", "Qualified profile visits and messages"],
        ["May W3", "Retarget IG engagers, website visitors, and message starters with store-visit creative", "Weekly store update, best-selling pieces, walk-in feedback", "Higher-intent popup enquiries"],
        ["May W4", "Share monthly performance report with campaign learnings and next action plan", "Walk-ins, trials, sales influenced by ads", "Transparent MoM reporting"],
        ["June W1-W2", "Scale best-performing audiences, creative angles, and lookalike segments", "Fresh content drops and product availability updates", "Lower cost per qualified message"],
        ["June W3-W4", "Run proof-led retargeting using client try-ons, styling moments, and founder-led clips", "Client-approved proof assets and event/popup updates", "More trust and repeat visit intent"],
    ])
    table(c, M, PAGE_H - 96, [78, 310, 232, 132], rows)

    rounded(c, M, 88, 360, 116, SOFT, LINE, 10)
    text(c, M + 18, 178, "Our reporting commitment", 12, GREEN, "Helvetica-Bold")
    text(c, M + 18, 154, "From May onward, we will share monthly reports with spend, reach, profile visits, messages, booked visits, store visits, learnings, and next-month action items.", 9.5, INK, max_width=320, leading=14)

    rounded(c, M + 392, 88, 360, 116, colors.white, LINE, 10)
    text(c, M + 410, 178, "Support needed from AGB", 12, GOLD, "Helvetica-Bold")
    text(c, M + 410, 154, "We need timely content assets, product/store updates, and weekly walk-in/sales feedback. SCG will handle media planning, campaign execution, tracking, optimization, and reporting.", 9.5, INK, max_width=320, leading=14)

    text(c, M, 50, "Final stance: We can make AGB bigger online, but the current path has to be boutique-first, appointment-led, and proof-heavy. Our performance marketing will amplify the store experience, not replace it.", 10, BLACK, "Helvetica-Bold", max_width=740, leading=14)
    footer(c)
    c.showPage()


def build():
    c = canvas.Canvas(str(OUT), pagesize=landscape(A4))
    c.setTitle("Ananya Goenka Bagaria Performance Marketing Report")
    c.setAuthor("Sumvaik Consulting Group")
    for fn in [page1, page2, page3, page4, page5, page6, page7, page8]:
        fn(c)
    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
