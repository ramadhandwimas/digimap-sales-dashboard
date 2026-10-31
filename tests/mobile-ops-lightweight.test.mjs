import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const home=fs.readFileSync(new URL('../components/mobile-dashboard-app.tsx',import.meta.url),'utf8');
const more=fs.readFileSync(new URL('../components/mobile-dashboard-more.tsx',import.meta.url),'utf8');

test('home notifications and closing reuse overview data without a new endpoint',()=>{
 const closing=home.slice(home.indexOf('function ClosingNeeds'),home.indexOf('function Sheet('));
 assert.match(home,/Notifikasi Penting/);
 assert.match(closing,/m238-closing-staff:/);
 assert.match(closing,/Staff aktif manual/);
 assert.doesNotMatch(closing,/fetch\s*\(/);
});

test('activity history stays behind the lazy More route',()=>{
 assert.match(more,/dynamic\(\(\)=>import\("@\/components\/activity-history"\)/);
 assert.match(more,/Riwayat Aktivitas/);
});
