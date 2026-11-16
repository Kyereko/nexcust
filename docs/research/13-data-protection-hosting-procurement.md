> Prototype research — not an official publication of the Ghana Police Service or Ghana Prisons Service.

# 13 — Data protection, cybersecurity, hosting and procurement

Research date and access date for every source: **16 November 2026**. Status key as in 01. This is research, not legal advice; every item marked for counsel must be confirmed by a Ghanaian lawyer before any deployment that touches real data. Builds on 06 (LEG-024 to LEG-026, LEG-030).

## 0. Sources and access

| Key | Source | Access result |
|---|---|---|
| A843 | Data Protection Act, 2012 (Act 843), official PDF from the Data Protection Commission, https://dpc.gov.gh/wp-content/uploads/2025/05/Data-Protection-Act-2012-Act-843.pdf | Opened; full text read for the sections cited |
| DPC | Data Protection Commission pages: https://dpc.gov.gh/registration/ , https://dpc.gov.gh/compliance/ , https://dpc.gov.gh/help-faqs/ , https://dpc.gov.gh/for-organisations/ | Opened. The old domain dataprotection.org.gh shows a maintenance notice pointing to dpc.gov.gh |
| A1038 | Cybersecurity Act, 2020 (Act 1038), GhaLII search excerpts, https://ghalii.org/akn/gh/act/2020/1038/eng@2020-12-29 | Excerpts only |
| CSA | Cyber Security Authority, csa.gov.gh (CII page, Directive PDF) | **Blocked** (connection reset / HTTP 503 on every attempt) |
| DPA-ALERT | Digital Policy Alert entry on the CSA CII Directive, https://digitalpolicyalert.org/event/24785-... | Opened (secondary; body partly behind sign-in) |
| A772 | Electronic Transactions Act, 2008 (Act 772) s.56, GhaLII search excerpt | Excerpt read |
| NITA | NITA Data Centre page, https://nita.gov.gh/initiatives/data-centre | Opened |
| MOC-24 | myjoyonline, "Government works to host all data centres locally", https://www.myjoyonline.com/government-works-to-host-all-data-centres-locally/ (22 Feb 2024); African Eye Report on the draft framework, https://africaneyereport.com/ghana-stakeholders-deliberate-on-draft-data-centre-and-cloud-services-regulatory-framework/ (22 Feb 2024) | Opened (press). moc.gov.gh copy: HTTP 503 |
| A663 | Public Procurement Act, 2003 (Act 663), PPA PDF, https://ppa.gov.gh/wp-content/uploads/2019/01/Public-Procurement-Act-2003-Act-663.pdf | Opened (original 2003 text) |
| A914 | Public Procurement (Amendment) Act, 2016 reprint, https://ppa.gov.gh/wp-content/uploads/2019/01/Public-Procurement-Amendment-Act-2016-ACT663_RePrinted.pdf | Downloaded but it is a scanned image with no text layer; **not read** |
| PPA-B | PPA e-Bulletin March–April 2026, https://ppa.gov.gh/wp-content/uploads/2026/05/March-April-2026.pdf | Opened |

## 1. Data Protection Act, 2012 (Act 843)

