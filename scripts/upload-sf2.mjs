/**
 * upload-sf2.mjs
 * סקריפט חד-פעמי — מעלה JJazzLab-SoundFont.sf2 ל-Vercel Blob
 *
 * הכנה:
 *   1. Vercel Dashboard → Storage → Create a Blob Store → לצבור את BLOB_READ_WRITE_TOKEN
 *   2. להריץ:
 *        BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx... node scripts/upload-sf2.mjs
 *
 * תוצאה: מדפיס את ה-URL של הקובץ שהועלה
 *        → להעתיק ל-Vercel env var: VITE_SF2_URL=<url>
 */

import { put } from '@vercel/blob'
import fs from 'fs'
import path from 'path'

const SF2_PATH = 'C:/Program Files/JJazzLab/jjazzlab/modules/soundfont/JJazzLab-SoundFont.sf2'

const token = process.env.BLOB_READ_WRITE_TOKEN
if (!token) {
  console.error('❌ Missing BLOB_READ_WRITE_TOKEN')
  console.error('   Vercel Dashboard → Storage → Blob Store → .env.local')
  process.exit(1)
}

if (!fs.existsSync(SF2_PATH)) {
  console.error(`❌ SF2 not found: ${SF2_PATH}`)
  process.exit(1)
}

const stats = fs.statSync(SF2_PATH)
const sizeMB = (stats.size / 1024 / 1024).toFixed(0)
console.log(`📁 קובץ: ${path.basename(SF2_PATH)} (${sizeMB} MB)`)
console.log('⬆️  מעלה ל-Vercel Blob...')

const stream = fs.createReadStream(SF2_PATH)

const blob = await put('JJazzLab-SoundFont.sf2', stream, {
  access: 'public',
  token,
  contentType: 'application/octet-stream',
  multipart: true,      // חשוב לקבצים גדולים
})

console.log('\n✅ הועלה בהצלחה!')
console.log('🔗 URL:', blob.url)
console.log('\n📋 הוסף ל-Vercel environment variables:')
console.log(`   VITE_SF2_URL=${blob.url}`)
console.log('\n   Vercel Dashboard → Project → Settings → Environment Variables')
