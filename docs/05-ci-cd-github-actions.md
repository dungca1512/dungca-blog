# CI/CD với GitHub Actions

Hai workflow, hai việc khác nhau:

| File | Chạy khi | Làm gì |
|---|---|---|
| [`ci.yml`](../.github/workflows/ci.yml) | mọi pull request + push `main` | Kiểm chất lượng, không chạm production |
| [`deploy.yml`](../.github/workflows/deploy.yml) | push `main` + chạy tay | Deploy thật |

Cả hai dùng Node 22 và `npm install --prefer-offline`.

**Push lên `main` là deploy thẳng ra production, không có bước duyệt.** Chạy
`npm run verify` ở local trước khi push.

## ci.yml

```text
checkout → setup node 22 → npm install → lint → typecheck → check:colors → test → build
```

`check:colors` chặn literal màu lọt ra ngoài lớp token — không có cổng này thì
một mã hex lẻ nằm im trong component, không lật theo theme, và không ai biết.

Bộ test là tấm lưới duy nhất bắt được `projects-index.generated.ts` lệch khỏi
`content/projects/`. Thiếu nó, lệch đó đi thẳng ra production dưới dạng sitemap
thiếu URL mà build vẫn xanh.

## deploy.yml

```text
lint → typecheck → test → check:colors
     → d1 migrations apply --remote
     → opennextjs-cloudflare build
     → populateCache remote
     → wrangler deploy
     → smoke test tên miền thật
```

Bốn cổng chất lượng chạy **trước** khi chạm production: chạy sau là phát hiện
lỗi khi nó đã ở trên mạng. Lý do của thứ tự migration → build → populateCache →
deploy nằm ở [04](./04-trien-khai-cloudflare-workers.md).

Bước cuối là bước quan trọng nhất: smoke gọi vào
`https://blog-dungca.ai-innovation-homelab.org` và là thứ **duy nhất** trong
workflow kiểm chứng rằng site thật sự mở được sau deploy.

`concurrency: deploy-production` với `cancel-in-progress` — hai lần push liên
tiếp không được deploy song song, vì bản cũ hơn có thể về đích sau và ghi đè
bản mới.

## Secret của GitHub Actions

| Secret | Dùng ở bước |
|---|---|
| `CLOUDFLARE_API_TOKEN` | migrations, populateCache, deploy |
| `CLOUDFLARE_ACCOUNT_ID` | như trên |

Token cần quyền ghi Workers, D1 và R2. Nó **không** có quyền ghi DNS — đã đo,
và đó là lý do tên miền khai bằng route thay vì custom domain (xem
[04](./04-trien-khai-cloudflare-workers.md)).

## Khi workflow đỏ

```bash
gh run list --limit 5
gh run view --log-failed
```

| Đỏ ở bước | Xử lý |
|---|---|
| lint / typecheck / test / check:colors | Lỗi code. Chạy `npm run verify` ở local, sửa, push lại. |
| D1 migrations | Migration mới đụng vào cột đã có. Migration chỉ được cộng thêm. |
| build | Thường là lỗi runtime Workers (dùng `node:fs` trong route chạy trên Worker chẳng hạn), không phải lỗi cú pháp — `npm run build` ở local vẫn có thể xanh. Thử `npm run cf:preview`. |
| populateCache / deploy | Token hết hạn hoặc sai quyền. Kiểm hai secret ở trên. |
| smoke | Deploy xong nhưng site hỏng. Đọc dòng `✗` trong log, nó nói rõ URL nào. Cân nhắc [rollback](./04-trien-khai-cloudflare-workers.md#rollback). |

Deploy lại mà không cần commit mới: tab Actions → workflow **Deploy** → *Run
workflow* (`workflow_dispatch`).

## `pages-build-deployment` — cái dấu đỏ không liên quan

Trên GitHub có thể còn một check tên `pages-build-deployment` báo đỏ mỗi lần
push. Đó là **tàn dư của GitHub App Cloudflare Pages** từ thời blog chạy trên
Pages; project Pages đã xoá nên check này không còn gì để build.

Nó không ảnh hưởng tới deploy thật. Dọn bằng tay:
github.com/settings/installations → Cloudflare Pages → gỡ quyền truy cập repo
`dungca-blog` (hoặc uninstall). Không dọn được bằng `gh` CLI — API trả 422 cho
workflow dạng này.