| Topic | Provision (quoted or closely summarised) | Source | Status | Relevance to NEXCUST |
|---|---|---|---|---|
| Registration duty | A data controller who intends to process personal data shall register (s.27(1)); "A data controller who has not been registered under this Act shall not process personal data" (s.53) | A843; DPC | VERIFIED | Each institution (and any processor) must be registered before real data is processed |
| Registration particulars | Application must state, among others: description of personal data and categories of persons; "whether the applicant holds or is likely to hold special personal data"; purposes; recipients; "the name or description of the country to which the applicant may transfer the data"; security measures (s.47(1)) | A843 | VERIFIED | Hosting country must be declared in the controller's registration |
| Renewal | "A registration shall be renewed every two years" (s.50). DPC portal allows renewal "from three (3) months ... before it expires"; renewal requires a Compliance Report / gap analysis | A843; DPC | VERIFIED | Track controller registration expiry |
| Fees (DPC schedule) | "Specialised Industries: GH¢ 5,000.00; Large Entities: GH¢ 2,340.00; Medium Entities: GH¢ 1,170.00; Small Businesses & Startups: GH¢ 156.00" | DPC FAQ | VERIFIED (as published; category for state security services UNCONFIRMED) | — |
| Data Protection Supervisor | DPC guidance: appoint a Data Protection Supervisor (s.58); "Medium and Large Data Controllers: Ensure the appointment of a full-time in-house Data Protection Supervisor" | DPC | VERIFIED | Name a DPS role in the platform's governance settings |
| Special personal data | Defined to include information relating to "(f) the commission or alleged commission of an offence by the individual; or (g) proceedings for an offence committed or alleged to have been committed by the individual, the disposal of such proceedings or the sentence of any court in the proceedings" (s.96); processing prohibited unless otherwise provided (s.37(1)); presumed necessary where required "in the course of the administration of justice" or for legal proceedings (s.37(6)) | A843 | VERIFIED | Almost every NEXCUST record is special personal data |
| Crime exemption | Processing "is exempt from the provisions of this Act for the purposes of (a) the prevention or detection of crime, (b) the apprehension or prosecution of an offender ..." (s.61(1)); non-disclosure exemption only where applying the provisions "is likely to prejudice" those purposes (s.61(2)) | A843 | VERIFIED (upgrades LEG-025 from PROVISIONAL) | Police processing has an exemption; the scope (whole Act vs specific duties) needs counsel |
| National-security exemption | Exempt for "public order, public safety, public morality, national security, or public interest" (s.60(1)); a Minister's certificate is prima facie evidence; judicial review available (s.60(2)–(4)) | A843 | VERIFIED | — |
| Security | Controller must adopt "appropriate, reasonable, technical and organisational measures"; identify risks, maintain and verify safeguards (s.28) | A843 | VERIFIED | Supports audit, access control, encryption requirements |
| Processors | Processing by a processor "shall be governed by a written contract" (s.30(2)); "Where a data processor is not domiciled in this country, the data controller shall ensure that the data processor complies with the relevant laws of this country" (s.30(4)) | A843 | VERIFIED | Fourth IT or a cloud host would be a processor needing a written contract |
| Breach notification | Notify "the Commission, and the data subject" "as soon as reasonably practicable"; notification to the data subject is delayed "where the security agencies or the Commission inform the data controller that notification will impede a criminal investigation" (s.31) | A843 | VERIFIED | Incident workflow with two notification timestamps and a "delay authorised by" field |
| Retention | Not retained "longer than is necessary" unless required/authorised by law, reasonably necessary for a lawful function, by contract, or with consent (s.24) | A843 | VERIFIED | Retention schedule per record type; see also Act 535 s.7 (08 LEG-026) |
| Territorial scope | Act applies where the controller is established and processes in Ghana, uses equipment/processor in Ghana, or the information "originates partly or wholly from this country" (s.45(1)); data "which originates externally and merely transits" is excluded (s.45(4)) | A843 | VERIFIED | Hosting abroad does not take data outside the Act |
| Cross-border transfer restriction | No express transfer prohibition was found in the Act; the controller must declare transfer countries (s.47(1)(g)). DPC FAQ, asked whether a controller should host its server in a country that does not regulate personal data: "No, you cannot be guaranteed that your data would be protected if they are not complying to data protection principles." | A843; DPC FAQ | VERIFIED (as read); counsel to confirm | Default to in-country hosting for any real-data pilot |
| Access requests | Controller to comply "within forty days" (s.35, per DPC FAQ) | DPC FAQ | VERIFIED (as stated by DPC) | Subject-access workflow, subject to s.61 exemptions |
| DPIA | DPC recommends a DPIA for high-risk processing incl. "processing sensitive personal data" and new technology | DPC | VERIFIED (guidance) | Prepare a DPIA before any pilot |
| Police/Prisons registration status | Not found on any page read | — | UNCONFIRMED | Stakeholder question |

## 2. Cybersecurity Act, 2020 (Act 1038) and critical databases

| Topic | Finding | Source | Status |
|---|---|---|---|
| CSA function | The Authority shall "identify and designate critical information infrastructure and advise the Minister on the regulation of owners of critical information infrastructure" (s.4(h)) | A1038 excerpt | VERIFIED (excerpt) |
| Owner duties | "An owner of a critical information infrastructure shall (a) report a cybersecurity [incident to the] ... Sectoral Computer Emergency Response Team, or (ii) the National Computer Emergency [Response Team]; (b) cause an audit to be performed on a critical information infrastructure ..." (s.39(1)) | A1038 excerpt | VERIFIED (excerpt; time limit not visible) |
| CII Directive | CSA "adopted and implemented the Directive" on 1 Oct 2021; title says it includes "24-hour incident reporting and 72-hour vulnerability disclosure obligations" | DPA-ALERT | PROVISIONAL (CSA site blocked) |
| Designated sectors | "13 sectors" designated under s.35 (search summary of the CSA Directive; not opened) | — | UNCONFIRMED |
| Whether police/prisons records systems are CII | Not found | — | UNCONFIRMED |
| Pending amendment | A Cybersecurity (Amendment) draft Bill 2025 amending ss.35–37 and 40 (search result only) | — | UNCONFIRMED |
| Critical databases (Act 772) | s.56 "Identification of critical electronic record and critical databases": the Minister may identify records/databases "which are of importance to the protection of the national security of the Republic"; NITA is "the Agency" under the Act (s.144) | A772 excerpt | VERIFIED (excerpt) |

## 3. Government hosting and data residency

