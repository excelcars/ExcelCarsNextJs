from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.section import WD_SECTION
from docx.enum.style import WD_STYLE_TYPE
from pathlib import Path

OUT = Path(r"C:\Ruchita\Next\Universe_CC_tool\ExcelCarsNextJs\deliverables\Excel_Cars_Webhook_Integration_Handover.docx")

NAVY = "17365D"
BLUE = "D9EAF7"
PALE = "F4F7FA"
GRID = "D9D9D9"
MUTED = "555555"

def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:fill'), fill)
    tc_pr.append(shd)

def set_cell_margin(cell, top=95, start=120, bottom=95, end=120):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcMar = tcPr.first_child_found_in('w:tcMar')
    if tcMar is None:
        tcMar = OxmlElement('w:tcMar')
        tcPr.append(tcMar)
    for side, value in [('top', top), ('start', start), ('bottom', bottom), ('end', end)]:
        node = tcMar.find(qn(f'w:{side}'))
        if node is None:
            node = OxmlElement(f'w:{side}')
            tcMar.append(node)
        node.set(qn('w:w'), str(value))
        node.set(qn('w:type'), 'dxa')

def set_table_borders(table):
    tblPr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '6')
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), GRID)
        borders.append(el)
    tblPr.append(borders)

def set_repeat_table_header(row):
    trPr = row._tr.get_or_add_trPr()
    tblHeader = OxmlElement('w:tblHeader')
    tblHeader.set(qn('w:val'), 'true')
    trPr.append(tblHeader)

def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'
    table.autofit = False
    set_table_borders(table)
    hdr = table.rows[0]
    set_repeat_table_header(hdr)
    for i, title in enumerate(headers):
        cell = hdr.cells[i]
        if widths: cell.width = Inches(widths[i])
        set_cell_shading(cell, NAVY)
        set_cell_margin(cell)
        cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        r = p.add_run(title)
        r.bold = True; r.font.color.rgb = RGBColor(255,255,255); r.font.size = Pt(9)
    for idx, row in enumerate(rows):
        cells = table.add_row().cells
        for i, val in enumerate(row):
            if widths: cells[i].width = Inches(widths[i])
            if idx % 2 == 1: set_cell_shading(cells[i], PALE)
            set_cell_margin(cells[i])
            cells[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(0)
            p.paragraph_format.line_spacing = 1.05
            r = p.add_run(str(val))
            r.font.size = Pt(9)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table

def add_bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.add_run(item)

def add_code(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Inches(.18)
    p.paragraph_format.right_indent = Inches(.18)
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(7)
    p.paragraph_format.line_spacing = 1.0
    pPr = p._p.get_or_add_pPr()
    shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), 'F2F2F2'); pPr.append(shd)
    r = p.add_run(text)
    r.font.name = 'Consolas'; r._element.rPr.rFonts.set(qn('w:ascii'), 'Consolas'); r._element.rPr.rFonts.set(qn('w:hAnsi'), 'Consolas'); r.font.size = Pt(8.5)

def heading(doc, text, level=1):
    p = doc.add_paragraph(style=f'Heading {level}')
    p.add_run(text)
    return p

