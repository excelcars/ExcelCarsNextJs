from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(r"C:\Ruchita\Next\Universe_CC_tool\ExcelCarsNextJs\deliverables")
NAVY, PALE, GRID, MUTED = '17365D', 'F4F7FA', 'D9D9D9', '555555'

def shade(cell, color):
    props = cell._tc.get_or_add_tcPr(); node = OxmlElement('w:shd'); node.set(qn('w:fill'), color); props.append(node)

def margin(cell):
    props = cell._tc.get_or_add_tcPr(); node = OxmlElement('w:tcMar'); props.append(node)
    for side in ('top', 'start', 'bottom', 'end'):
        part = OxmlElement(f'w:{side}'); part.set(qn('w:w'), '110'); part.set(qn('w:type'), 'dxa'); node.append(part)

def border(table):
    props = table._tbl.tblPr; node = OxmlElement('w:tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        part = OxmlElement(f'w:{edge}'); part.set(qn('w:val'),'single'); part.set(qn('w:sz'),'6'); part.set(qn('w:color'),GRID); node.append(part)
    props.append(node)

def table(doc, headers, rows, widths):
    t = doc.add_table(rows=1, cols=len(headers)); t.alignment = WD_TABLE_ALIGNMENT.CENTER; t.autofit = False; t.style = 'Table Grid'; border(t)
    for i, text in enumerate(headers):
        c=t.rows[0].cells[i]; c.width=Inches(widths[i]); shade(c,NAVY); margin(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
        r=c.paragraphs[0].add_run(text); r.bold=True; r.font.color.rgb=RGBColor(255,255,255); r.font.size=Pt(9)
    for n,row in enumerate(rows):
        cells=t.add_row().cells
        for i,value in enumerate(row):
            c=cells[i]; c.width=Inches(widths[i]); margin(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if n%2: shade(c,PALE)
            p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.05
            r=p.add_run(str(value)); r.font.size=Pt(9)
    doc.add_paragraph().paragraph_format.space_after=Pt(1)

def bullet(doc, items):
    for text in items:
        p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(3); p.add_run(text)

def code(doc, text):
    p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.16); p.paragraph_format.right_indent=Inches(.16); p.paragraph_format.space_after=Pt(7); p.paragraph_format.line_spacing=1.0
    props=p._p.get_or_add_pPr(); node=OxmlElement('w:shd'); node.set(qn('w:fill'),'F2F2F2'); props.append(node)
    r=p.add_run(text); r.font.name='Consolas'; r._element.rPr.rFonts.set(qn('w:ascii'),'Consolas'); r._element.rPr.rFonts.set(qn('w:hAnsi'),'Consolas'); r.font.size=Pt(8.5)

def h(doc, text, level=1):
    p=doc.add_paragraph(style=f'Heading {level}'); p.add_run(text)

def base(title, subtitle):
    d=Document(); s=d.sections[0]; s.top_margin=Inches(.72); s.bottom_margin=Inches(.68); s.left_margin=Inches(.75); s.right_margin=Inches(.75)
    normal=d.styles['Normal']; normal.font.name='Aptos'; normal._element.rPr.rFonts.set(qn('w:ascii'),'Aptos'); normal._element.rPr.rFonts.set(qn('w:hAnsi'),'Aptos'); normal.font.size=Pt(10); normal.paragraph_format.space_after=Pt(6)
    for name,size in [('Title',22),('Heading 1',14),('Heading 2',11)]:
        st=d.styles[name]; st.font.name='Aptos Display' if name=='Title' else 'Aptos'; st._element.rPr.rFonts.set(qn('w:ascii'),st.font.name); st._element.rPr.rFonts.set(qn('w:hAnsi'),st.font.name); st.font.size=Pt(size); st.font.bold=True; st.font.color.rgb=RGBColor(0,0,0)
    d.styles['Heading 1'].paragraph_format.space_before=Pt(15); d.styles['Heading 1'].paragraph_format.space_after=Pt(6)
    d.styles['Heading 2'].paragraph_format.space_before=Pt(10); d.styles['Heading 2'].paragraph_format.space_after=Pt(4)
    p=d.add_paragraph(style='Title'); p.paragraph_format.space_after=Pt(5); p.add_run(title)
    p=d.add_paragraph(); p.paragraph_format.space_after=Pt(14); r=p.add_run(subtitle); r.font.size=Pt(12); r.font.color.rgb=RGBColor.from_string(MUTED)
    return d

def finish(doc, filename, subject):
    f=doc.sections[0].footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.CENTER; r=f.add_run('Excel Cars | Partner Webhook Integration Handover'); r.font.size=Pt(8); r.font.color.rgb=RGBColor.from_string(MUTED)
    doc.core_properties.title=subject; doc.core_properties.author='Excel Cars'; doc.core_properties.subject=subject
    doc.save(OUT/filename)

def cardekho():
    d=base('Excel Cars CarDekho Webhook Integration','Production handover for CarDekho lead delivery')
    p=d.add_paragraph(); p.add_run('Purpose. ').bold=True; p.add_run('Configure CarDekho to send sales enquiries directly to the Excel Cars CRM. The endpoint returns plain-text SUCCESS only after the lead has been accepted.')
    h(d,'Production endpoint')
    table(d,['Method','Production endpoint','Success acknowledgement'],[['POST','https://excelcarscrm.karuyaki.com/api/webhooks/cardekho/inquiry','HTTP 200 with SUCCESS']],[.8,4.7,1.0])
    h(d,'Authentication')
    d.add_paragraph('Use the CarDekho shared secret provided separately by Excel Cars. Do not place the secret in a URL, email subject, or screenshot.')
    table(d,['Header','Value'],[['Authorization','Bearer <CarDekho webhook secret>'],['Fallback header','X-Webhook-Secret: <CarDekho webhook secret>']],[1.65,5.05])
    h(d,'Request requirements')
    d.add_paragraph('Send a JSON object with Content-Type: application/json. The lead_id must be stable and unique for every lead; it is used to prevent duplicates.')
    table(d,['Field','Required','Rule'],[
        ['lead_id','Yes','Stable unique lead identifier.'],['buyer_name','Yes','Non-empty customer name.'],['buyer_mobile','Yes','Valid Indian mobile number; rightmost 10 digits are stored.'],['mmv','Yes','Vehicle description or model and variant.'],['mfg_year','Yes','Whole year from 1900 through next calendar year.'],['reg_no','No','Stored in CRM remarks.'],['km_driven','No','Stored in CRM remarks.'],['no_of_owners','No','Whole number, zero or greater.'],
    ],[1.35,.7,4.65])
    code(d,'{\n  "lead_id": "CDK-20261008-000123",\n  "buyer_name": "Nitin",\n  "buyer_mobile": "8988089080",\n  "mmv": "Suzuki Baleno Delta",\n  "mfg_year": "2025",\n  "reg_no": "HP546543",\n  "km_driven": "250000",\n  "no_of_owners": 1\n}')
    h(d,'Processing and responses')
    bullet(d,['Accepted leads are created with source CarDekho, status Open, and classification Warm.','A configured portal assignment sends the new enquiry to the mapped CRM employee; otherwise it remains unassigned.','A retry with the same lead_id returns SUCCESS and does not create a second enquiry.'])
    table(d,['Situation','Response','Action'],[['Accepted lead or duplicate retry','200 SUCCESS','Delivery complete. Do not retry.'],['Invalid JSON or fields','422 JSON error','Correct the request and resend.'],['Missing or invalid secret','401 JSON error','Confirm the secret and header.'],['Non-JSON content type','415 JSON error','Use application/json.'],['Source inactive or missing','409 JSON error','Contact Excel Cars.'],['Temporary server issue','500 JSON error','Retry later with the same lead_id.']],[2.05,1.3,3.35])
    h(d,'Go live checklist')
    bullet(d,['Excel Cars shares the CarDekho secret securely.','CarDekho configures the endpoint, POST method, authentication, and JSON content type.','CarDekho sends one approved test lead.','Excel Cars confirms the enquiry and assigned owner, where applicable.','After HTTP 200 SUCCESS is confirmed, enable normal live lead delivery.'])
    h(d,'Support')
    d.add_paragraph('For support, share the lead_id, request date and time, HTTP status, and response body. Never include the shared secret.')
    finish(d,'Excel_Cars_CarDekho_Webhook_Handover.docx','Excel Cars CarDekho Webhook Integration')

def justdial():
    d=base('Excel Cars Justdial Webhook Integration','Production handover for Justdial lead delivery')
    p=d.add_paragraph(); p.add_run('Purpose. ').bold=True; p.add_run('Configure Justdial to send sales enquiries directly to the Excel Cars CRM. The endpoint returns plain-text SUCCESS only after the lead has been accepted.')
    h(d,'Production endpoint')
    table(d,['Method','Production endpoint','Success acknowledgement'],[['GET or POST','https://excelcarscrm.karuyaki.com/api/webhooks/justdial/inquiry','HTTP 200 with SUCCESS']],[.9,4.6,1.0])
    h(d,'Authentication')
    d.add_paragraph('Use the Justdial shared secret provided separately by Excel Cars. Do not place the secret in a URL, email subject, or screenshot.')
    table(d,['Header','Value'],[['Authorization','Bearer <Justdial webhook secret>'],['Fallback header','X-Webhook-Secret: <Justdial webhook secret>']],[1.65,5.05])
    h(d,'Request requirements')
    d.add_paragraph('Use GET query parameters, or POST data in application/json, application/x-www-form-urlencoded, or multipart/form-data without file fields. The leadid must be stable and unique for every lead; it is used to prevent duplicates.')
    table(d,['Field','Required','Rule'],[
        ['leadid','Yes','Stable unique lead identifier.'],['name','Yes','Non-empty customer name.'],['mobile','Yes','Valid Indian mobile number; rightmost 10 digits are stored.'],['email','No','Must be a valid email address when supplied.'],['date, time','No','Stored as partner lead metadata.'],['category, city, area, pincode','No','Stored as partner lead metadata.'],['company, leadtype, parentid, prefix, phone, dncmobile, dncphone','No','Stored as partner lead metadata.'],
    ],[1.85,.7,4.15])
    code(d,'GET https://excelcarscrm.karuyaki.com/api/webhooks/justdial/inquiry?leadid=JD-12345&name=Ravi%20Kumar&mobile=9876543210&email=ravi@example.com&city=Delhi')
    h(d,'Processing and responses')
    bullet(d,['Accepted leads are created with source Justdial, status Open, and classification Warm.','A configured portal assignment sends the new enquiry to the mapped CRM employee; otherwise it remains unassigned.','A retry with the same leadid returns SUCCESS and does not create a second enquiry.','Vehicle details are not required in the current Justdial contract.'])
    table(d,['Situation','Response','Action'],[['Accepted lead or duplicate retry','200 SUCCESS','Delivery complete. Do not retry.'],['Invalid JSON or fields','422 JSON error','Correct the request and resend.'],['Missing or invalid secret','401 JSON error','Confirm the secret and header.'],['Unsupported content type','415 JSON error','Use a supported format.'],['Source inactive or missing','409 JSON error','Contact Excel Cars.'],['Temporary server issue','500 JSON error','Retry later with the same leadid.']],[2.05,1.3,3.35])
    h(d,'Go live checklist')
    bullet(d,['Excel Cars shares the Justdial secret securely.','Justdial configures the endpoint, method, authentication, and chosen content type.','Justdial sends one approved test lead.','Excel Cars confirms the enquiry and assigned owner, where applicable.','After HTTP 200 SUCCESS is confirmed, enable normal live lead delivery.'])
    h(d,'Support')
    d.add_paragraph('For support, share the leadid, request date and time, HTTP status, and response body. Never include the shared secret.')
    finish(d,'Excel_Cars_Justdial_Webhook_Handover.docx','Excel Cars Justdial Webhook Integration')

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True); cardekho(); justdial(); print(OUT/'Excel_Cars_CarDekho_Webhook_Handover.docx'); print(OUT/'Excel_Cars_Justdial_Webhook_Handover.docx')
