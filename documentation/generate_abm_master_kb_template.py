from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape


OUTPUT = Path(__file__).with_name("ABM_Groups_Master_Knowledge_Base_Template.docx")


def p(text="", style=None):
    style_xml = f'<w:pStyle w:val="{style}"/>' if style else ""
    lines = str(text).split("\n")
    runs = []
    for index, line in enumerate(lines):
        if index:
            runs.append("<w:r><w:br/></w:r>")
        runs.append(f'<w:r><w:t xml:space="preserve">{escape(line)}</w:t></w:r>')
    return f"<w:p><w:pPr>{style_xml}</w:pPr>{''.join(runs)}</w:p>"


def field(label, value="[Enter confirmed information]"):
    return p(f"{label}: {value}")


parts = []
parts += [
    p("ABM Groups — Master Knowledge Base Template", "Title"),
    p("For the shared WhatsApp assistant and LeadOS AI Brain", "Subtitle"),
    field("Last Updated", "YYYY-MM-DD"),
    field("Content Owner"),
    field("Approved By"),
    p("How to use this document", "Heading1"),
    p("Complete one independent offering record for every course tier, service plan, vacancy, property, travel package, catering package, education service, or foundation program. Duplicate the relevant offering template as many times as needed."),
    p("Data-entry rules", "Heading2"),
    p("• Never combine multiple brands, offerings, tiers, plans, vacancies, properties, or packages in one record.\n• Use a stable lowercase ID with hyphens.\n• Enter needs_confirmation when information is unknown.\n• Enter not_applicable when a field does not apply.\n• Do not use probably, approximately, or likely unless the customer may explicitly be told it is an estimate.\n• Preserve approved prices, phone numbers, URLs, dates, guarantees, and policy conditions exactly.\n• Never promise availability, booking, placement, refund, delivery, or results unless the relevant workflow and conditions support the claim."),
    p("Controlled values", "Heading2"),
    p("Status: active | inactive | upcoming\nData Status: confirmed | needs_confirmation\nPrice Type: fixed | starting_from | custom_quote | free\nAvailability: available | reserved | sold | unavailable | needs_confirmation"),
    p("1. Global brand routing", "Heading1"),
    p("Complete the signals with the words customers actually use. Brand detection must happen before offering detection."),
]

brands = [
    ("bm-academy", "BM Academy", "course, class, learn, training, syllabus, fees, batch, placement, certification"),
    ("bm-techx", "BM TechX", "marketing service, agency, ads for business, leads, website, SEO service, branding"),
    ("coretalents", "CoreTalents", "hiring, recruitment, staff, candidate, vacancy, resume, campus drive"),
    ("namma-pondy-properties", "Namma Pondy Properties", "property, plot, villa, land, patta, EC, square feet, site visit"),
    ("travellersneed", "TravellersNeed", "trip, tour, package, travel, holiday, industrial visit, IV trip"),
    ("dadas-kitchen", "Dada's Kitchen", "catering, food order, wedding food, event food, menu"),
    ("educonsultants", "EduConsultants", "study abroad, university, admission, visa, IELTS, overseas education"),
    ("bm-foundation", "BM Foundation", "donation, NGO, charity, volunteer, CSR, sponsorship"),
]

for brand_id, name, signals in brands:
    parts += [
        p(name, "Heading2"),
        field("Brand ID", brand_id),
        field("Brand Name", name),
        field("Routing Signals", signals),
        field("Ambiguous Terms"),
        field("Offering Types"),
    ]

parts += [
    field("Global ambiguous-brand response", "Which service are you interested in—courses, business marketing, recruitment, property, travel, catering, overseas education, or foundation activities?"),
    p("2. Brand profile template", "Heading1"),
    p("Create one completed copy of this section for each of the eight brands."),
]

for label in ["Brand ID", "Brand Name", "Status", "Data Status", "Description", "Primary Phone", "Secondary Phone", "Email", "Website", "Address", "Business Hours", "Supported Languages", "Primary CTA", "Escalation Contact Name", "Escalation Contact Phone", "Last Verified"]:
    parts.append(field(label))

