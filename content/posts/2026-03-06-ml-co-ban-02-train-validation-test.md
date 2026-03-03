---
title: "ML cơ bản #2: Chia train / validation / test đúng cách"
summary: "Hiểu đúng vai trò của từng tập dữ liệu để tránh overfitting và đánh giá sai model."
date: "2026-03-06"
tags:
  - ml-basics
  - model-evaluation
  - data-split
---

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
