const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { bucket } = require('../firebase');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
// POST /add-menu
router.post('/add-menu', upload.array('images', 5), async (req, res) => {
  const {
    name,
    description,
    category,
    type,
    chefId,
    availability = true,
    prepTime,
    price,
    servingSize,
    spiceLevel,
  } = req.body;

  const imageFiles = req.files;
  console.log('Uploaded files:', req.files);


  if (!chefId || !name || !description || !category || !type || !price || !servingSize || !spiceLevel) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const imageUrls = [];

    for (const file of imageFiles) {
      const destFileName = `dishes/${chefId}_${Date.now()}_${file.originalname}`;
      await bucket.upload(file.path, {
        destination: destFileName,
        metadata: {
          contentType: file.mimetype,
          metadata: {
            firebaseStorageDownloadTokens: uuidv4(),
          },
        },
      });

      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destFileName)}?alt=media`;
      imageUrls.push(imageUrl);
    }

    const dish = await prisma.dish.create({
      data: {
        name,
        description,
        category,
        type,
        imageUrls,
        availability: availability === 'false' ? false : true,
        prepTime: parseInt(prepTime) || 0,
        price: parseFloat(price),
        servingSize,
        spiceLevel,
        chefId,
      },
    });

    res.status(201).json({ success: true, dish });
  } catch (err) {
    console.error('Error adding dish:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


router.put('/dish/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;

  try {
    const updated = await prisma.dish.update({
      where: { id },
      data: { availability },
    });

    res.json({ success: true, dish: updated });
  } catch (err) {
    console.error('Error updating availability:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/dishes/:chefId', async (req, res) => {
  const { chefId } = req.params;
  try {
    const dishes = await prisma.dish.findMany({
      where: { chefId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, dishes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/delete-dish/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Check if dish exists
    const existingDish = await prisma.dish.findUnique({ where: { id } });

    if (!existingDish) {
      return res.status(404).json({ success: false, message: 'Dish not found' });
    }

    // Delete dish
    await prisma.dish.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Dish deleted successfully' });
  } catch (err) {
    console.error('Error deleting dish:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
