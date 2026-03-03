---
title: "ML co ban #4: Chon metric dung cho tung bai toan"
summary: "Accuracy khong du. Cach chon metric phu hop cho classification, regression va bai toan mat can bang."
date: "2026-03-08"
tags:
  - ml-basics
  - metrics
  - model-evaluation
---

## Vi sao metric quan trong?

Model co the "dep" tren 1 metric nhung that bai tren muc tieu business.

Vi du: du doan gian lan, accuracy cao van vo nghia neu bo sot qua nhieu case gian lan.

## Classification metrics co ban

- Accuracy: de hieu, nhung kem khi data imbalance.
- Precision: du doan positive thi dung duoc bao nhieu.
- Recall: bat duoc bao nhieu positive that.
- F1-score: can bang precision va recall.
- AUC-ROC / AUC-PR: danh gia theo toan bo threshold.

## Regression metrics co ban

- MAE: de dien giai, it nhay voi outlier hon MSE.
- MSE/RMSE: phat nang loi lon.
- R2: ty le phuong sai duoc giai thich.

## Chon metric theo ngu canh

- Spam/phishing/fraud: uu tien recall + precision tradeoff.
- De xuat san pham/noi dung: can metric ranking (Precision@K, NDCG).
- Gia/forecast: bat dau voi MAE + RMSE.

## Luu y ve threshold

Classification khong chi co 0.5.
Can chon threshold theo chi phi sai lech (false positive vs false negative).

## Checklist truoc khi report

1. Metric chinh gan voi KPI business chua?
2. Co bao cao them metric bo tro khong?
3. Co confusion matrix/phan tich loi hay chua?
4. Co test theo nhom du lieu quan trong khong?

Dung metric dung se giup ban tranh nhung quyet dinh model "dep tren slide nhung hong tren production".