parts += [
    p("3. Universal offering record", "Heading1"),
    p("Place this identity block at the start of every offering, followed by the matching brand-specific detail block in sections 4–11."),
]

universal_fields = [
    "Brand ID", "Offering ID", "Offering Name", "Parent Offering ID", "Offering Type",
    "Category", "Variant or Tier", "Status", "Data Status", "Last Verified",
    "Aliases (one per line)", "Short Description", "Suitable For", "Features",
    "Benefits", "Price Amount", "Currency", "Price Type", "Taxes Included",
    "Registration or Setup Fee", "EMI Available", "EMI Details", "Current Offer",
    "Offer Valid Until", "Availability", "Start Date", "End Date", "Capacity",
    "Schedule", "Delivery Mode", "Address", "Service Area", "Deliverables",
    "Eligibility or Requirements", "Cancellation Policy", "Refund Policy",
    "Rescheduling Policy", "Terms and Conditions", "Primary URL", "Brochure URL",
    "Booking URL", "Contact Person", "Contact Phone", "Contact Email",
    "Response CTA", "Missing Information Response",
]
for label in universal_fields:
    parts.append(field(label))


def add_template(title, intro, fields):
    parts.append(p(title, "Heading1"))
    parts.append(p(intro))
    for label in fields:
        parts.append(field(label))
    parts.append(p("Frequently Asked Questions", "Heading2"))
    for number in range(1, 6):
        parts.append(field(f"Question {number}"))
        parts.append(field(f"Answer {number}"))


add_template("4. BM Academy course template", "Use one complete record per tier. Tier 1 and Tier 2 must be separate offerings.", [
    "Duration", "Training Hours", "Class Mode", "Class Location", "Batch Schedule",
    "Next Batch Date", "Curriculum Modules", "Projects", "Tools and Technologies",
    "Certification Available", "Certificate Details", "Career Roles", "Career Assistance",
    "Resume Support", "Portfolio Support", "Placement Support", "Placement Guarantee",
    "Mock Interviews", "Priority Drives", "Placement Refund Available",
    "Placement Refund Amount", "Placement Refund Waiting Period",
    "Placement Refund Eligibility Conditions", "Enrollment Refund Policy", "Syllabus URL",
])

add_template("5. BM TechX service template", "Use one record per service plan or package.", [
    "Service Scope", "Included Work", "Excluded Work", "One-time Setup Fee", "Monthly Fee",
    "Minimum Commitment", "Deliverables Per Month", "Supported Platforms",
    "Reporting Frequency", "Setup Timeline", "Expected Delivery Timeline",
    "Results Guarantee", "Client Requirements", "Account Access Required",
    "Ad Spend Included", "Revision Policy",
])

add_template("6. CoreTalents recruitment or vacancy template", "Use separate records for employer services and individual vacancies.", [
    "Customer Type", "Job Title", "Employer Name Sharing Permission", "Industry", "Job Location",
    "Employment Type", "Experience Required", "Education Required", "Skills Required",
    "Salary Range", "Number of Openings", "Candidate Fee", "Employer Fee",
    "Hiring Timeline", "Application Process", "Required Documents", "Application URL",
    "Application Deadline", "Vacancy Expiry", "Interview Stages",
])

add_template("7. Namma Pondy Properties listing template", "Use one record for every property listing. Never reuse facts from another property.", [
    "Property ID", "Property Type", "Property Availability", "Exact Location", "Landmark",
    "Map URL", "Area", "Area Unit", "Total Price", "Price Per Square Foot", "Negotiable",
    "Ownership Details", "Patta Status", "EC Status", "Approval Details", "Road Width",
    "Facing", "Amenities", "Loan Available", "Photos URL", "Video URL",
    "Site Visit Available", "Site Visit Contact", "Booking Advance",
])

