---
title: "ML cơ bản #1: Supervised vs Unsupervised Learning"
summary: "Phân biệt 2 paradigms lớn trong machine learning, khi nào dùng và sai lầm phổ biến."
date: "2026-03-05"
tags:
  - ml-basics
  - supervised-learning
  - unsupervised-learning
---

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
