> Prototype research — not an official publication of the Ghana Police Service or Ghana Prisons Service.

# 15 — Facilities register: police units and prison establishments

Research date: 16 November 2026 (every source below was accessed that day). Status key as in 01: **VERIFIED** = read this session on an official Service page; **PROVISIONAL** = secondary source (OpenStreetMap, press) or an official page that is superseded; **UNCONFIRMED** = no source.

Data files:

| File | Rows | What it holds |
|---|---|---|
| [`data/police-units.json`](data/police-units.json) | 1,394 | 25 regional commands, 95 divisions, 315 districts, 924 stations and posts (all VERIFIED), plus 35 PROVISIONAL stations and posts |
| [`data/prison-establishments.json`](data/prison-establishments.json) | 49 | 46 custodial establishments, Prisons Headquarters and the Prison Officers' Training School (all VERIFIED), plus 1 PROVISIONAL OpenStreetMap feature |

Both files are JSON arrays with one object per line. Office-holder names are deliberately left out.

## 1. Schema

**Police** (`police-units.json`): the requested fields `regionalCommand`, `regionalHq`, `adminRegions`, `division`, `district`, `station`, `kind` (`REGIONAL_COMMAND` | `DIVISION` | `DISTRICT` | `STATION` | `POST`), `town`, `lat`, `lng`, `status`, `source`, `accessed`. Every row carries its parent names, so the tree can be rebuilt by grouping `(regionalCommand, division, district)`.

**Prisons** (`prison-establishments.json`): the requested fields `name`, `type`, `regionalCommand`, `town`, `adminRegion`, `capacity`, `lat`, `lng`, `status`, `source`, `accessed`.

Additive fields in both files (a loader can ignore them):