add_template("8. TravellersNeed package template", "Use one record per destination and package variant.", [
    "Package ID", "Destination", "Origin or Pickup Location", "Duration", "Package Type",
    "Minimum Travellers", "Maximum Travellers", "Price Per Person", "Group Price",
    "Transport", "Accommodation", "Room Sharing", "Meals Included", "Day-wise Itinerary",
    "Included Items", "Excluded Items", "Available Dates", "Booking Advance",
    "Cancellation Deadline", "Required Traveller Details", "Emergency Contact",
])

add_template("9. Dada's Kitchen catering template", "Use one record per catering or menu package.", [
    "Package ID", "Cuisine", "Meal Type", "Event Type", "Minimum Guests", "Maximum Guests",
    "Price Per Person", "Setup Charge", "Delivery Charge", "Menu Items",
    "Vegetarian Available", "Non-Vegetarian Available", "Custom Menu Available",
    "Serving Staff Included", "Plates and Equipment Included", "Advance Required",
    "Order Deadline", "Service Location", "Tasting Available", "Food Allergy Handling",
])

add_template("10. EduConsultants service template", "Use one record per country, study level, intake, or service package where details differ.", [
    "Destination Country", "Study Level", "Course Area", "Intake", "Universities",
    "Academic Eligibility", "English Test", "Minimum Score", "Tuition Fee Range",
    "Application Fee", "Consultancy Fee", "Scholarship Available", "Scholarship Conditions",
    "Visa Support", "Accommodation Support", "Education Loan Support", "Required Documents",
    "Application Deadline", "Expected Processing Time", "Offer Letter Conditions",
])

add_template("11. BM Foundation program template", "Use one record per donation, volunteering, CSR, or sponsorship program.", [
    "Program Type", "Cause", "Program Description", "Beneficiaries", "Program Location",
    "Start Date", "End Date", "Donation Amount", "Donation Methods", "Bank or Payment Details",
    "Tax Exemption Available", "Receipt Available", "Volunteer Eligibility", "Volunteer Schedule",
    "CSR Collaboration Available", "CSR Requirements", "Sponsorship Options",
    "Registration URL", "Donation URL", "Impact Reporting",
])

parts += [
    p("12. Shared policy template", "Heading1"),
    field("Brand ID"), field("Policy ID"), field("Policy Name"), field("Applies To Offering IDs"),
    field("Policy Status"), field("Effective From"), field("Conditions"), field("Exceptions"),
    field("Required Customer Response"), field("Prohibited Claims"), field("Escalation Contact"),
    p("13. Comparison template", "Heading1"),
    field("Brand ID"), field("Comparison ID"), field("Offering IDs Being Compared"),
    field("Price Comparison"), field("Duration Comparison"), field("Feature Comparison"),
    field("Benefits Comparison"), field("Limitations Comparison"), field("Recommended For"),
    p("14. Final validation checklist", "Heading1"),
    p("☐ Every record has a Brand ID.\n☐ Every offering has a unique Offering ID.\n☐ Each tier, plan, vacancy, property and package has its own record.\n☐ Prices and URLs were verified.\n☐ Unknown information says needs_confirmation.\n☐ Refund and guarantee statements include every condition.\n☐ Expired offerings are marked inactive.\n☐ Internal notes are not written as customer facts.\n☐ Each offering includes aliases customers may type.\n☐ A responsible person approved the final content."),
]

body = "".join(parts)
document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>{body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body>
</w:document>'''

styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/></w:rPr><w:pPr><w:spacing w:after="120"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:color w:val="1F4E78"/><w:sz w:val="36"/></w:rPr><w:pPr><w:spacing w:after="240"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:i/><w:color w:val="666666"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:color w:val="1F4E78"/><w:sz w:val="30"/></w:rPr><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="140"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:rPr><w:b/><w:color w:val="2F75B5"/><w:sz w:val="26"/></w:rPr><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100"/></w:pPr></w:style>
</w:styles>'''

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''

document_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''

with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
    archive.writestr("[Content_Types].xml", content_types)
    archive.writestr("_rels/.rels", rels)
    archive.writestr("word/document.xml", document_xml)
    archive.writestr("word/styles.xml", styles_xml)
    archive.writestr("word/_rels/document.xml.rels", document_rels)

print(OUTPUT)
