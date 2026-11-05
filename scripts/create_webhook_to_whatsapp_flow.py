from pathlib import Path
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

OUT = Path(r"C:\Ruchita\Next\Universe_CC_tool\ExcelCarsNextJs\deliverables\Excel_Cars_Webhook_to_WhatsApp_Business_Flow.docx")
NAVY, BLUE, GREEN, ORANGE, RED, PALE, GRID, MUTED = '17365D', 'D9EAF7', 'E2F0D9', 'FCE4D6', 'FDE9E7', 'F6F8FA', 'D9D9D9', '555555'

def shade(cell, color):
    props=cell._tc.get_or_add_tcPr(); node=OxmlElement('w:shd'); node.set(qn('w:fill'),color); props.append(node)

def border(table):
    props=table._tbl.tblPr; node=OxmlElement('w:tblBorders')
    for edge in ('top','left','bottom','right','insideH','insideV'):
        part=OxmlElement(f'w:{edge}'); part.set(qn('w:val'),'single'); part.set(qn('w:sz'),'8'); part.set(qn('w:color'),GRID); node.append(part)
    props.append(node)

def margin(cell, v=130, h=150):
    props=cell._tc.get_or_add_tcPr(); node=OxmlElement('w:tcMar'); props.append(node)
    for side,value in [('top',v),('bottom',v),('start',h),('end',h)]:
        p=OxmlElement(f'w:{side}'); p.set(qn('w:w'),str(value)); p.set(qn('w:type'),'dxa'); node.append(p)

def box(doc, text, color=BLUE, width=5.5):
    t=doc.add_table(rows=1,cols=1); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False; border(t)
    c=t.cell(0,0); c.width=Inches(width); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; shade(c,color); margin(c)
    p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.05
    r=p.add_run(text); r.bold=True; r.font.size=Pt(10)

def arrow(doc, label='Then'):
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(2); p.paragraph_format.space_after=Pt(2)
    r=p.add_run('v  ' + label); r.font.size=Pt(9); r.font.color.rgb=RGBColor.from_string(MUTED)

def table(doc, headers, rows, widths):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False; t.style='Table Grid'; border(t)
    for i,head in enumerate(headers):
        c=t.rows[0].cells[i]; c.width=Inches(widths[i]); shade(c,NAVY); margin(c,100,120)
        p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); r=p.add_run(head); r.bold=True; r.font.color.rgb=RGBColor(255,255,255); r.font.size=Pt(9)
    for i,row in enumerate(rows):
        cells=t.add_row().cells
        for j,value in enumerate(row):
            c=cells[j]; c.width=Inches(widths[j]); margin(c,100,120); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if i%2: shade(c,PALE)
            p=c.paragraphs[0]; p.paragraph_format.space_after=Pt(0); r=p.add_run(value); r.font.size=Pt(9)
    doc.add_paragraph().paragraph_format.space_after=Pt(2)

def bullet(doc, items):
    for text in items:
        p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(3); p.add_run(text)

def h(doc,text,level=1):
    p=doc.add_paragraph(style=f'Heading {level}'); p.add_run(text)

