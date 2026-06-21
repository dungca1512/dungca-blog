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

- Solution architecture & cost engineering
- Cloud & Kubernetes infrastructure (GKE, DigitalOcean, bare-metal)
- ML serving & MLOps (ASR, TTS, pronunciation scoring, embedding)
- Streaming & data infrastructure

Định hướng **CLI-first**, **tối ưu chi phí**, và ra quyết định theo **framework**. Thông tin này được đồng bộ theo portfolio `dungca1512.github.io` và GitHub `dungca1512`.

## Tôi đang xây dựng gì?

### 1. Pronunciation Scoring API (eUp)

Dịch vụ FastAPI chấm phát âm tiếng Nhật bằng wav2vec2 CTC forced alignment, lớp cache G2P và micro-batching trên GPU. Hướng tới độ trễ <3s cho 20 người dùng đồng thời trên một GPU GCP L4 / RTX 4000 Ada — chọn theo framework chi phí GPU đa tiêu chí thay vì over-provisioning A100/H100.

### 2. Internal Embedding Service (eUp)

Tự host Qwen3-Embedding-4B, cung cấp endpoint `/v1/embeddings` tương thích OpenAI trên RTX 4080, thay thế hoàn toàn OpenAI Embedding API cho workload nội bộ. Phía trên là pipeline review code bằng RAG: `harvest -> embed -> LanceDB -> Qodo PR Agent`, kiểm soát bằng GitLab CI exit-code gate.

### 3. AI Gateway (multi-provider)

Repo: [ai-gateway](https://github.com/dungca1512/ai-gateway)

Gateway reactive Spring WebFlux hợp nhất OpenAI, Gemini, Anthropic và DashScope trong một lớp API, kèm các control quan trọng cho production:

- routing
- fallback/retry
- circuit breaker & bulkhead (Resilience4j)
- token usage tracking
- observability

### 4. Whisper Fine-tuning cho ASR tiếng Nhật

Repo: [whisper-finetune-ja](https://github.com/dungca1512/whisper-finetune-ja)

Quy trình train tái lập được cho speech system, từ train script đến export/inference — đã công bố 3 model ASR tiếng Nhật trên Hugging Face.

## Quan điểm làm kỹ thuật của tôi

- Quyết định theo framework, không cảm tính: so sánh GPU/cloud trên giá, vị trí data center, SLA và độ trễ VN-JP-KR.
- Tối ưu chi phí mặc định: chọn phần cứng vừa với workload, chứng minh đánh đổi bằng benchmark trước khi provisioning.
- CLI-first, tái lập được: Terraform, Ansible và GitOps để mọi môi trường dựng lại được từ code.
- Gắn quan sát và suy giảm an toàn: xem lỗi provider/GPU là bình thường, luôn có fallback.

## Blog này sẽ viết gì?

Blog này sẽ tập trung vào 2 nhóm bài:

- ML cơ bản (để học đúng nền tảng)
- AI infrastructure & MLOps (để đưa mô hình vào hệ thống thật, chạy ổn định và tối ưu chi phí)

Nếu bạn muốn trao đổi công việc/hợp tác: `dungca1512@gmail.com`.
