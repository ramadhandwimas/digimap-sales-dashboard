# Accessory pricelist upload

Desktop and classic mobile: **Settings → Upload Pricelist Aksesoris**.
New mobile (all themes): **More → Settings → Upload Pricelist Aksesoris**.

Select a Digimap `.xlsx` / `.xls` file (maximum 4 MB), check the preview, then
choose **Tambahkan**. The preview does not write to Google Sheets. Both preview
and import read the current `Master` tab rather than a cached upload history.

The importer finds `Brand`, `SAP Article`, `SAP Description`, and `Category`
headers in the first 30 rows of each worksheet. It normalizes whitespace,
deduplicates by SAP Article, maps brands through `Master!I:L`, and copies the
unique existing brand/category Type and Core rule. APP/APPLE uses existing
first-party Master rows because it is absent from the supplier list. Unknown or
conflicting rules, VAS/protection products, and conflicting duplicate articles
are held for review; they are never silently assigned to ACCESSORIES.

Only new `Master!A:G` values are written, as literal strings. Existing products,
prices, formulas, devices, VAS, and supplier columns remain unchanged. Cell
formatting is copied from an existing accessory row. Extra rows are appended
only when the grid lacks capacity; supplier rows are not inserted or shifted.

## Integrity and operations

- Existing session authentication is required, including in the route handler.
- A preview digest must match the freshly calculated import rows before saving.
- Spreadsheet developer metadata ID `238150926`, key
  `m238_accessory_pricelist_lock`, serializes imports across server instances.
  It occupies no cells and is removed atomically with the successful write.
- Non-idempotent batches are not retried after an ambiguous response. If a
  process crashes after acquiring the lock, an operator must inspect the live
  Master and the metadata before removing the **matching** stale lock. Do not
  delete an active lock or reuse this metadata ID for other features.
- This lock coordinates this importer only. Avoid manually editing Master
  while an import is saving.
- Failed preview/authentication/read operations never write product rows.

Validation: `node --test tests/accessory-pricelist.test.mjs` and
`npm run build:vercel`. Optional local `PRICELIST_FIXTURE` and `MASTER_FIXTURE`
environment variables run a read-only comparison with an uploaded workbook
and a `{master, suppliers}` JSON snapshot. Do not commit actual store data.
