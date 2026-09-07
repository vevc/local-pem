# local-pem

纯前端自签证书工具：在浏览器中生成 RSA-2048 密钥与 X.509 自签证书，预览证书内容，并下载 `cert.pem` / `key.pem`。

等价于：

```bash
openssl req -x509 -newkey rsa:2048 -days 36500 -nodes \
  -keyout key.pem -out cert.pem \
  -subj "/CN=example.domain.com"
```

密钥与证书仅在本地内存中生成，不会上传到任何服务器。

## 本地运行

```bash
npm install
npm run dev
```

构建静态站点：

```bash
npm run build
npm run preview
```

## 部署到 GitHub Pages

1. 将仓库推送到 GitHub（默认分支 `main`）。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 需要发布时，打开 **Actions → Deploy to GitHub Pages → Run workflow**，手动触发构建与部署。
4. 站点地址一般为：`https://<user>.github.io/<repo>/`

构建时会根据 `GITHUB_REPOSITORY` 自动设置 Vite `base` 为 `/<repo>/`，因此项目页（project site）路径可直接使用。

若使用自定义域名或用户主页仓库（`<user>.github.io`），可将 [`vite.config.ts`](vite.config.ts) 中的 `base` 改为 `'/'`。

## 校验下载的 PEM

```bash
openssl x509 -in cert.pem -noout -text
openssl pkey -in key.pem -check -noout
```

## 说明

- 固定算法：RSA-2048 + SHA-256
- 私钥为未加密 PKCS#8 PEM（对应 OpenSSL `-nodes`）
- 自动写入 SAN `DNS:<域名>`，便于现代 TLS 客户端校验
- 仅用于本地开发与测试，勿用于需要公信力的生产环境
