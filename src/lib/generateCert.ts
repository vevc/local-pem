import * as x509 from '@peculiar/x509'

export interface GenerateCertOptions {
  domain: string
  days: number
}

export interface CertPreview {
  subject: string
  issuer: string
  serialNumber: string
  notBefore: string
  notAfter: string
  algorithm: string
  fingerprintSha256: string
  san: string
}

export interface GeneratedCert {
  certPem: string
  keyPem: string
  preview: CertPreview
}

const algorithm: RsaHashedKeyGenParams = {
  name: 'RSASSA-PKCS1-v1_5',
  hash: 'SHA-256',
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
}

function bufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':')
    .toUpperCase()
}

function randomSerialHex(byteLength = 16): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  // Ensure positive integer encoding (high bit clear)
  bytes[0] &= 0x7f
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function toPkcs8Pem(pkcs8: ArrayBuffer): string {
  return x509.PemConverter.encode(pkcs8, 'PRIVATE KEY')
}

function formatDate(date: Date): string {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

export async function generateSelfSignedCert(
  options: GenerateCertOptions,
): Promise<GeneratedCert> {
  const domain = options.domain.trim()
  if (!domain) {
    throw new Error('域名不能为空')
  }
  if (!Number.isFinite(options.days) || options.days < 1) {
    throw new Error('有效期至少为 1 天')
  }

  const keys = await crypto.subtle.generateKey(algorithm, true, [
    'sign',
    'verify',
  ])

  const notBefore = new Date()
  const notAfter = new Date(
    notBefore.getTime() + options.days * 24 * 60 * 60 * 1000,
  )

  const cert = await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: randomSerialHex(),
    name: `CN=${domain}`,
    notBefore,
    notAfter,
    signingAlgorithm: algorithm,
    keys,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature |
          x509.KeyUsageFlags.keyEncipherment,
        true,
      ),
      new x509.ExtendedKeyUsageExtension(
        [x509.ExtendedKeyUsage.serverAuth, x509.ExtendedKeyUsage.clientAuth],
        false,
      ),
      new x509.SubjectAlternativeNameExtension(
        [{ type: 'dns', value: domain }],
        false,
      ),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  })

  const pkcs8 = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
  const thumbprint = await cert.getThumbprint('SHA-256')
  const hashName =
    typeof cert.signatureAlgorithm.hash === 'object' &&
    cert.signatureAlgorithm.hash &&
    'name' in cert.signatureAlgorithm.hash
      ? String(cert.signatureAlgorithm.hash.name)
      : 'SHA-256'

  return {
    certPem: cert.toString('pem'),
    keyPem: toPkcs8Pem(pkcs8),
    preview: {
      subject: cert.subject,
      issuer: cert.issuer,
      serialNumber: cert.serialNumber,
      notBefore: formatDate(cert.notBefore),
      notAfter: formatDate(cert.notAfter),
      algorithm: `${cert.signatureAlgorithm.name} / ${hashName}`,
      fingerprintSha256: bufferToHex(thumbprint),
      san: `DNS:${domain}`,
    },
  }
}
