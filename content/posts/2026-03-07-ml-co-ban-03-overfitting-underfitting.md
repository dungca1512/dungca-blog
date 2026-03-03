---
title: "ML co ban #3: Overfitting, underfitting va bias-variance"
summary: "Nham hieu pho bien nhat khi train model va cach xu ly bang regularization, data, validation."
date: "2026-03-07"
tags:
  - ml-basics
  - overfitting
  - bias-variance
---

## Nhin nhanh

- **Underfitting**: model qua don gian, hoc chua du.
- **Overfitting**: model nho du lieu train qua ky, tong quat kem.

## Dau hieu nhan biet

### Underfitting

- Train error cao
- Validation error cung cao

### Overfitting

- Train error rat thap
- Validation error cao hon dang ke

## Bias - Variance tradeoff

- Bias cao -> de underfit
- Variance cao -> de overfit

Muc tieu la tim diem can bang phu hop voi du lieu va bai toan.

## Cach giam overfitting

1. Them du lieu chat luong.
2. Dung regularization (L1/L2, dropout).
3. Early stopping.
4. Giam do phuc tap model.
5. Feature selection hop ly.

## Cach giam underfitting

1. Tang do phuc tap model.
2. Train them epoch (neu chua hoi tu).
3. Them feature co y nghia.
4. Giam regularization qua manh.

## Quy trinh debug de xai ngay

1. Ve learning curve (train vs validation).
2. Xac dinh ro dang bi underfit hay overfit.
3. Doi 1 nhom bien moi lan (model/data/regularization).
4. Log ket qua co he thong, tranh "thu ngau nhien".

ML tot khong phai la model phuc tap nhat, ma la model on dinh nhat tren du lieu chua gap.
