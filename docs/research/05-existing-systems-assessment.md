> Prototype research — not an official publication of the Ghana Police Service or Ghana Prisons Service.

# 05 — Existing systems assessment

Research date: 15 November 2026. Status key as in 01. Position for the prototype: these systems exist and are owned by the institutions; NEXCUST should be designed to **integrate with or complement** them, not to replace them.

## 1. Inventory

| # | System | Owner | What is publicly documented | Source | Status |
|---|---|---|---|---|---|
| 1 | Ghana Police eServices portal (eservices.police.gov.gh) | Ghana Police Service | Public portal linked from police.gov.gh "E-Services". Service groups: Background Checks & Clearances; Investigations & Forensics; Firearms & Weapons; Licensing & Regulatory; Security & Escort; Events & Social; Administrative & Miscellaneous. Applicant account, "My Applications", status tracking, admin back office (applications, appointments, transactions, certificates, reports) | Portal interface text | VERIFIED |
| 2 | Police clearance / background check via the portal | Ghana Police Service (CID) | Four services: Nominal Vetting (Non Resident); Ordinary Vetting or Immigration Permit (Resident); Ordinary Vetting or Immigration Permit (Non-Resident); Employment Vetting. Process in section 2 | Portal interface text | VERIFIED |
| 3 | Statutory fee schedule ("Paid Police Services") | Ghana Police Service, Public Affairs | Undated table: Nominal Vetting (Non-Resident) GH¢2,000; Ordinary Vetting (Resident) GH¢150 plus two passport pictures; Employment Vetting GH¢100 with "fingerprint request on CID Form 59"; Authentication of Police Clearance GH¢50; Investigation Report GH¢150; Police Accident Report GH¢80. Places named: Nima Divisional Police Headquarters, Accra, and CID Headquarters | police.gov.gh Paid Police Services | VERIFIED as published; currency of fees UNCONFIRMED (portal shows fees as variables) |
| 4 | Criminal Records Database System | CID / CDSB | "automated criminal records database was implemented in May 2001"; "records of convicts dating back to 1986 have been captured"; manual records date from the 1920s and are still being captured | police.gov.gh CDSB | VERIFIED (page undated) |
| 5 | Automated Fingerprint Identification System (AFIS) | CID / CDSB | "implemented in September 2011"; "over 3,700 fingerprints and related records have been captured" (undated figure) | police.gov.gh CDSB | VERIFIED (page undated) |
| 6 | Paper intake to CDSB | Stations → CDSB | Fingerprints and crime details sent "on CID Forms 6 and 8" from stations for classification and preparation of criminal records | police.gov.gh CDSB | VERIFIED |
| 7 | West Africa Police Information System (WAPIS) — Data Collection and Registration Centre (DACORE) | INTERPOL Accra, CID HQ | Regional police information system, EU-funded, implemented by INTERPOL; DACORE located at CID Headquarters | police.gov.gh CID | VERIFIED |
| 8 | Police Gazette | CDSB | Publication of wanted/missing persons, stolen and recovered property | police.gov.gh CDSB | VERIFIED |
| 9 | Ghana Case Tracking System (CTS) — "integrated criminal justice case tracking" | Justice-sector institutions, with donor support | News reports: launched 22 May 2018 with USAID support; tracks criminal cases from arrest to judgment across Police, Prisons, Attorney-General's Department, EOCO, Judicial Service; internet connectivity reported as an obstacle | News reports and a USAID close-out report returned by web search (not opened individually) | PROVISIONAL |
| 10 | Prisons electronic case management system | Ghana Prisons Service | News report: UK-donated IT equipment for an "Electronic Case Management System" built with the Service's IT department to capture prisoner biodata across all establishments. Rollout status unknown | News report via web search | PROVISIONAL |
| 11 | Earlier prisons automation ("Inmates Automation System", electronic profiling database) | Ghana Prisons Service | 2011-era news reports of plans | News reports via web search | PROVISIONAL |
| 12 | Prisoner classification (needs-and-risk) tool | Ghana Prisons Service with UNODC | "currently being piloted in four different prison facilities" (page undated); paper/assessment tool, not described as software | unodc.org | VERIFIED as published; current status UNCONFIRMED |
| 13 | Prisons ICT: CCTV, access control, biometric capture equipment, "official website and service portal" | Ghana Prisons Service ICT Department | CCTV installed at Nsawam Medium, Ankaful Maximum "ongoing" (page dated 2021) | ghanaprisons.gov.gh ICT | VERIFIED |
| 14 | Prisons Criminal Records and Statistics Unit; Prisoner Movement Unit; HRMIS Unit | Ghana Prisons Service HQ | Named units only; no system described | ghanaprisons.gov.gh Departments | VERIFIED (names) |
| 15 | National Identification Authority biometric database (Ghana Card) | NIA | Portal collects Ghana Card number and has an identity-verification step | Portal interface text | VERIFIED (that the portal uses Ghana Card); integration method UNCONFIRMED |
| 16 | Station-level electronic occurrence / case management in the Police Service | Ghana Police Service | Nothing found on official pages | — | UNCONFIRMED |

