const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Apply Promo Code
router.post('/apply-coupon', async (req, res) => {
  const { userId, couponCode, orderAmount } = req.body;

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { code: couponCode },
    });

    if (!promo || !promo.isActive) {
      return res.status(400).json({ error: 'Invalid or inactive promo code' });
    }

    // Check minimum order value
    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      return res.status(400).json({ error: `Minimum order value ₹${promo.minOrderAmount} not met` });
    }

    // Check single-use restriction — return info but don't block it here
    let alreadyUsed = false;
    if (promo.singleUse) {
      const redemption = await prisma.promoRedemption.findFirst({
        where: { userId, promoCodeId: promo.id },
      });
      alreadyUsed = !!redemption;
    }

    // Calculate discount
    let discount = 0;
    if (promo.type === 'PERCENTAGE' && promo.discountPercent) {
      discount = (promo.discountPercent / 100) * orderAmount;
      if (promo.maxDiscount) {
        discount = Math.min(discount, promo.maxDiscount);
      }
    } else if (promo.type === 'FLAT' && promo.discountAmount) {
      discount = promo.discountAmount;
    }

    return res.json({
      success: true,
      discount,
      promoId: promo.id,
      type: promo.type.toLowerCase(),
      description: promo.description,
      minOrderValue: promo.minOrderAmount,
      maxDiscount: promo.maxDiscount,
      alreadyUsed,
    });

  } catch (err) {
    console.error('Error applying coupon:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});


// Add New Promo Code
router.post('/create-promo', async (req, res) => {
  const { code, type, discount, maxDiscount, minOrderValue, appliesToUsers, isActive } = req.body;

  try {
    const existing = await prisma.promoCode.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Promo code already exists' });
    }

    const promo = await prisma.promoCode.create({
      data: {
        code,
        type,
        discount,
        maxDiscount,
        minOrderValue,
        appliesToUsers,
        isActive: isActive ?? true,
      },
    });

    return res.status(201).json({ success: true, promo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

// Get All Promo Codes
router.get('/promos', async (req, res) => {
  try {
    const promos = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, promos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

module.exports = router;