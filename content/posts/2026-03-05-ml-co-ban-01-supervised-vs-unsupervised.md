---
title: "ML co ban #1: Supervised vs Unsupervised Learning"
summary: "Phan biet 2 paradigms lon trong machine learning, khi nao dung va sai lam pho bien."
date: "2026-03-05"
tags:
  - ml-basics
  - supervised-learning
  - unsupervised-learning
---

## Tai sao can phan biet?

Rat nhieu ban moi hoc ML hay bat dau bang model, nhung bo qua cau hoi quan trong: **du lieu cua ban co label hay khong?**

Cau hoi nay quyet dinh ban dang o bai toan supervised hay unsupervised.

## Supervised Learning

Ban co du lieu dau vao `X` va nhan dung `y`.
Model hoc ham `f(X) -> y`.

Vi du:

- Phan loai email spam/khong spam
- Du doan gia nha
- Du doan churn

Model thuong gap:

- Linear/Logistic Regression
- Random Forest
- XGBoost
- Neural Network

## Unsupervised Learning

Ban chi co du lieu `X`, **khong co nhan**.
Model tim cau truc an trong du lieu.

Vi du:

- Gom cum khach hang
- Giam chieu de visualize
- Phat hien bat thuong

Model thuong gap:

- KMeans
- Hierarchical clustering
- DBSCAN
- PCA / t-SNE / UMAP

## Khi nao dung cai nao?

- Neu co label ro rang va muc tieu la du doan -> supervised.
- Neu chua co label, muon kham pha pattern -> unsupervised.

Trong he thong thuc te, 2 nhom nay thuong ket hop voi nhau.

## Sai lam pho bien

1. Co it label nhung van co gang train model phuc tap.
2. Dung clustering roi dien giai cluster nhu "truth" tuyet doi.
3. Khong validate bai toan business truoc khi chon model.

## Checklist truoc khi train

- Label chat luong den muc nao?
- Muc tieu metric la gi (accuracy, recall, MAE...)?
- Co baseline don gian de so sanh chua?

Bai tiep theo: cach chia train/validation/test cho dung.