## 2. Published police clearance process (portal text, Ordinary Vetting — Resident; Employment Vetting is the same with employer details)

| Step | Published wording (abridged) | Status |
|---|---|---|
| 1. Eligibility | "Ghanaian or foreign resident who has lived in Ghana for over 3 months after spending more than 6 months abroad" | VERIFIED |
| 2. Prepare | Review guidelines; prepare information and documents | VERIFIED |
| 3. Apply and pay | Log in or create an account; complete the online form; pay the vetting fee plus a "Passport Photo and Certificate Delivery fee"; "online by card or mobile money"; fee is non-refundable | VERIFIED |
| 4. Appointment | "Schedule an appointment for fingerprinting" at an appointment centre; downloadable appointment slip | VERIFIED |
| 5. Biometrics | "Attend your appointment as scheduled" (fingerprinting in person) | VERIFIED |
| 6. Processing | "typically processed within 6 to 8 business days"; applicant can track status; "notified of the decision via email" | VERIFIED |
| 7. Certificate | Application flow has a "Delivery" step; a separate "Authentication of Police Clearance" service exists | VERIFIED (step names); physical collection vs courier vs digital certificate UNCONFIRMED |

Data collected by the form (VERIFIED from portal text): names, gender, date and place of birth, occupation, weight, height, hair and eye colour, race, citizenship, Ghana Card number, passport details, phone, residential and GPS address, landmark, home-town region, parents' names, schools attended; for employment vetting also employer details and offer letter.

## 3. Implications for the prototype

| Area | Implication |
|---|---|
| Criminal record of truth | CDSB's Criminal Records Database and AFIS are the Police Service's record of convictions and fingerprints. NEXCUST should hold a reference (e.g. a CDSB record or fingerprint reference field) and never present itself as the authoritative criminal record |
| Clearance | The public clearance service already exists end to end. Do not build a competing applicant-facing clearance flow; at most show a read-only "clearance check requested/completed" status sourced from the police system |
| Station → CDSB flow | The documented gap is paper: CID Forms 6 and 8 travel from stations to CDSB. A station-side digital capture that outputs those forms' data is complementary |
| Case tracking | A cross-agency CTS has been launched. NEXCUST's arrest-to-custody events should be exportable in a neutral format so they could feed a tracking system rather than duplicate it |
| Prisons | An electronic case management system and a classification tool are reported. Treat prison admission, classification and movement screens as demonstrations to be mapped onto whatever the Service runs |
| Identity | Use Ghana Card number as an optional identifier field only; the prototype uses synthetic data and must not call NIA services |
| Regional interoperability | WAPIS exists for cross-border police information; out of scope, but record identifiers should not preclude later mapping |
