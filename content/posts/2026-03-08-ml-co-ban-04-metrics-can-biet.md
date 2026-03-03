---
title: "ML cơ bản #4: Chọn metric đúng cho từng bài toán"
summary: "Accuracy không đủ. Cách chọn metric phù hợp cho classification, regression và bài toán mất cân bằng."
date: "2026-03-08"
tags:
  - ml-basics
  - metrics
  - model-evaluation
---

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
