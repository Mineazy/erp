# MEMORY.md

Project memory for the Mineazy ERP repository. Summarizes work completed so future sessions can pick up quickly.

## Project Overview
- **Repo**: https://github.com/Mineazy/erp (remote `origin`, branch `master`)
- **Stack**: Next.js (App Router) + TypeScript + Tailwind, jsPDF for PDF generation, PM2 (`pm2 restart erp`) on server `root@mineazy.com`
- **Root layout** (`src/app/layout.tsx`) wraps all routes in `<Providers>` + `<AppShell>` (sidebar + navbar). `AppShell` renders standalone (no chrome) for `/login` and any `/verify/*` path.

## Deploy Flow
- Temp script `C:\Users\ADMINI~1\AppData\Local\Temp\1\opencode\deploy_v4.ps1` base64-writes listed files to `/var/www/erp` on the server via SSH, runs `npm run build`, `pm2 restart erp`, then health-checks `http://localhost:3001`.
- When deploying new files, add them to the `$files` array in that script (currently includes only the requisitions page + app-shell).
- The ssh output line `bash: line 15/16: $'\r': command not found` is a harmless CRLF artifact of piping the script over SSH; the commands still run (verify `BUILD_OK` + PM2 restart).
- Verify the site works: `login:200`, `fleet:307` (auth redirect), and the fuel verify API returns `{"verified":true,...}`.
- After finishing a task: run `npx tsc --noEmit` before deploying.

## Recent Feature Work (fuel requisitions + voucher)

### Fuel Requisitions & Voucher PDF (`src/app/(modules)/fleet/requisitions/page.tsx`)
- Request Fuel form submits requisitions with vehicle, fuel type, liters, purpose, odometer, driver, branch, destination, and **Redeem Gas Station** dropdown. Gas stations: **Glow Petroleum** (default, first option), Zuva Petroleum Harare, Puma Energy Belgravia, TotalEnergies Avondale, Engen Msasa.
- Two-stage approval workflow: Treasurer (first) → Finance Manager (final). Statuses: pending → treasurer_approved → approved / rejected.
- Download access: requestor or treasurer (`canDownload`).

### Fuel Voucher PDF (`handleDownloadPDF`, jsPDF, A4 portrait)
Fully redesigned voucher layout that fits on one page:
- Branded header: indigo top band, logo, company name/address/contact, "CORPORATE FUEL VOUCHER" title + REF, indigo rule.
- Approval banner: light-indigo rounded band with "APPROVED" + issue date (no embedded checkmark icon — hand-drawn chevron shape looked like an angle bracket and was removed).
- Sections with indigo uppercase section titles + hairlines: "Requisition Details" (9 rows) and "Approval Trail" (status, treasurer, finance manager with dates), zebra-striped rows.
- Fuel Token box (white, split by divider at x=150 mm): Code 39 **barcode** left + captions "Scan to Redeem Fuel" / "6-digit redeem code"; QR (api.qrserver.com) right with white quiet-zone halo + "Scan to Verify / Authenticity" captions. QR encodes `/verify/fuel?id=...&token=...`.
- Security clearance sign-off box (signature + date lines) and footer hairline with contact + authenticity/redemption note.
- Spacing tuned so content ends ~272 mm (A4 usable height 297 mm); footer text at +6/+11.

### Lessons Learned / Gotchas
- **jsPDF uses the current fill color for `rect(..., 'F')`.** The barcode was previously drawn white-on-white (invisible) because the token box left the fill color white. Fix: `drawTokenBarcode` sets `doc.setFillColor(0, 0, 0)` before drawing bars.
- The `Barcode` Vue/React SVG component uses `fill="#000"` explicitly; the PDF helper does NOT — always set fill color explicitly before `'F'` fills.
- When editing PDF layout, keep `y` accumulation in check vs A4 height; this redesign brought footer in from overflow to ~283 mm.

### Security Verification Gateway (public, no auth)
- `src/app/verify/fuel/page.tsx`: standalone page that calls `/api/verify/fuel?id=...&token=...`, shows verified/failed card, plate/vehicle/fuel/station, approvers, and the redeemable barcode token.
- `src/app/api/verify/fuel/route.ts`: auth-verifies the token; returns `{verified, status, tokenMatch, voucher}`.
- `src/components/layout/app-shell.tsx`: treats `/login` and any `/verify/*` pathname as standalone (no sidebar/navbar) via `pathname.startsWith('/verify')`.
- Goods receipt verification page also lives under `src/app/verify/goods-receipt/[id]/`.

## Broader Project History (from git log, older to newer)
- **POS Terminal / Receipts**: restrict receipts/invoices to uploader's root folder, dynamic branch name/details on thermal + A4 receipts, Mineazy logo on A4 fiscal invoice, number casting fixes (`toFixed` TypeError), ExportDialog mount fixes, print actions + POS history filtering/pagination.
- **Z-Reports**: branch dropdown fix, branch column + date range filter, sales calculation fixes, logo on variance report PDF.
- **Docs/housekeeping**: secure auth logging, cleanup of repo artifacts.