def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    sec = doc.sections[0]
    sec.top_margin = Inches(.72); sec.bottom_margin = Inches(.68)
    sec.left_margin = Inches(.75); sec.right_margin = Inches(.75)

    styles = doc.styles
    normal = styles['Normal']; normal.font.name = 'Aptos'; normal._element.rPr.rFonts.set(qn('w:ascii'), 'Aptos'); normal._element.rPr.rFonts.set(qn('w:hAnsi'), 'Aptos'); normal.font.size = Pt(10); normal.font.color.rgb = RGBColor(20,20,20)
    normal.paragraph_format.space_after = Pt(6)
    for name, size in [('Title', 22), ('Heading 1', 14), ('Heading 2', 11)]:
        st = styles[name]; st.font.name = 'Aptos Display' if name == 'Title' else 'Aptos'
        st._element.rPr.rFonts.set(qn('w:ascii'), st.font.name); st._element.rPr.rFonts.set(qn('w:hAnsi'), st.font.name)
        st.font.size = Pt(size); st.font.bold = True; st.font.color.rgb = RGBColor(0,0,0)
    styles['Heading 1'].paragraph_format.space_before = Pt(15); styles['Heading 1'].paragraph_format.space_after = Pt(6)
    styles['Heading 2'].paragraph_format.space_before = Pt(10); styles['Heading 2'].paragraph_format.space_after = Pt(4)

    title = doc.add_paragraph(style='Title'); title.paragraph_format.space_after = Pt(5); title.add_run('Excel Cars Partner Webhook Integration')
    sub = doc.add_paragraph(); sub.paragraph_format.space_after = Pt(14)
    r = sub.add_run('Production handover for Justdial and CarDekho lead delivery'); r.font.size = Pt(12); r.font.color.rgb = RGBColor.from_string(MUTED)
    p = doc.add_paragraph(); p.paragraph_format.space_after = Pt(10)
    p.add_run('Purpose. ').bold = True
    p.add_run('This document provides the production webhook configuration required for Justdial and CarDekho to deliver new customer enquiries directly into the Excel Cars CRM. Both integrations have been tested with the agreed request contracts and return a plain-text SUCCESS acknowledgement after an enquiry is accepted.')

    heading(doc, 'Production endpoints')
    doc.add_paragraph('Please configure the following production URLs in the respective partner portal. The host is the live Excel Cars application.')
    add_table(doc, ['Partner', 'Method', 'Production endpoint', 'Expected acknowledgement'], [
        ['CarDekho', 'POST', 'https://excelcarscrm.karuyaki.com/api/webhooks/cardekho/inquiry', 'HTTP 200 with SUCCESS'],
        ['Justdial', 'GET or POST', 'https://excelcarscrm.karuyaki.com/api/webhooks/justdial/inquiry', 'HTTP 200 with SUCCESS'],
    ], [1.0, .85, 3.85, 1.0])

    heading(doc, 'Authentication')
    doc.add_paragraph('Each partner must use its own shared secret. We will provide the partner-specific secret securely, separately from this document. Do not place the secret in a URL, email subject, or screenshot.')
    add_table(doc, ['Preferred header', 'Value'], [['Authorization', 'Bearer <partner specific webhook secret>'], ['Fallback header', 'X-Webhook-Secret: <partner specific webhook secret>']], [1.65, 5.05])
    doc.add_paragraph('Requests with a missing or incorrect secret are rejected with HTTP 401 and no CRM enquiry is created.')

    heading(doc, 'CarDekho request contract')
    doc.add_paragraph('CarDekho must send a JSON object using POST with Content-Type: application/json. The lead_id must be stable and unique for every lead.')
    add_table(doc, ['Field', 'Required', 'Description'], [
        ['lead_id', 'Yes', 'Unique CarDekho lead identifier. Used to prevent duplicates.'],
        ['buyer_name', 'Yes', 'Customer name.'],
        ['buyer_mobile', 'Yes', 'Indian mobile number. The rightmost 10 digits are stored.'],
        ['mmv', 'Yes', 'Vehicle description or model and variant.'],
        ['mfg_year', 'Yes', 'Vehicle manufacturing year.'],
        ['reg_no', 'No', 'Vehicle registration number, saved in CRM remarks.'],
        ['km_driven', 'No', 'Kilometres driven, saved in CRM remarks.'],
        ['no_of_owners', 'No', 'Whole number, zero or greater.'],
    ], [1.3, .7, 4.7])
    add_code(doc, '{\n  "lead_id": "CDK-20261008-000123",\n  "buyer_name": "Nitin",\n  "buyer_mobile": "8988089080",\n  "mmv": "Suzuki Baleno Delta",\n  "mfg_year": "2025",\n  "reg_no": "HP546543",\n  "km_driven": "250000",\n  "no_of_owners": 1\n}')

    heading(doc, 'Justdial request contract')
    doc.add_paragraph('Justdial may deliver the lead as GET query parameters, or as POST data in application/json, application/x-www-form-urlencoded, or multipart/form-data without file fields. The leadid must be stable and unique for every lead.')
    add_table(doc, ['Field', 'Required', 'Description'], [
        ['leadid', 'Yes', 'Unique Justdial lead identifier. Used to prevent duplicates.'],
        ['name', 'Yes', 'Customer name.'],
        ['mobile', 'Yes', 'Indian mobile number. The rightmost 10 digits are stored.'],
        ['email', 'No', 'Customer email address, if available.'],
        ['date, time', 'No', 'Partner lead date and time retained with the enquiry.'],
        ['category, city, area, pincode', 'No', 'Location and category data retained with the enquiry.'],
        ['company, leadtype, parentid, prefix, phone, dncmobile, dncphone', 'No', 'Additional metadata retained with the enquiry.'],
    ], [1.8, .7, 4.2])
    add_code(doc, 'GET https://excelcarscrm.karuyaki.com/api/webhooks/justdial/inquiry?leadid=JD-12345&name=Ravi%20Kumar&mobile=9876543210&email=ravi@example.com&city=Delhi')

    heading(doc, 'Processing and duplicate handling')
    add_bullets(doc, [
        'Accepted leads are created in the CRM with source CarDekho or Justdial, status Open, and classification Warm.',
        'If a portal-to-employee assignment is configured in the CRM, the new enquiry is assigned to that employee. Otherwise it is created as unassigned.',
        'An existing CRM customer is linked when the mobile number matches; the webhook does not create a customer-master record automatically.',
        'A retried lead with the same lead ID is acknowledged with SUCCESS but does not create a duplicate enquiry.',
        'CarDekho vehicle details are saved with the enquiry. Justdial currently has no required vehicle-detail contract.',
    ])

    heading(doc, 'Response and error expectations')
    add_table(doc, ['Situation', 'HTTP response', 'Meaning'], [
        ['Lead accepted or duplicate retry', '200 SUCCESS', 'Delivery completed. No retry is needed.'],
        ['Invalid or incomplete data', '422 JSON error', 'Correct the payload and resend with the same lead ID.'],
        ['Missing or invalid authentication', '401 JSON error', 'Confirm the supplied shared secret and header format.'],
        ['Unsupported content type', '415 JSON error', 'Use the format listed for the partner route.'],
        ['Partner source is inactive or missing', '409 JSON error', 'Contact Excel Cars before sending further leads.'],
        ['Temporary server issue', '500 JSON error', 'Retry later using the same lead ID.'],
    ], [2.25, 1.25, 3.2])

    heading(doc, 'Go live checklist')
    add_bullets(doc, [
        'Excel Cars shares the correct partner-specific webhook secret through a secure channel.',
        'Partner configures the production endpoint, method, authentication header, and content type shown above.',
        'Partner sends one approved live or sandbox test lead.',
        'Excel Cars confirms the enquiry appears with the correct source, customer details, and assigned owner where configured.',
        'Partner confirms it received HTTP 200 and SUCCESS, then enables normal live lead delivery.',
    ])

    heading(doc, 'Support information')
    doc.add_paragraph('For onboarding or delivery issues, share the partner name, lead ID, date and time of the request, HTTP status, and response body. Please do not include the shared secret in any support message.')

    footer = sec.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rr = footer.add_run('Excel Cars | Partner Webhook Integration Handover')
    rr.font.size = Pt(8); rr.font.color.rgb = RGBColor.from_string(MUTED)
    doc.core_properties.title = 'Excel Cars Partner Webhook Integration'
    doc.core_properties.subject = 'Production webhook handover for Justdial and CarDekho'
    doc.core_properties.author = 'Excel Cars'
    doc.save(OUT)
    print(OUT)

if __name__ == '__main__': main()
