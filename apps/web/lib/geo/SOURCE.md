# Ghana region boundaries

`ghana-regions.json`: the 16 administrative regions (boundaries valid 2021-03-08, post-2018/19 structure).

- Source: OCHA Common Operational Dataset, Administrative Boundaries `cod-ab-gha` (https://data.humdata.org/dataset/cod-ab-gha), from the Ghana Statistical Service.
- Licence: Creative Commons Attribution for Intergovernmental Organisations (CC BY-IGO). Attribution: Ghana Statistical Service (GSS) / OCHA via HDX.
- Processing (as prepared for Fourth IT's Mandate platform, `data/geo/REPORT.md` there): mapshaper `-simplify 30% keep-shapes`, `-clean`; coordinates rounded to 4 decimals; "Northern East" renamed "North East".

Station and establishment points come from the facilities register (`docs/research/15-facilities-register.md`): OpenStreetMap contributors (ODbL) and the Ghana Police Service's 2018 station map. Every map shows both attributions.