def main():
    OUT.parent.mkdir(parents=True,exist_ok=True)
    d=Document(); s=d.sections[0]; s.top_margin=Inches(.68); s.bottom_margin=Inches(.65); s.left_margin=Inches(.75); s.right_margin=Inches(.75)
    normal=d.styles['Normal']; normal.font.name='Aptos'; normal._element.rPr.rFonts.set(qn('w:ascii'),'Aptos'); normal._element.rPr.rFonts.set(qn('w:hAnsi'),'Aptos'); normal.font.size=Pt(10); normal.paragraph_format.space_after=Pt(6)
    for name,size in [('Title',22),('Heading 1',14),('Heading 2',11)]:
        st=d.styles[name]; st.font.name='Aptos Display' if name=='Title' else 'Aptos'; st._element.rPr.rFonts.set(qn('w:ascii'),st.font.name); st._element.rPr.rFonts.set(qn('w:hAnsi'),st.font.name); st.font.size=Pt(size); st.font.bold=True; st.font.color.rgb=RGBColor(0,0,0)
    d.styles['Heading 1'].paragraph_format.space_before=Pt(14); d.styles['Heading 1'].paragraph_format.space_after=Pt(6)
    title=d.add_paragraph(style='Title'); title.paragraph_format.space_after=Pt(5); title.add_run('Webhook to WhatsApp Customer Journey')
    sub=d.add_paragraph(); sub.paragraph_format.space_after=Pt(13); r=sub.add_run('A simple explanation of how an online lead becomes a customer WhatsApp message'); r.font.size=Pt(12); r.font.color.rgb=RGBColor.from_string(MUTED)
    p=d.add_paragraph(); p.add_run('What this means. ').bold=True; p.add_run('After a customer enquiry is created, WhatsApp automation checks for the requested vehicle. If an exact vehicle is in stock, the customer receives the inventory message. If it is not in stock, the customer receives the normal no-inventory message.')
    h(d,'Customer journey flowchart')
    box(d,'A customer sends an enquiry on CarDekho or Justdial',BLUE); arrow(d,'Partner sends the lead securely')
    box(d,'Excel Cars webhook receives and validates the lead',BLUE); arrow(d,'Valid lead is saved')
    box(d,'A new enquiry appears in the Excel Cars CRM',GREEN); arrow(d,'Vehicle requirement is checked')
    box(d,'Does the enquiry include a clear vehicle requirement?',ORANGE)
    branch=d.add_table(rows=2,cols=2); branch.alignment=WD_TABLE_ALIGNMENT.CENTER; branch.autofit=False; border(branch)
    for i,w in enumerate([3.2,3.2]):
        branch.cell(0,i).width=Inches(w); branch.cell(1,i).width=Inches(w)
    for c,label,color in [(branch.cell(0,0),'No or unclear',RED),(branch.cell(0,1),'Yes',GREEN)]:
        shade(c,color); margin(c); p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0); p.add_run(label).bold=True
    for c,text in [(branch.cell(1,0),'Sales team confirms the customer vehicle requirement, then checks stock.'),(branch.cell(1,1),'CRM checks for an exact in-stock vehicle match.')]:
        shade(c,PALE); margin(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0); p.add_run(text).font.size=Pt(9)
    arrow(d,'After the vehicle requirement is known')
    box(d,'Is there one exact matching vehicle in stock?',ORANGE)
    outcome=d.add_table(rows=2,cols=2); outcome.alignment=WD_TABLE_ALIGNMENT.CENTER; outcome.autofit=False; border(outcome)
    for i,w in enumerate([3.2,3.2]): outcome.cell(0,i).width=Inches(w); outcome.cell(1,i).width=Inches(w)
    for c,label,color in [(outcome.cell(0,0),'Yes - matching vehicle found',GREEN),(outcome.cell(0,1),'No - no exact match',RED)]:
        shade(c,color); margin(c); p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0); p.add_run(label).bold=True
    left='WhatsApp automation sends the inventory message with the vehicle name and a link to view it.'
    right='WhatsApp automation sends the normal no-inventory message.'
    for c,text in [(outcome.cell(1,0),left),(outcome.cell(1,1),right)]:
        shade(c,PALE); margin(c); c.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; p=c.paragraphs[0]; p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_after=Pt(0); p.add_run(text).font.size=Pt(9)
    arrow(d,'Meta accepts the WhatsApp send request')
    box(d,'The assigned sales employee follows up with the customer',GREEN)
    h(d,'What the customer receives')
    table(d,['When','Customer message'],[['Exact vehicle is available','Inventory WhatsApp message: vehicle name and a direct vehicle-view link.'],['No exact vehicle is available','Normal no-inventory WhatsApp message.'],['Vehicle preference is missing or unclear','No automatic vehicle message until the sales team confirms the required vehicle.']],[2.15,4.25])
    h(d,'Important notes for the team')
    bullet(d,['The webhook first confirms that the partner lead is genuine and saves the enquiry in the CRM.','A WhatsApp message can be submitted only when the customer has a valid mobile number and the WhatsApp configuration is active.','Submitted means Meta accepted the send request. It is not the same as confirmation that the customer opened or read the message.','For the partner webhook routes currently deployed, the lead is saved in the CRM. The inventory-check and WhatsApp automation must be linked to the partner-webhook creation path before this full automatic journey runs without staff intervention.'])
    h(d,'Simple team checklist')
    bullet(d,['Check that the enquiry contains the correct mobile number and vehicle preference.','Confirm that the customer receives the appropriate message.','Follow up personally after the message is submitted.','If no vehicle matches, record the customer requirement and contact them when suitable stock becomes available.'])
    footer=s.footer.paragraphs[0]; footer.alignment=WD_ALIGN_PARAGRAPH.CENTER; rr=footer.add_run('Excel Cars | Webhook to WhatsApp Customer Journey'); rr.font.size=Pt(8); rr.font.color.rgb=RGBColor.from_string(MUTED)
    d.core_properties.title='Excel Cars Webhook to WhatsApp Customer Journey'; d.core_properties.author='Excel Cars'; d.core_properties.subject='Nontechnical business flow for partner webhooks and WhatsApp messages'
    d.save(OUT); print(OUT)

if __name__=='__main__': main()
