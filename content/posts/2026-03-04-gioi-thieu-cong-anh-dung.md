---
title: "Gioi thieu: Cong Anh Dung va hanh trinh AI Engineering"
summary: "Toi la AI/ML Engineer o Ha Noi, xay he thong LLM production, research agent, ASR va data platform."
date: "2026-03-04"
tags:
  - profile
  - ai-engineer
  - career
---

## Xin chao, toi la Cong Anh Dung

Toi la **AI/ML Engineer** (Ha Noi, Viet Nam), hien dang tap trung vao cac bai toan:

- LLM platform engineering
- Research automation agents
- Speech/NLP systems
- Data + recommendation infrastructure

Thong tin nay duoc dong bo theo portfolio `dungca1512.github.io` va GitHub `dungca1512`.

## Toi dang xay dung gi?

### 1. AI Gateway (multi-provider)

Repo: [ai-gateway](https://github.com/dungca1512/ai-gateway)

Muc tieu la hop nhat truy cap OpenAI, Gemini, Claude va local worker trong 1 lop API, dong thoi bo sung cac control quan trong cho production:

- routing
- fallback/retry
- rate limiting
- cache
- circuit breaker
- observability

### 2. Research Agent

Repo: [research-agent](https://github.com/dungca1512/research-agent)

Toi xay pipeline LangChain + LangGraph theo vong lap:

`decompose -> search -> synthesize -> report`

He thong ket hop tim kiem web va ArXiv de tao bao cao co tinh cau truc.

### 3. Whisper Fine-tuning cho ASR tieng Nhat

Repo: [whisper-finetune-ja](https://github.com/dungca1512/whisper-finetune-ja)

Toi quan tam den quy trinh train co the tai lap va van hanh on dinh cho speech system, tu train script den export/inference.

## Quan diem lam ky thuat cua toi

- Uu tien reliability truoc khi toi uu do phuc tap.
- Ket hop AI sinh voi deterministic checks (validator/schema/log).
- Luon thiet ke fallback cho tinh huong provider/model khong on dinh.
- Xay he thong de co the do luong duoc ket qua business.

## Blog nay se viet gi?

Blog nay se tap trung vao 2 nhom bai:

- ML co ban (de hoc dung nen tang)
- AI production engineering (de dua mo hinh vao he thong that)

Neu ban muon trao doi cong viec/hop tac: `dungca1512@gmail.com`.
