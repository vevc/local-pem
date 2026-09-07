import { useState } from 'react'
import type { FormEvent } from 'react'
import { downloadTextFile } from './lib/download'
import {
  generateSelfSignedCert,
  type GeneratedCert,
} from './lib/generateCert'
import './App.css'

type PemTab = 'cert' | 'key'

export default function App() {
  const [domain, setDomain] = useState('www.bing.com')
  const [days, setDays] = useState(36500)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedCert | null>(null)
  const [pemTab, setPemTab] = useState<PemTab>('cert')
  const [copyHint, setCopyHint] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setCopyHint(null)
    setLoading(true)

    try {
      const generated = await generateSelfSignedCert({ domain, days })
      setResult(generated)
      setPemTab('cert')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '生成证书失败，请重试'
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadBoth() {
    if (!result) return
    downloadTextFile('cert.pem', result.certPem)
    downloadTextFile('key.pem', result.keyPem)
  }

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyHint(`已复制 ${label}`)
    } catch {
      setCopyHint('复制失败，请手动选择文本')
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <p className="brand">local-pem</p>
        <h1>浏览器内生成自签证书</h1>
        <p className="lede">
          等价于{' '}
          <code>
            openssl req -x509 -newkey rsa:2048 -nodes
          </code>
          ，密钥仅在本地内存中生成，不会上传。
        </p>
      </header>

      <main className="layout">
        <section className="panel" aria-labelledby="form-title">
          <h2 id="form-title">签发参数</h2>
          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>域名（CN / SAN）</span>
              <input
                type="text"
                name="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="www.bing.com"
                autoComplete="off"
                spellCheck={false}
                required
              />
            </label>

            <label className="field">
              <span>有效期（天）</span>
              <input
                type="number"
                name="days"
                min={1}
                max={36500}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                required
              />
            </label>

            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? '正在生成 RSA-2048…' : '生成证书'}
            </button>
          </form>

          <p className="hint">
            仅用于本地开发与测试。私钥请勿外传；不可作为受信任的公网证书。
          </p>
          {error ? <p className="error" role="alert">{error}</p> : null}
        </section>

        <section className="panel" aria-labelledby="preview-title">
          <div className="panel-head">
            <h2 id="preview-title">证书预览</h2>
            {result ? (
              <div className="actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    downloadTextFile('cert.pem', result.certPem)
                  }
                >
                  下载 cert.pem
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => downloadTextFile('key.pem', result.keyPem)}
                >
                  下载 key.pem
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleDownloadBoth}
                >
                  全部下载
                </button>
              </div>
            ) : null}
          </div>

          {!result ? (
            <p className="empty">生成后将在此显示证书字段与 PEM 内容。</p>
          ) : (
            <>
              <dl className="meta">
                <div>
                  <dt>Subject</dt>
                  <dd>{result.preview.subject}</dd>
                </div>
                <div>
                  <dt>Issuer</dt>
                  <dd>{result.preview.issuer}</dd>
                </div>
                <div>
                  <dt>Serial</dt>
                  <dd className="mono">{result.preview.serialNumber}</dd>
                </div>
                <div>
                  <dt>Not Before</dt>
                  <dd>{result.preview.notBefore}</dd>
                </div>
                <div>
                  <dt>Not After</dt>
                  <dd>{result.preview.notAfter}</dd>
                </div>
                <div>
                  <dt>SAN</dt>
                  <dd>{result.preview.san}</dd>
                </div>
                <div>
                  <dt>Signature</dt>
                  <dd>{result.preview.algorithm}</dd>
                </div>
                <div className="full">
                  <dt>SHA-256 Fingerprint</dt>
                  <dd className="mono wrap">
                    {result.preview.fingerprintSha256}
                  </dd>
                </div>
              </dl>

              <div className="pem-toolbar">
                <div className="tabs" role="tablist" aria-label="PEM 预览">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={pemTab === 'cert'}
                    className={pemTab === 'cert' ? 'tab active' : 'tab'}
                    onClick={() => setPemTab('cert')}
                  >
                    cert.pem
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={pemTab === 'key'}
                    className={pemTab === 'key' ? 'tab active' : 'tab'}
                    onClick={() => setPemTab('key')}
                  >
                    key.pem
                  </button>
                </div>
                <div className="pem-actions">
                  {copyHint ? (
                    <span className="copy-hint" role="status">
                      {copyHint}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      void copyText('cert.pem', result.certPem)
                    }
                  >
                    复制证书
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void copyText('key.pem', result.keyPem)}
                  >
                    复制私钥
                  </button>
                </div>
              </div>

              <pre className="pem" tabIndex={0}>
                {pemTab === 'cert' ? result.certPem : result.keyPem}
              </pre>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
