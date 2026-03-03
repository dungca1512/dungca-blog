---
title: "ML co ban #2: Chia train / validation / test dung cach"
summary: "Hieu dung vai tro cua tung tap du lieu de tranh overfitting va danh gia sai model."
date: "2026-03-06"
tags:
  - ml-basics
  - model-evaluation
  - data-split
---

## 3 tap du lieu co vai tro gi?

### Train set

Dung de hoc tham so model.

### Validation set

Dung de chon hyperparameters, so sanh model, quyet dinh architecture.

### Test set

Chi dung 1 lan o cuoi de uoc luong hieu nang thuc te.

## Ti le chia tham khao

- Nho du lieu: 70/15/15
- Vua/lon du lieu: 80/10/10

Khong co ti le "chuan duy nhat"; quan trong la tinh dai dien cua moi tap.

## Neu la du lieu theo thoi gian?

Khong random split.
Can chia theo truc thoi gian (train qua khu, validate gan hien tai, test la doan moi nhat).

Neu random sai, ban co the bi data leakage.

## Cross-validation khi nao can?

Voi dataset nho, K-fold cross-validation giup ket qua on dinh hon 1 lan split.

Nhung nho:

- CV dung cho model selection
- Cuoi cung van phai co 1 test set giu nguyen

## 4 loi danh gia model rat hay gap

1. Tune model dua tren test set.
2. Chia random cho time-series.
3. Feature engineering tren toan bo data truoc khi split.
4. Chi bao cao 1 metric duy nhat.

## Rule thuc chien

- Dat test set sang mot ben ngay tu dau.
- Moi quyet dinh tuning phai dua tren validation.
- Chi report final score tren test khi da chot model.

Bai tiep theo: overfitting, underfitting va bias-variance tradeoff.
