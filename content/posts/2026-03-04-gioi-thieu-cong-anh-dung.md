---
title: "Giới thiệu: Công Anh Dũng và hành trình AI Engineering"
summary: "Tôi là AI/ML Engineer ở Hà Nội, xây hệ thống LLM production, research agent, ASR và data platform."
date: "2026-03-04"
tags:
  - profile
  - ai-engineer
  - career
---

## Xin chào, tôi là Công Anh Dũng

Tôi là **AI/ML Engineer** (Hà Nội, Việt Nam), hiện đang tập trung vào các bài toán:

- LLM platform engineering
- Research automation agents
- Speech/NLP systems
- Data + recommendation infrastructure

Thông tin này được đồng bộ theo portfolio `dungca1512.github.io` và GitHub `dungca1512`.

## Tôi đang xây dựng gì?

### 1. AI Gateway (multi-provider)

Repo: [ai-gateway](https://github.com/dungca1512/ai-gateway)

Mục tiêu là hợp nhất truy cập OpenAI, Gemini, Claude và local worker trong 1 lớp API, đồng thời bổ sung các control quan trọng cho production:

- routing
- fallback/retry
- rate limiting
- cache
- circuit breaker
- observability

### 2. Research Agent

Repo: [research-agent](https://github.com/dungca1512/research-agent)

Tôi xây pipeline LangChain + LangGraph theo vòng lặp:

`decompose -> search -> synthesize -> report`

Hệ thống kết hợp tìm kiếm web và ArXiv để tạo báo cáo có tính cấu trúc.

### 3. Whisper Fine-tuning cho ASR tiếng Nhật

Repo: [whisper-finetune-ja](https://github.com/dungca1512/whisper-finetune-ja)

Tôi quan tâm đến quy trình train có thể tái lập và vận hành ổn định cho speech system, từ train script đến export/inference.

## Quan điểm làm kỹ thuật của tôi

- Ưu tiên reliability trước khi tối ưu độ phức tạp.
- Kết hợp AI sinh với deterministic checks (validator/schema/log).
- Luôn thiết kế fallback cho tình huống provider/model không ổn định.
- Xây hệ thống để có thể đo lường được kết quả business.

## Blog này sẽ viết gì?

Blog này sẽ tập trung vào 2 nhóm bài:

- ML cơ bản (để học đúng nền tảng)
- AI production engineering (để đưa mô hình vào hệ thống thật)

Nếu bạn muốn trao đổi công việc/hợp tác: `dungca1512@gmail.com`.
