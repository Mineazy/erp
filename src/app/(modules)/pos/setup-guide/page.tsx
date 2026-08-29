'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Monitor, ShieldCheck, Wifi, Printer, Settings, AlertTriangle, CheckCircle2, ExternalLink, FileText, HardDrive, Power, UserCheck } from 'lucide-react';

export default function SetupGuidePage() {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Monitor className="h-6 w-6 text-mine-blue-800" />
            Mineazy POS Client — Windows Setup Guide
          </h1>
          <p className="text-sm text-slate-500 mt-1">Tauri desktop v1.0.0 • Windows 10/11 x64 • Offline-first • 2026-08-29</p>
        </div>
        <div className="flex gap-2">
          <a href="/downloads/Mineazy-POS-Setup.exe" download>
            <Button className="gap-2"><Download className="h-4 w-4" /> Download Setup.exe (4.8 MB)</Button>
          </a>
          <Button variant="outline" onClick={() => window.print()} className="gap-2"><FileText className="h-4 w-4" /> Print</Button>
        </div>
      </div>

      <Card className="border-mine-blue-200 bg-mine-blue-50/50">
        <CardContent className="p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-mine-blue-700 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-mine-blue-900">What you get</p>
            <p className="text-slate-600 mt-1">Same POS as <code className="bg-white px-1 rounded border">https://mineazy.com/pos</code> but as a native Windows app. SQLite queue at <code className="bg-white px-1 rounded border">%APPDATA%\com.mineazy.pos\mineazy_pos.db</code> survives browser cache clears, works 8h+ offline, raw ESC/POS + drawer, autostart/kiosk. Web POS keeps working.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><HardDrive className="h-4 w-4" /> System Requirements</CardTitle></CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1">
            <p>• Windows 10 22H2 / 11 x64</p>
            <p>• 4 GB RAM, 500 MB disk</p>
            <p>• WebView2 (preinstalled on Win11)</p>
            <p>• Screen 1024×600+, 1280×800 recommended</p>
            <p>• For link.exe builds: VS Build Tools C++ (dev only)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" /> Download Options</CardTitle></CardHeader>
          <CardContent className="text-xs space-y-2">
            <a href="/downloads/Mineazy-POS-Setup.exe" download className="flex justify-between p-2 rounded border hover:bg-slate-50">
              <span><b>Setup.exe</b> • NSIS • 4.8 MB</span><ExternalLink className="h-3 w-3" />
            </a>
            <a href="/downloads/Mineazy-POS.msi" download className="flex justify-between p-2 rounded border hover:bg-slate-50">
              <span><b>MSI</b> • 6.9 MB • IT deploy</span><ExternalLink className="h-3 w-3" />
            </a>
            <p className="text-slate-500">Both same build from <code>src-tauri/target/release/bundle/*</code>. EXE = one-click, MSI = Group Policy / silent <code>msiexec /i</code>.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Wifi className="h-4 w-4" /> Network</CardTitle></CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1">
            <p>• Online: syncs to <code>mineazy.com/api/pos/transactions</code></p>
            <p>• Offline: queues to SQLite + IDB</p>
            <p>• No VPN needed; uses 443</p>
            <p>• Printer: USB/Serial ESC/POS, no driver extra</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Step-by-step — Setup.exe (Recommended, 2 min)</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal pl-5 space-y-3">
            <li>
              <b>Download:</b> On the POS terminal, open <code>https://mineazy.com/pos</code> → click <b>Mineazy POS Client</b> (top bar) → <b>Setup.exe — Recommended</b>. Save to <code>Downloads</code>. <span className="text-slate-500">(Direct: <code>/downloads/Mineazy-POS-Setup.exe</code> / <code>/downloads/Mineazy-POS.msi</code>)</span>
            </li>
            <li>
              <b>Run installer:</b> Double-click <code>Mineazy-POS-Setup.exe</code>. If SmartScreen says <i>Windows protected your PC</i> → <b>More info</b> → <b>Run anyway</b>. No admin needed.
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Unsigned build shows SmartScreen once. Future signed builds will not. Click <b>More info</b> — publisher will show Mineazy after signing.</span>
              </div>
            </li>
            <li><b>Install:</b> Click <b>Install</b> → choose <i>Desktop shortcut</i> if offered → <b>Finish</b>. App appears as <b>Mineazy POS</b> in Start.</li>
            <li><b>First launch:</b> Opens to <code>https://mineazy.com/pos</code> inside Tauri webview (see <code>dist/index.html</code> redirect). If branch has no internet, it still loads cached shell via <code>public/sw.js</code>.</li>
            <li className="flex gap-2 items-start"><UserCheck className="h-4 w-4 mt-0.5 text-mine-blue-700" /><span><b>Login:</b> Use same ERP email/password + branch as web. Session 24h; close via <b>Close Session</b> (same as web). Branch filter via <code>getBranchFilter</code>.</span></li>
            <li><b>Test offline:</b> With session open, disconnect Wi-Fi → add product → <b>Pay</b> → you’ll see <code>OFF-*</code> receipt and toast <i>Offline payment saved locally</i> (<code>src/app/(modules)/pos/page.tsx:764</code>). DB at <code>%APPDATA%\com.mineazy.pos\mineazy_pos.db</code> (table <code>offline_queue</code>). Reconnect → <code>TauriSync</code> drains in 15s → server creates real <code>TXN-*</code>.</li>
            <li className="flex gap-2"><Printer className="h-4 w-4 mt-0.5" /><span><b>Printer:</b> Web fallback is <code>window.open</code> 58mm (<code>src/lib/pos-print.ts:139</code>). Desktop will call <code>invoke('print_raw')</code> (<code>src-tauri/src/main.rs:113</code>) — configure USB printer name in <code>tauri-bridge.ts</code> or set default Windows printer. Drawer kick via same.</span></li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">MSI — For IT / Silent Deploy</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-3">
          <ol className="list-decimal pl-5 space-y-2">
            <li>Download <code>Mineazy-POS.msi</code> (or versioned <code>Mineazy-POS-1.0.0-x64.msi</code>).</li>
            <li>Admin CMD: <code>msiexec /i Mineazy-POS.msi /quiet</code> — installs to <code>C:\Program Files\Mineazy POS\</code>. For GPO, publish MSI via Group Policy.</li>
            <li>Same first-launch steps as above. MSI registers uninstall at <code>Apps & Features</code>.</li>
          </ol>
          <p className="text-xs text-slate-500">Both installers bundle <code>mineazy-pos.exe 19.6 MB</code> + WebView2 runtime bootstrapper (Wix 3.14 / NSIS 3.11).</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Power className="h-4 w-4" /> Autostart & Kiosk (Optional)</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Tauri includes <code>tauri-plugin-autostart</code> (LaunchAgent). Enable: in app call <code>enable()</code> or add shortcut to <code>shell:startup</code>. For kiosk, set Windows <b>Assigned Access</b> to <code>Mineazy POS</code>.</p>
          <p className="text-xs text-slate-500">Config at <code>src-tauri/tauri.conf.json:12</code> <code>app.windows</code> (1280×800, center, resizable). Change <code>frontendDist</code> to point to branch server for island mode.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" /> Troubleshooting</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <ul className="list-disc pl-5 space-y-1">
            <li><b>SmartScreen blocks:</b> More info → Run anyway. Sign next build with <code>tauri signer</code>.</li>
            <li><b>White screen:</b> Check WebView2 installed; run <code>mineazy-pos.exe</code> from <code>src-tauri/target/release</code> to see console.</li>
            <li><b>Offline sale not syncing:</b> Check <code>%APPDATA%\com.mineazy.pos\mineazy_pos.db</code> → <code>SELECT * FROM offline_queue</code>. Ensure <code>navigator.onLine</code> true and <code>tauri-plugin-http</code> allowed.</li>
            <li><b>Next build fails after Tauri:</b> `outputFileTracingExcludes: ['./src-tauri/**/*']` + `tsconfig exclude src-tauri` already set (<code>next.config.mjs:4</code>). If binary error returns, clean <code>src-tauri/target</code>.</li>
            <li><b>Printer not firing:</b> Set default Windows printer; test via <code>print_raw</code> with notepad fallback (<code>src-tauri/src/main.rs:113</code>).</li>
            <li><b>Need update:</b> Re-run <code>npx tauri build</code> → distribute new MSI/EXE to <code>public/downloads</code> → increment <code>version</code> in <code>tauri.conf.json:3</code>.</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-emerald-50/40">
        <CardContent className="p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">Verify after install</p>
            <p className="text-slate-700 mt-1">1) App opens → login → open session. 2) Kill Wi-Fi → sell 1 item → <code>OFF-*</code>. 3) Reconnect → F5 → transaction becomes <code>TXN-*</code> at <code>/pos/history</code>. 4) Check <code>src-tauri/target/release/bundle/*</code> sizes: MSI 6.92 MB, Setup 4.83 MB.</p>
            <div className="mt-3 flex gap-2">
              <a href="/downloads/Mineazy-POS-Setup.exe" download><Button size="sm" className="gap-2"><Download className="h-3 w-3" /> Download Again</Button></a>
              <a href="/pos" className="text-xs text-mine-blue-700 hover:underline self-center">← Back to POS Terminal</a>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 text-center">Built from <code>src-tauri/target/release/mineazy-pos.exe</code> via <code>npx tauri build</code> (Wix 3.14, NSIS 3.11) • Docs: <code>POS_DESKTOP.md</code> • Dist placeholder: <code>dist/index.html</code> → <code>https://mineazy.com/pos</code></p>
    </div>
  );
}
