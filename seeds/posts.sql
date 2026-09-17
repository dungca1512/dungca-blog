INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES ('2026-03-03-khoi-tao-blog', 'Khởi tạo blog Markdown trên Next.js', 'Bộ khung blog đã sẵn sàng: thêm file .md là có bài viết mới.', '["nextjs","markdown","cloudflare-pages"]', '
## Mục tiêu

Project này được tổ chức để bạn có thể:

- Viết bài bằng Markdown trong `content/posts/`.
- Tự động tạo trang danh sách bài viết (`/blog`).
- Tự động tạo trang chi tiết bài viết (`/blog/[slug]`).

## Cách tạo bài viết mới

1. Tạo file mới trong `content/posts`, ví dụ `2026-03-04-bai-moi.md`.
2. Thêm frontmatter (`title`, `summary`, `date`, `tags`).
3. Push lên GitHub, Cloudflare Pages sẽ build và publish bản mới.

## Chèn ảnh vào bài viết

1. Đặt ảnh vào thư mục `public/images/posts/<slug-bai-viet>/`.
2. Chèn ảnh trong Markdown:

```md
![Mô tả ảnh](/images/posts/2026-03-03-khoi-tao-blog/anh-minh-hoa.png)
```

## Ghi chú

Nếu bạn muốn ẩn bài viết trong quá trình soạn thảo, đặt:

```yaml
draft: true
```

trong frontmatter.
', 'published', '2026-03-03')
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');

INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES ('2026-03-04-gioi-thieu-cong-anh-dung', 'Giới thiệu: Công Anh Dũng và hành trình AI Infrastructure', 'Tôi là AI/ML Systems Architect ở Hà Nội, sở hữu hạ tầng AI từ provisioning cloud đến triển khai ML serving trên Kubernetes.', '["profile","devops","mlops","infrastructure","career"]', '
## Xin chào, tôi là Công Anh Dũng

Tôi là **AI/ML Systems Architect** (Hà Nội, Việt Nam), sở hữu hạ tầng AI từ đầu đến cuối — từ provisioning cloud đến triển khai ML serving thực chiến. Hiện tập trung vào:

- Solution architecture & cost engineering (chọn phần cứng bằng benchmark)
- Cloud & Kubernetes infrastructure (GKE, DigitalOcean, bare-metal kubeadm)
- Infrastructure as Code & GitOps (Terraform, Ansible, ArgoCD)
- ML serving & MLOps (ASR, TTS, pronunciation scoring, embedding)

Định hướng **CLI-first**, **tối ưu chi phí**, và ra quyết định theo **framework**. Thông tin này được đồng bộ theo portfolio `portfolio-dungca.ai-innovation-homelab.org` và GitHub `dungca1512`.

📄 [Tải CV (PDF)](https://portfolio-dungca.ai-innovation-homelab.org/CV_CongAnhDung.pdf) · 🌐 [Portfolio](https://portfolio-dungca.ai-innovation-homelab.org/) · 🤗 [Hugging Face](https://huggingface.co/dungca)

## Tôi đang xây dựng gì?

### 1. Pronunciation Scoring API (eUp)

Dịch vụ FastAPI chấm phát âm bằng wav2vec2 CTC forced alignment (GOP), lớp cache G2P và micro-batching trên GPU. Điểm đáng nói không nằm ở model mà ở cách chọn phần cứng: benchmark đo được **p95 1.86s với 20 người dùng đồng thời** (audio 15s), chỉ dùng **~8% GPU và ~2GB VRAM** — nghĩa là một GPU CUDA phổ thông là đủ, còn phương án H100 (~$2,475/tháng) hoàn toàn thừa. Phương án CPU-only cũng bị loại bằng số liệu: trần throughput ~1 req/s do Python GIL và băng thông bộ nhớ, tăng từ 16 lên 32 core không cải thiện gì.

### 2. Internal Embedding Service (eUp)

Tự host Qwen3-Embedding-4B, cung cấp endpoint `/v1/embeddings` tương thích OpenAI trên RTX 4080, thay thế hoàn toàn OpenAI Embedding API cho workload nội bộ. Phía trên là pipeline review code bằng RAG: `harvest -> embed -> LanceDB -> Qodo PR Agent`, kiểm soát bằng GitLab CI exit-code gate.

### 3. Homelab Kubernetes & GitOps

Repo: [homelab](https://github.com/dungca1512/homelab)

Cụm Kubernetes v1.31 ba node dựng tay bằng `kubeadm` thay vì dùng distro managed — Flannel CNI, MetalLB (L2), ingress-nginx, local-path storage, registry tự host. Deploy chỉ bằng `git push` qua ArgoCD App-of-Apps (prune + selfHeal), observability từ kube-prometheus-stack và Loki/Promtail. Kèm ~2.400 dòng ghi chú kỹ thuật, mỗi bài học gắn với một sự cố cluster thật.

### 4. Raspberry Pi Homelab — Ansible IaC & Slack ChatOps

Chiếc Raspberry Pi phục vụ toàn bộ LAN ở nhà được chuyển thành infrastructure as code: một playbook Ansible idempotent dựng lại nó từ OS trắng (mount `fstab`, Docker CE, giới hạn journald, cloudflared, Tailscale, AdGuard Home, cron dọn rác). Kết quả:

- DNS toàn LAN trên AdGuard Home (upstream DoH, blocklist VN, safebrowsing): độ trễ resolver **199ms → 27ms**
- Slack ChatOps qua Cloudflare Worker: lệnh `/homelab` xem trạng thái, alert Block Kit phân biệt **mất điện** với **mất mạng** kèm thời lượng và nguyên nhân được chẩn đoán
- CI `ansible-lint` + `yamllint` + `gitleaks`, backup cấu hình mã hóa GPG và runbook phục hồi — thẻ SD chết thì chỉ cần dựng lại, không phải điều tra

### 5. AI Gateway (multi-provider)

Repo: [ai-gateway](https://github.com/dungca1512/ai-gateway)

Gateway reactive Spring WebFlux hợp nhất OpenAI, Gemini, Anthropic và DashScope trong một lớp API, kèm các control quan trọng cho production:

- routing
- fallback/retry
- circuit breaker & bulkhead (Resilience4j)
- token usage tracking
- observability

Toàn bộ hạ tầng cũng chuyển từ runbook `gcloud` thủ công sang **Terraform** (bật API, GKE Autopilot, Artifact Registry, static IP nằm ngoài lifecycle cluster): dựng lại bằng `apply`, gần như $0 sau `destroy`.

### 6. Whisper Fine-tuning cho ASR tiếng Nhật

Repo: [whisper-finetune-ja](https://github.com/dungca1512/whisper-finetune-ja)

Vòng CI/CT/CD hoàn chỉnh: GitHub Actions điều phối, train trên Kaggle, hosting Hugging Face Hub, quality gate để promote model. Đã công bố [3 model ASR tiếng Nhật trên Hugging Face](https://huggingface.co/dungca) (bản LoRA đạt 40+ lượt tải) cùng bản export CTranslate2 INT8 cho inference giá rẻ.

## Quan điểm làm kỹ thuật của tôi

- Quyết định theo framework, không cảm tính: so sánh GPU/cloud trên giá, vị trí data center, SLA và độ trễ VN-JP-KR.
- Tối ưu chi phí mặc định: đo trước khi mua — chọn phần cứng vừa với workload đã benchmark, không mua theo vendor slide.
- CLI-first, tái lập được: Terraform, Ansible và GitOps để mọi môi trường dựng lại được từ code (kể cả cái Pi ở nhà).
- Gắn quan sát và suy giảm an toàn: xem lỗi provider/GPU là bình thường, luôn có fallback.

## Blog này sẽ viết gì?

Blog này sẽ tập trung vào 2 nhóm bài:

- ML cơ bản (để học đúng nền tảng)
- AI infrastructure & MLOps (để đưa mô hình vào hệ thống thật, chạy ổn định và tối ưu chi phí)

Nếu bạn muốn trao đổi công việc/hợp tác: `dungca@ai-innovation-homelab.org`.
', 'published', '2026-03-04')
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');

INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES ('2026-03-05-ml-co-ban-01-supervised-vs-unsupervised', 'ML cơ bản #1: Supervised vs Unsupervised Learning', 'Phân biệt 2 paradigms lớn trong machine learning, khi nào dùng và sai lầm phổ biến.', '["ml-basics","supervised-learning","unsupervised-learning"]', '
## Tại sao cần phân biệt?

Rất nhiều bạn mới học ML hay bắt đầu bằng model, nhưng bỏ qua câu hỏi quan trọng: **dữ liệu của bạn có label hay không?**

Câu hỏi này quyết định bạn đang ở bài toán supervised hay unsupervised.

## Supervised Learning

Bạn có dữ liệu đầu vào `X` và nhãn đúng `y`.
Model học hàm `f(X) -> y`.

Ví dụ:

- Phân loại email spam/không spam
- Dự đoán giá nhà
- Dự đoán churn

Model thường gặp:

- Linear/Logistic Regression
- Random Forest
- XGBoost
- Neural Network

## Unsupervised Learning

Bạn chỉ có dữ liệu `X`, **không có nhãn**.
Model tìm cấu trúc ẩn trong dữ liệu.

Ví dụ:

- Gom cụm khách hàng
- Giảm chiều để visualize
- Phát hiện bất thường

Model thường gặp:

- KMeans
- Hierarchical clustering
- DBSCAN
- PCA / t-SNE / UMAP

## Khi nào dùng cái nào?

- Nếu có label rõ ràng và mục tiêu là dự đoán -> supervised.
- Nếu chưa có label, muốn khám phá pattern -> unsupervised.

Trong hệ thống thực tế, 2 nhóm này thường kết hợp với nhau.

## Sai lầm phổ biến

1. Có ít label nhưng vẫn cố gắng train model phức tạp.
2. Dùng clustering rồi diễn giải cluster như "truth" tuyệt đối.
3. Không validate bài toán business trước khi chọn model.

## Checklist trước khi train

- Label chất lượng đến mức nào?
- Mục tiêu metric là gì (accuracy, recall, MAE...)?
- Có baseline đơn giản để so sánh chưa?

Bài tiếp theo: cách chia train/validation/test cho đúng.
', 'published', '2026-03-05')
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');

INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES ('2026-03-06-ml-co-ban-02-train-validation-test', 'ML cơ bản #2: Chia train / validation / test đúng cách', 'Hiểu đúng vai trò của từng tập dữ liệu để tránh overfitting và đánh giá sai model.', '["ml-basics","model-evaluation","data-split"]', '
## 3 tập dữ liệu có vai trò gì?

### Train set

Dùng để học tham số model.

### Validation set

Dùng để chọn hyperparameters, so sánh model, quyết định architecture.

### Test set

Chỉ dùng 1 lần ở cuối để ước lượng hiệu năng thực tế.

## Tỉ lệ chia tham khảo

- Nhỏ dữ liệu: 70/15/15
- Vừa/lớn dữ liệu: 80/10/10

Không có tỉ lệ "chuẩn duy nhất"; quan trọng là tính đại diện của mỗi tập.

## Nếu là dữ liệu theo thời gian?

Không random split.
Cần chia theo trục thời gian (train quá khứ, validate gần hiện tại, test là đoạn mới nhất).

Nếu random sai, bạn có thể bị data leakage.

## Cross-validation khi nào cần?

Với dataset nhỏ, K-fold cross-validation giúp kết quả ổn định hơn 1 lần split.

Nhưng nhớ:

- CV dùng cho model selection
- Cuối cùng vẫn phải có 1 test set giữ nguyên

## 4 lỗi đánh giá model rất hay gặp

1. Tune model dựa trên test set.
2. Chia random cho time-series.
3. Feature engineering trên toàn bộ data trước khi split.
4. Chỉ báo cáo 1 metric duy nhất.

## Rule thực chiến

- Đặt test set sang một bên ngay từ đầu.
- Mọi quyết định tuning phải dựa trên validation.
- Chỉ report final score trên test khi đã chốt model.

Bài tiếp theo: overfitting, underfitting và bias-variance tradeoff.
', 'published', '2026-03-06')
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');

INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES ('2026-03-07-ml-co-ban-03-overfitting-underfitting', 'ML cơ bản #3: Overfitting, underfitting và bias-variance', 'Nhầm hiểu phổ biến nhất khi train model và cách xử lý bằng regularization, data, validation.', '["ml-basics","overfitting","bias-variance"]', '
## Nhìn nhanh

- **Underfitting**: model quá đơn giản, học chưa đủ.
- **Overfitting**: model nhớ dữ liệu train quá kỹ, tổng quát kém.

## Dấu hiệu nhận biết

### Underfitting

- Train error cao
- Validation error cũng cao

### Overfitting

- Train error rất thấp
- Validation error cao hơn đáng kể

## Bias - Variance tradeoff

- Bias cao -> dễ underfit
- Variance cao -> dễ overfit

Mục tiêu là tìm điểm cân bằng phù hợp với dữ liệu và bài toán.

## Cách giảm overfitting

1. Thêm dữ liệu chất lượng.
2. Dùng regularization (L1/L2, dropout).
3. Early stopping.
4. Giảm độ phức tạp model.
5. Feature selection hợp lý.

## Cách giảm underfitting

1. Tăng độ phức tạp model.
2. Train thêm epoch (nếu chưa hội tụ).
3. Thêm feature có ý nghĩa.
4. Giảm regularization quá mạnh.

## Quy trình debug để xài ngay

1. Vẽ learning curve (train vs validation).
2. Xác định rõ đang bị underfit hay overfit.
3. Đổi 1 nhóm biến mỗi lần (model/data/regularization).
4. Log kết quả có hệ thống, tránh "thử ngẫu nhiên".

ML tốt không phải là model phức tạp nhất, mà là model ổn định nhất trên dữ liệu chưa gặp.
', 'published', '2026-03-07')
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');

INSERT INTO posts (slug, title, summary, tags, body_markdown, status, published_at)
VALUES ('2026-03-08-ml-co-ban-04-metrics-can-biet', 'ML cơ bản #4: Chọn metric đúng cho từng bài toán', 'Accuracy không đủ. Cách chọn metric phù hợp cho classification, regression và bài toán mất cân bằng.', '["ml-basics","metrics","model-evaluation"]', '
## Vì sao metric quan trọng?

Model có thể "đẹp" trên 1 metric nhưng thất bại trên mục tiêu business.

Ví dụ: dự đoán gian lận, accuracy cao vẫn vô nghĩa nếu bỏ sót quá nhiều case gian lận.

## Classification metrics cơ bản

- Accuracy: dễ hiểu, nhưng kém khi data imbalance.
- Precision: dự đoán positive thì đúng được bao nhiêu.
- Recall: bắt được bao nhiêu positive thật.
- F1-score: cân bằng precision và recall.
- AUC-ROC / AUC-PR: đánh giá theo toàn bộ threshold.

## Regression metrics cơ bản

- MAE: dễ diễn giải, ít nhạy với outlier hơn MSE.
- MSE/RMSE: phạt nặng lỗi lớn.
- R2: tỉ lệ phương sai được giải thích.

## Chọn metric theo ngữ cảnh

- Spam/phishing/fraud: ưu tiên recall + precision tradeoff.
- Đề xuất sản phẩm/nội dung: cần metric ranking (Precision@K, NDCG).
- Giá/forecast: bắt đầu với MAE + RMSE.

## Lưu ý về threshold

Classification không chỉ có 0.5.
Cần chọn threshold theo chi phí sai lệch (false positive vs false negative).

## Checklist trước khi report

1. Metric chính gắn với KPI business chưa?
2. Có báo cáo thêm metric bổ trợ không?
3. Có confusion matrix/phân tích lỗi hay chưa?
4. Có test theo nhóm dữ liệu quan trọng không?

Dùng metric đúng sẽ giúp bạn tránh những quyết định model "đẹp trên slide nhưng hỏng trên production".
', 'published', '2026-03-08')
ON CONFLICT(slug) DO UPDATE SET
  title = excluded.title,
  summary = excluded.summary,
  tags = excluded.tags,
  body_markdown = excluded.body_markdown,
  updated_at = datetime('now');