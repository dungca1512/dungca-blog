---
title: "ML cơ bản #3: Overfitting, underfitting và bias-variance"
summary: "Nhầm hiểu phổ biến nhất khi train model và cách xử lý bằng regularization, data, validation."
date: "2026-03-07"
tags:
  - ml-basics
  - overfitting
  - bias-variance
---

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
