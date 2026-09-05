---
title: "Giới thiệu: Công Anh Dũng và hành trình AI Infrastructure"
summary: "Tôi là AI/ML Systems Architect ở Hà Nội, sở hữu hạ tầng AI từ provisioning cloud đến triển khai ML serving trên Kubernetes."
date: "2026-03-04"
tags:
  - profile
  - devops
  - mlops
  - infrastructure
  - career
---

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