| Topic | Finding | Source | Status |
|---|---|---|---|
| NITA National Data Centre | "World-class national data center operations and hosting"; "Tier III Infrastructure ... Concurrently maintainable design ensuring 99.982% uptime"; supports "critical digital government services and private enterprise" | NITA | VERIFIED (as published) |
| Government cloud (G-Cloud) | Not mentioned on the NITA page read; search summaries describe a G-Cloud for public-sector agencies | — | UNCONFIRMED |
| Policy intent | Minister for Communications and Digitalisation (Feb 2024): government is working to ensure its external data hosted abroad is moved to Ghana — "We produce that data, it must be stored here." | MOC-24 | PROVISIONAL |
| Draft regulatory framework | NITA's draft Data Centre and Cloud Services Regulatory Framework includes "Data Localization and Residency Requirements"; "under review" (Feb 2024) | MOC-24 | PROVISIONAL; enactment UNCONFIRMED |
| Binding data-residency rule for government data | None found | — | UNCONFIRMED |

## 4. Public procurement (Act 663 as amended by Act 914)

| Topic | Finding | Source | Status |
|---|---|---|---|
| Default method | "A procurement entity shall procure goods, services or works by competitive tendering except as provided in this Part" (s.35(1)); other methods require a recorded justification (s.35(3)) | A663 | VERIFIED (2003 text) |
| Two-stage tendering | Where detailed specifications are not feasible, where goods/works are "subject to rapid technological advances", or "for research, experiment, study or development" (s.36(1)) | A663 | VERIFIED (2003 text) |
| Restricted tendering | "subject to the approval of the Board" where supply is limited to a few suppliers or evaluation cost is disproportionate (s.38); award notice published (s.39(2)) | A663 | VERIFIED (2003 text) |
| Single-source | "with the approval of the Board": sole supplier/exclusive rights; unforeseeable urgency; catastrophe; standardisation/compatibility; "research, experiment, study or development" (except production in commercial quantities); or "procurement that concerns national security" where the entity determines it is the most appropriate method (s.40(1)(a)–(f)) | A663 | VERIFIED (2003 text) |
| Request for quotations | Readily available goods / established market, below the Schedule 3 amount; at least three quotations (ss.42–43) | A663 | VERIFIED (2003 text) |
| 2016 amendments | Act 914 amended Act 663; the PPA reprint is a scanned image and was not read | A914 | UNCONFIRMED (content of amendments) |
| Current thresholds | Public Procurement (Thresholds for Approving Authorities and Procurement Methods) Regulations, 2025 (**L.I. 2516**) replace the thresholds in the Second, Third and Fifth Schedules. Examples: goods above **GH₵40 million** (previously GH₵10 million) go to International Competitive Tendering; a head of a Regional Coordinating Council or MMDA may approve goods up to **GH₵600,000** (previously GH₵100,000); splitting orders to avoid thresholds is a breach | PPA-B | VERIFIED (as published; the bulletin's NCT lower bound is printed as "GH₵800,000,000.00", an evident typo) |
| Entry into force of L.I. 2516 | 4 Feb 2026 (search summary of a PPA page; not opened) | — | PROVISIONAL |
| Free pilot / proof of concept | No provision found that permits or forbids an unpaid demonstration. Act 663 regulates procurement of goods, works and services by a procurement entity; a no-cost demonstration on synthetic data, with no commitment to buy, may fall outside it — **counsel and the PPA must confirm** | A663 | UNCONFIRMED |
| Electronic procurement | Entities submit procurement plans on GHANEPS (ghaneps.gov.gh) | PPA-B | VERIFIED |

## 5. Implications (summary)

| # | Implication | Basis |
|---|---|---|
| 1 | The demonstration must keep using synthetic data only; any pilot with real records needs DPC registration of the controller(s), a written processor contract with Fourth IT and any host, a DPIA, and declared hosting country | Act 843 ss.27, 30, 47, 53 |
| 2 | Treat every person-linked record as special personal data; field-level access control, audit of every read, and retention rules per record type | Act 843 ss.24, 28, 37, 96 |
| 3 | Build a breach-notification record with DPC and data-subject timestamps and an investigation-delay flag | Act 843 s.31 |
| 4 | Make hosting location a configuration item, defaulting to Ghana (NITA National Data Centre as one option) for real-data pilots | Act 843 s.47(1)(g); policy intent (PROVISIONAL) |
| 5 | Provide CII-style incident reporting (24 h default, configurable) and annual-audit evidence export | Act 1038 s.39 (VERIFIED); 24 h (PROVISIONAL) |
| 6 | Any paid contract follows Act 663: competitive tendering by default; single-source only with PPA Board approval on a listed ground (s.40(1)(e) research/study or (f) national security may be argued); a free pilot needs written confirmation that it is not a procurement | Act 663 ss.35–40 |
