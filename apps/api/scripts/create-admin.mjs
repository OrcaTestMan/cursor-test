/**
 * 서버에서만 쓰는 관리자 생성.
 * 비밀번호·TOTP는 터미널에 출력하지 않고 C:\nex\secrets 파일로만 남긴다.
 */
import argon2 from 'argon2'
import { generateSecret, generateURI } from 'otplib'
import postgres from 'postgres'
import QRCode from 'qrcode'
import {
  cliArg,
  containsSecret,
  generateAdminPassword,
  hasCliFlag,
  safeAdminLogin,
  secretFileBody,
  secretFilePaths,
  writeSecretText,
} from './create-admin-lib.mjs'

const DATABASE_URL =
  process.env.LOCAL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://nex:nex@127.0.0.1:5432/nex'
if (/211\.110\.16\.130/.test(DATABASE_URL)) {
  console.error('create-admin refused remote DB')
  process.exit(2)
}

if (hasCliFlag(process.argv, 'password')) {
  console.error('do not pass --password; a random password is written to the secrets file')
  process.exit(1)
}

const login = safeAdminLogin(cliArg(process.argv, 'login'))
const nick = cliArg(process.argv, 'nick', '관리자')
const role = cliArg(process.argv, 'role', 'superadmin')
const allowed = new Set(['superadmin', 'operator', 'agent'])

if (!login || !allowed.has(role)) {
  console.error(
    'usage: yarn workspace api admin:create -- --login <id> --nick <이름> --role superadmin|operator|agent',
  )
  process.exit(1)
}

const password = generateAdminPassword()
const totpSecret = generateSecret()
const files = secretFilePaths(login)
const sql = postgres(DATABASE_URL, { max: 1 })

try {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  await sql`
    insert into nex_admins (login, nick, password_hash, totp_secret, role)
    values (${login}, ${nick}, ${passwordHash}, ${totpSecret}, ${role}::nex_admin_role)
  `
  const uri = generateURI({ secret: totpSecret, label: `Nex:${login}`, issuer: 'Nex' })
  writeSecretText(files.text, secretFileBody({ login, password, totpSecret }))
  await QRCode.toFile(files.qr, uri, { width: 320, margin: 2 })
  const printed = `${files.text}\n${files.qr}`
  if (containsSecret(printed, [password, totpSecret, uri])) {
    throw new Error('secret leaked to console')
  }
  console.log(files.text)
  console.log(files.qr)
} catch (err) {
  const message = String(err?.message || err)
  if (containsSecret(message, [password, totpSecret])) {
    console.error('create-admin failed')
  } else {
    console.error(message)
  }
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