| Field | Meaning |
|---|---|
| `coordPrecision` | Police: `STATION` (an OSM `amenity=police` feature), `OFFICIAL_MAP` (a point from the Service's 2018 station-directory map, accepted only after the checks in §3), or `TOWN` (an OSM settlement centroid, **not** the station building). Prisons: `FACILITY` or `TOWN`. `null` when there are no coordinates. |
| `coordSource` | Exact origin of the coordinates (OSM element id, or the 2018 page). |
| `note` | Caveats for the row, such as a parent inferred from table layout, a name listed by two commands, or a reason for PROVISIONAL status. |
| `capacityNote` (prisons) | The page's exact wording on capacity and current population. |

Conventions:
- Names are as printed by the Service, including its capitalisation and spelling (for example `KPASSA`, `Sabzugu`, `Yabaga`). The only edits are stripped list numbers and the Oti page's "STN" suffix.
- `regionalCommand` uses the short police name (for example "Ashanti North"); the site labels these "<name> Region".
- `adminRegions` for a command lists the administrative regions in which its located stations fall, based on point-in-polygon tests against the OSM level-4 boundaries. A station row without coordinates inherits its command's region only when the command covers a single region; otherwise the field is `[]`.
- `town` is filled only when the station name matched an OSM settlement in the expected region, or when the page states the location (headquarters, prisons). It is never guessed from the station name alone.

## 2. Sources: opened and blocked

| Source | Result | Used for |
|---|---|---|
| police.gov.gh, all 25 regional pages (Regions menu) | Opened (HTTP 200) | VERIFIED tree, headquarters and stated counts |
| police.gov.gh WordPress API, page list (`/wp-json/wp/v2/pages?search=region`) | Opened | Page modified dates; found the 2018 directory pages |
| police.gov.gh 2018 "Police Stations – <Region>" pages (11 regions, created Jan 2018) plus the `police_stations` and `oti-region` pages | Opened | Station names with map points (`data-lat`/`data-lng`) for 298 entries; used only as checked coordinates and as PROVISIONAL leads |
| police.gov.gh `from-the-regions` | HTTP 503 | — |
| police.gov.gh `sitemap.xml` | Connection reset | — |
| ghanaprisons.gov.gh, 9 regional command pages | Opened | VERIFIED establishments, capacities and towns |
| ghanaprisons.gov.gh "Location of Prisons in Ghana" (map image PRISONS-MAP-WEBSITE.jpg, uploaded 2024-05-08) | Opened; the full-resolution image was read | VERIFIED list of establishments, including **Wa Central** |
| ghanaprisons.gov.gh About Us; WordPress API search; 6 news posts (Upper West command and Wa Central, 2024–2025; Damongo commissioning, Nov 2025; Damongo, Feb 2026) | Opened | Count of 46 establishments; Upper West command; Damongo Camp status |
| ghanaprisons.gov.gh "Upper West Regional Command" menu item | The link is `#` (no page) | — |
| ghanaprisons.gov.gh Statistics page | Opened, empty | — |
| overpass-api.de (and the lz4/z instances, kumi.systems, private.coffee, osm.jp, nchc, openstreetmap.ru) | Connection reset or timeout | — |
| overpass.openstreetmap.fr | HTTP 403 | — |
| maps.mail.ru Overpass mirror | Reachable, but country-wide and tiled queries returned 504 (server busy) | Abandoned |
| download.openstreetmap.fr Ghana extract (`ghana.osm.pbf`, 129 MB, OSM data as of 2026-11-15T01:32Z, md5 checked) | Downloaded | All OSM data: 433 `amenity=police` features inside Ghana (451 in the extract, which includes a border buffer), 37 features tagged or named as prisons, 12,045 settlements, 16 region boundaries |
| web.archive.org; download.geofabrik.de | Connection reset | — |
| Wikipedia "List of police stations in Ghana" | Not used: OSM gave better coverage than any press or Wikipedia list | — |

Site condition: the police Ashanti page still carries template placeholder blocks ("I am text block … Lorem ipsum"). Several pages give a count in words that differs from the figure in brackets (for example "seven (8)"). No injected spam was found on the regional pages read for this file.

## 3. Method

1. **Police tree.** Each regional page's HTML table was expanded cell by cell, honouring `rowspan` and `colspan`, and line breaks inside cells were kept separate from slashes that are part of a name (for example "OLEBU/ABLEKUMA POST" is one post). A unit is a POST when its printed name contains "POST"; every other unit is a STATION.
2. **Layout-inferred parents.** Some pages put several divisions or districts in one merged cell, separated only by blank lines. Parents were then assigned by vertical position, and every affected row carries a `note`:
   - Upper West: WA / LAWRA / TUMU divisions.
   - Savannah: SALAGA / BOLE divisions; Damongo / Daboya districts.
   - North East: Bunkpurugu / Yunhoo / Yagaba districts; the station is printed "Yabaga".
   - Tema: Zenu-Atadeka and Adjei-Kojo sit in a blank cell under ASHAIMAN.
   - Ashanti South: OBUASI / BIDIEM.
   - Upper East: Sandema / Fumbisi.
   - Northern: Tatale / Wulensi.

   Northern's Karaga, Chereponi and Kpandai districts have no division on the page, so `division` is `null` for them.
3. **Coordinates**, best tier first:
   - **(a) `STATION`:** an OSM `amenity=police` feature in the same administrative region, matched by name. Exact matches come first. Close spellings (for example "Kpasa" for KPASSA) were accepted only if no other official unit competes for the feature. When two stations compete, the one nearer its district's other stations wins. Five matches were made by hand: Adum Railway, Patriensa, UCC, Koforidua Railways and Bolgatanga Municipal.
   - **(b) `OFFICIAL_MAP`:** the 2018 official map point, used only if two checks pass:
     - no differently named station on the 2018 pages shares that point (many points are copy-paste duplicates);
     - an OSM settlement of the same name lies within 10 km.
   - **(c) `TOWN`:** the centroid of an OSM settlement of the same name, within 35 km (60 km in large northern and western commands) of the district's points from (a) and (b), or failing that within 50–90 km of the division's points. Tighter limits apply in Accra (15/25 km), Ashanti/Kumasi (25/30 km) and Tema (25/40 km). The HQ town is used as the anchor only when the division has no located points.
   - **Final check:** a point is dropped if no other located point in its district lies near it while that district's other points cluster together, or if it lies far from the command's other points. This removed 4 points, including the 2018 point for Agogo (it lies near Kumasi) and an OSM "Afrancho" that belongs to the other Afrancho.
4. **PROVISIONAL rows.**
   - **25 OSM-only named stations and posts.** These are not on any official page. Each was reviewed by hand, and checkpoints, MTTD/DOVVSU offices, barracks and likely duplicates were excluded. Their `regionalCommand` is assigned **by proximity only**: the command of the nearest located official unit, with the distance given in `note`.
   - **10 names found only on the 2018 directory**, which are absent from the current pages: West Legon, Kings Cottage, Haatso, Ashongman, Trassaco West, Ashaley Botwe, New Town (Tema), Sege, Tepa and Mankranso.
5. **Prisons.** Rows were entered by hand from the regional pages, the 2024 map and the news posts. Coordinates come from OSM `amenity=prison` features where one is named for the establishment; Kenyasi is an unnamed prison node at Kenyasi. Otherwise the town centroid is used. Every coordinate's administrative region was checked against the stated region.

## 4. Police — coverage by regional command

"Stated" is the page's own sentence (word/figure mismatches quoted as printed). "Found" counts what the page actually lists. Divisions and districts are VERIFIED rows; stations include posts.

| # | Regional command (page slug) | HQ (as stated) | Administrative region(s) of located stations | Stated: div / dist / stations | Found: div / dist / stations (posts) | Complete list? | Coordinates: station / official 2018 / town / none | Page modified |
|---|---|---|---|---|---|---|---|---|
| 1 | Accra (`accra-region`) | Accra | Greater Accra | 14 / 43 / 108 | 14 / 43 / 113 (22) | Yes | 40 / 11 / 20 / 42 | 2026-04-20 |
| 2 | Tema (`tema-region`) | Tema | Greater Accra | 5 / 14 / 30 | 5 / 14 / 39 (3) | Yes | 10 / 5 / 14 / 10 | 2026-07-13 |
| 3 | Ashanti (`ashanti-region`) | Kumasi | Ashanti | "seven (8)" / 21 / 85 | 7 / 19 / 77 (4) | No — 1 division, 2 districts, 8 stations short | 11 / 3 / 37 / 26 | 2026-04-20 |
| 4 | Ashanti North (`ashanti-north-region`) | Mampong | Ashanti | 4 / 11 / 39 | 4 / 11 / 39 (0) | Yes | 2 / 8 / 20 / 9 | 2026-07-14 |
| 5 | Ashanti South (`ashanti-south-region`) | Bekwai | Ashanti | 4 / "fourteen (15)" / 69 | 4 / 15 / 69 (0) | Yes | 6 / 9 / 40 / 14 | 2025-10-29 |
| 6 | Ahafo (`brong-ahafo`) | Goaso | Ahafo | "one (4)" / "seven (11)" / 27 | 4 / 11 / 27 (0) | Yes | 4 / 1 / 19 / 3 | 2025-07-25 |
| 7 | Bono (`bono`) | Sunyani | Bono | 4 / 11 / 37 | 4 / 11 / 37 (2) | Yes | 4 / 6 / 19 / 8 | 2025-10-29 |
| 8 | Bono East (`bono-east`) | Techiman | Bono East | 4 / 10 / 31 | 4 / 10 / 31 (1) | Yes | 3 / 6 / 14 / 8 | 2026-07-13 |
| 9 | Central (`central-region`) | Cape Coast | Central | 6 / 20 / 51 | 5 / 17 / 47 (0) | No — 1 division, 3 districts, 4 stations short | 8 / 2 / 26 / 11 | 2026-02-04 |
| 10 | Central East (`central-east-region`) | Kasoa | Central | 2 / 10 / 22 | 2 / 10 / 22 (0) | Yes | 1 / 0 / 11 / 10 | 2025-10-29 |
| 11 | Central North (`central-north-region`) | Assin Fosu | Central | 2 / 7 / 31 + 1 post | 2 / 7 / 32 (1) | Yes | 3 / 0 / 15 / 14 | 2025-07-30 |
| 12 | Eastern (`eastern-region-2`) | Koforidua | Eastern | 3 / 14 / 44 | 3 / 14 / 44 (0) | Yes | 5 / 4 / 27 / 8 | 2026-01-08 |
| 13 | Eastern North (`eastern-north-region`) | Mpraeso | Eastern | 3 / 6 / 17 | 3 / 6 / 17 (1) | Yes | 1 / 2 / 6 / 8 | 2026-02-04 |
| 14 | Eastern South (`eastern-south-region`) | Kibi | Eastern | 3 / 16 / 52 | 3 / 16 / 52 (0) | Yes | 6 / 7 / 27 / 12 | 2026-02-04 |
| 15 | North East (`north-east`) | Nalerigu | North East | 1 / 6 / 14 | 1 / 6 / 14 (1) | Yes | 1 / 2 / 6 / 5 | 2026-07-13 |
| 16 | Northern (`northern-region`) | Tamale | Northern, North East | 5 / 21 / 50 | 2 + unnamed / 14 / 22 (2) | No — 3 divisions not named, 7 districts and 28 stations short; list predates the North East/Savannah split | 6 / 7 / 6 / 3 | 2025-07-30 |
| 17 | Oti (`oti`) | Dambai | Oti | 4 / 10 / 24 | 4 / 10 / 24 (0) | Yes | 3 / 0 / 16 / 5 | 2026-09-01 |
| 18 | Savannah (`savannah`) | Damongo | Savannah | 2 / 6 / 17 | 2 / 6 / 14 (0) | Nearly — 3 stations short | 1 / 5 / 5 / 3 | 2025-09-29 |
| 19 | Upper East (`upper-east`) | Bolgatanga | Upper East | "two (3)" / "ten (11)" / 20 | 3 / 11 / 20 (0) | Yes | 6 / 5 / 7 / 2 | 2026-07-14 |
| 20 | Upper West (`upper-west`) | Wa | Upper West | 3 / 10 / 22 | 3 / 10 / 22 (0) | Yes | 4 / 5 / 5 / 8 | 2026-08-10 |
| 21 | Volta (`volta-region`) | Ho | Volta | 4 / 19 / 49 | 4 / 19 / 49 (0) | Yes | 12 / 3 / 23 / 11 | 2025-10-29 |
| 22 | Volta North (`volta-north-region`) | Hohoe | Volta | 2 / 4 / 8 | 2 / 4 / 8 (0) | Yes | 5 / 0 / 1 / 2 | 2026-01-20 |
| 23 | Western (`western-region`) | Sekondi-Takoradi | Western | 7 / 18 / 61 | 5 / 12 / 42 (0) | No — 2 divisions, 6 districts, 19 stations short | 8 / 1 / 24 / 9 | 2025-10-29 |
| 24 | Western North (`western-north`) | Sefwi Wiawso | Western North, Western | — / 8 / 34 | 3 / 11 / 34 (0) | Yes (stations); districts differ from the stated 8 | 5 / 0 / 21 / 8 | 2025-10-29 |
| 25 | Western Central (`western-central-region`) | Tarkwa | Western | 2 / 8 / "twenty-seven (29)" | 2 / 8 / 29 (0) | Yes | 8 / 0 / 11 / 10 | 2026-04-20 |
| | **Total** | | | | **95 / 315 / 924 (37)** | 20 of 25 complete | **163 / 92 / 420 / 249** | |

"Page modified" is the WordPress `modified` date. It may reflect a change of commander rather than a revision of the table.

PROVISIONAL police rows by command: Accra 14 (OSM 8, 2018-only 6), Tema 5 (OSM 3, 2018-only 2), Ashanti 6 (OSM 4, 2018-only 2), Central 4, Eastern, Eastern South, Ashanti South, North East, Upper West and Volta North 1 each.

### 4.1 Police gaps and anomalies

| Item | Detail | Status / handling |
|---|---|---|
| Incomplete official tables | Ashanti, Central, Northern and Western list fewer units than their own pages state; Savannah lists 14 of 17 | Missing units are UNCONFIRMED; nothing was added for them. The 2018 directory suggests Tepa and Mankranso may belong to Ashanti's unlisted division (PROVISIONAL rows) |
| Northern page is out of date | It lists Chereponi, which is also a North East district, and names only TAMALE and YENDI of its five divisions | Rows kept as printed; Chereponi rows carry a note |
| Station listed by two commands | WASSA JUABO appears under Western North (Sefwi Bekwai district) and Western Central (Dominase district) | Both rows kept with a note; the single OSM point attached to the Western North row |
| Western North districts | Page states 8 districts and lists 11 under 3 divisions | Kept as listed |
| Accra numbering | Page states 108 stations and posts, but its own numbered list reaches 113 | All 113 kept |
| Merged-cell layouts | See §3 step 2 | Parent marked as inferred in `note`; confirm with the Service |
| 2018 directory quality | Many map points are copy-paste duplicates. Some are in the wrong place (Agona-Nkwanta plotted at Nkwanta, Volta; Odumase at Sunyani; Achiase near Kumasi). Ashaley Botwe's point has longitude equal to latitude | Only points passing the checks in §3 were used (92 VERIFIED rows, 4 PROVISIONAL) |
| Coordinates missing | 249 of 924 verified stations have none (suburb-level names, generic names such as RAILWAYS, or no OSM match) | Leave null; fill from the Service or a field survey |
| Town-centroid points | 420 stations are placed at a settlement centroid, not at the station | Use `coordPrecision` to style them differently on a map |

## 5. Prisons — establishments

| # | Establishment | Type | Regional command | Town | Admin region | Capacity (site) | Coordinates | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | Kumasi Central Prison | central | Ashanti | Kumasi | Ashanti | 500 | facility | VERIFIED |
| 2 | Kumasi Female Prison | female | Ashanti | Kumasi (Adum) | Ashanti | 30 | town | VERIFIED |
| 3 | Manhyia Local Prison | local | Ashanti | Kumasi (Manhyia) | Ashanti | 60 | — | VERIFIED |
| 4 | Obuasi Local Prison | local | Ashanti | Obuasi | Ashanti | 100 | facility | VERIFIED |
| 5 | Amanfrom Camp Prison | camp | Ashanti | Amanfrom (Kumasi–Barekese road) | Ashanti | 200 | town | VERIFIED |
| 6 | Ahinsan Camp Prison | camp | Ashanti | Adansi-Ahinsan | Ashanti | 278 | town | VERIFIED |
| 7 | Ejura Camp Prison | camp | Ashanti | Ejura | Ashanti | 240 | town | VERIFIED |
| 8 | Nsawam Medium Security Prison | medium security | Eastern | Nsawam | Eastern | 717 | facility | VERIFIED |
| 9 | Nsawam Female Prison | female | Eastern | Nsawam | Eastern | 200 | town | VERIFIED |
| 10 | Nsawam Camp Prison | camp | Eastern | Ahodwo, Nsawam-Adoagyiri Municipality | Eastern | 320 | town | VERIFIED |
| 11 | Akuse Local Prison | local | Eastern | Akuse | Eastern | 100 | town | VERIFIED |
| 12 | Akuse Female Prison | female | Eastern | Akuse | Eastern | 5 | town | VERIFIED |
| 13 | Koforidua Local Prison | local | Eastern | Koforidua (Effiduase) | Eastern | 400 | facility | VERIFIED |
| 14 | Forifori Camp Prison | camp | Eastern | Forifori (Afram Plains) | Eastern | 250 | town | VERIFIED |
| 15 | Sekondi Central Prison | central | Western | Sekondi | Western | 412 | facility | VERIFIED |
| 16 | Sekondi Female Prison | female | Western | Sekondi | Western | 44 | town | VERIFIED |
| 17 | Tarkwa Local Prison | local | Western | Tarkwa | Western | 150 | facility | VERIFIED |
| 18 | Ekuasi Camp Prison | camp | Western | Ekuasi (Sekondi-Takoradi) | Western | 140 | — | VERIFIED |
| 19 | Hiawa Camp Prison | settlement camp | Western | Hiawa (off the Bawdie–Asankragwa highway) | Western | 70 | town | VERIFIED |
| 20 | Maximum Security Prison | maximum security | Central | Ankaful, Cape Coast | Central | 2,000 | facility | VERIFIED |
| 21 | Ankaful Annex Prison | annex | Central | Ankaful, Cape Coast | Central | 400 | town | VERIFIED |
| 22 | Ankaful Main Camp Prison | camp | Central | Ankaful, Cape Coast | Central | 800 | town | VERIFIED |
| 23 | Communicable Disease Prison | communicable disease | Central | Ankaful, Cape Coast | Central | 90 | town | VERIFIED |
| 24 | Winneba Local Prison | local | Central | Winneba | Central | 45 | facility | VERIFIED |
| 25 | Awutu Camp Prison | camp | Central | — | Central | 250 | — | VERIFIED |
| 26 | Osamkrom Camp Prison | camp | Central | Osamkrom | Central | 100 | — | VERIFIED |
| 27 | Sunyani Central Prison | central | Bono, Bono East and Ahafo | Sunyani | Bono | 450 | facility | VERIFIED |
| 28 | Sunyani Female Prison | female | Bono, Bono East and Ahafo | Sunyani | Bono | — | town | VERIFIED |
| 29 | Duayaw Nkwanta Camp Prison | settlement camp | Bono, Bono East and Ahafo | Duayaw Nkwanta | Ahafo | 75 | town | VERIFIED |
| 30 | Yeji Camp Prison | camp | Bono, Bono East and Ahafo | Yeji (Kwayease) | Bono East | 250 | facility | VERIFIED |
| 31 | Kenyasi Camp Prison | settlement camp | Bono, Bono East and Ahafo | Kenyasi (Asutifi North) | Ahafo | — | facility | VERIFIED |
| 32 | Tamale Central Prison | central | Northern | Tamale | Northern | 78 | facility | VERIFIED |
| 33 | Tamale Female Prison | female | Northern | Tamale | Northern | 12 | town | VERIFIED |
| 34 | Yendi Local Prison | local | Northern | Yendi | Northern | 56 | town | VERIFIED |
| 35 | Salaga Local Prison | local | Northern | Salaga | Savannah | 48 | town | VERIFIED |
| 36 | Gambaga Local Prison | local | Northern | Gambaga | North East | 22 | town | VERIFIED |
| 37 | Damongo Camp Prison | camp | Northern | Damongo | Savannah | 300 | town | VERIFIED |
| 38 | Ho Central Prison | central | Volta | Ho (Bankoe) | Volta | 170 | town | VERIFIED |
| 39 | Ho Female Prison | female | Volta | Ho (Bankoe) | Volta | 24 | town | VERIFIED |
| 40 | Kete Krachi Local Prison | local | Volta | Kete Krachi | Oti | 400 | town | VERIFIED |
| 41 | Kpando Local Prison | local | Volta | Kpando (Kpando Todzi) | Volta | 55 | town | VERIFIED |
| 42 | Navrongo Central Prison | central | Upper East | Navrongo | Upper East | — | facility | VERIFIED |
| 43 | Bawku Local Prison | local | Upper East | Bawku | Upper East | — | town | VERIFIED |
| 44 | James Camp Prison | camp | Greater Accra | Accra | Greater Accra | — | facility | VERIFIED |
| 45 | Senior Correctional Centre | senior correctional centre | Greater Accra | Accra | Greater Accra | — | — | VERIFIED |
| 46 | Prisons Headquarters | headquarters (non-custodial) | Greater Accra | Accra | Greater Accra | — | — | VERIFIED |
| 47 | Prison Officers' Training School | training school (non-custodial) | Greater Accra | Accra | Greater Accra | — | — | VERIFIED |
| 48 | Wa Central Prison | central | Upper West | Wa | Upper West | — | facility | VERIFIED |
| 49 | Offinso prison camp (OSM name) | camp (per OSM name only) | Ashanti | — | Ashanti | — | facility | PROVISIONAL |

Capacity is the figure the page gives as authorised, original, initial or design capacity. `capacityNote` quotes the wording; several figures are approximate ("about") or historic ("original").

### 5.1 Prisons findings and gaps

| Item | Detail | Status |
|---|---|---|
| Upper West gap closed | No Upper West page exists (the menu link is `#`). The official 2024 map shows "WA CENTRAL" with the central-prison symbol, and official news posts (Apr 2024 – Nov 2025) name the "Upper West Regional Prisons Command" and Wa Central Prison | Wa Central: VERIFIED. Its capacity is not published |
| Count reconciles to 46 | The About Us page says the Service "comprises forty-six prison establishments located in all the sixteen regions". The 45 custodial establishments on the regional pages (including Damongo) plus Wa Central make 46 | VERIFIED count. The 2024 map shows 45: it includes Wa Central and omits Damongo, which was not yet commissioned |
| "All sixteen regions" | No listed establishment lies in the Western North administrative region, so the published list covers 15 | UNCONFIRMED: ask the Service |
| Damongo Camp Prison | The Northern command page still says "yet to be commissioned". Official news reports commissioning on 5 Nov 2025 (300 capacity), and in Feb 2026 an acting Officer-in-Charge | VERIFIED as an establishment; the page text is stale |
| Command versus administrative region | The Northern command covers prisons in Savannah (Salaga, Damongo) and North East (Gambaga); the page says so. Volta covers Kete Krachi (Oti). One command covers Bono, Bono East and Ahafo | VERIFIED |
| Capacities newly captured (file 04 had "not captured") | Nsawam Female 200; Nsawam Camp 320; Akuse Local about 100; Koforidua Local 400; Forifori about 250; Winneba about 45; Yeji 250; Tamale Central 78; Yendi about 56; Salaga 48; Ho Central 170; Ho Female 24; Kpando about 55; Damongo 300 | VERIFIED (page wording in `capacityNote`) |
| Not published | Capacities for Sunyani Female, Kenyasi, Navrongo, Bawku, James Camp, Senior Correctional Centre and Wa Central; town for Awutu Camp | UNCONFIRMED |
| Upper East and Greater Accra pages | Last modified 2021-05-04; little or no text (James Camp has a heading only) | VERIFIED as listed; currency UNCONFIRMED |
| Pipeline facilities (not in the data) | 800-inmate remand prison at Nsawam under construction (Eastern page; President, Nov 2025). A Church of Pentecost camp at Obuasi "nearing completion" (Nov 2025) | Leave out until commissioned |
| OSM extras | "Offinso prison camp" (way/1489608653) is tagged `amenity=prison` but appears on no official page (PROVISIONAL row). "Cape Coast Prison" (way/584731253) at Ankaful could be the Annex or Main Camp, so it was not attached | PROVISIONAL / not used |
| Naming versus C.I. 92 | Differences from the Ninth Schedule are noted per row (Kumasi Female Central, Ekuasi Local, Contagious Diseases, Ho Male/Female Local, Nsawam and Winneba "Regions") | See 04 §2.4 |

This file supersedes 04 §2.2 on Upper West (Wa Central is now VERIFIED, no longer PROVISIONAL), on Damongo's status and on the capacities listed above.

## 6. How to refresh

1. **Police pages.** Get the list of regional pages and their `modified` dates from `https://police.gov.gh/en/index.php/wp-json/wp/v2/pages?search=region&per_page=100&_fields=slug,modified,link`. Re-parse any page whose date is later than the "Page modified" column in §4. Expand the tables honouring `rowspan`/`colspan`, and treat `<p>`/`<br>` breaks, not slashes, as list separators. Re-check the merged-cell regions by eye (§3 step 2).
2. **Prisons pages.** Re-read the nine `*-regional-command.cits` pages and "Location of Prisons in Ghana" (check whether the map image has been replaced). Search the WordPress API (`/wp-json/wp/v2/posts?search=...`) for "commission", "Upper West" and new establishment names.
3. **OSM.** Download `https://download.openstreetmap.fr/extracts/africa/ghana.osm.pbf` and check it against its `.md5`. Extract `amenity=police`, `amenity=prison`, `place=*` nodes and `boundary=administrative` + `admin_level=4` with pyosmium. Overpass was unreachable or overloaded from this environment on 16 Nov 2026; if it is reachable, `nwr["amenity"="police"](area:Ghana)` gives the same features.
4. **Re-match.** Keep VERIFIED rows driven only by the Service's pages. Re-run name matching and the distance checks in §3, and re-review new OSM-only features by hand before adding them as PROVISIONAL.
5. **Record.** Record the access date per row. Never promote a PROVISIONAL row to VERIFIED without an official source, and never fill a missing unit or capacity by inference.

## 7. Use in NEXCUST

- Load both files as **reference data** with their status. Do not hard-code units in logic (CLAUDE.md). Show `note` text to administrators wherever a parent was inferred.
- Seed only VERIFIED rows by default. PROVISIONAL rows are leads for the Service to confirm, not units to create.
- Map views must distinguish `STATION`/`FACILITY` points from `TOWN` centroids and `OFFICIAL_MAP` points.
- Org-unit scope for police should follow the regional page tree (command → division → district → station/post), not the 16 administrative regions. Some commands span two administrative regions, and some administrative regions hold three commands.
