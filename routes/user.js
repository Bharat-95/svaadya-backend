const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const { bucket } = require("../firebase");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const path = require("path");
const os = require("os");
const fs = require("fs/promises");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// Route 1: Register User
router.post("/register-user", upload.single("photo"), async (req, res) => {
  const {
    phone,
    fullName,
    email,
    role = "User",
    availability = true,
  } = req.body;
  const photoFile = req.file;

  try {
    const existingUser = await prisma.user.findFirst({
      where: { phone, role }, // now checks both phone and role
    });

    if (existingUser) {
      return res
        .status(400)
        .json({
          success: false,
          message: `User with role '${role}' already exists`,
        });
    }

    let uploadedImageUrl = "";
    if (photoFile) {
      const destFileName = `users/profile_${phone}_${uuidv4()}.jpg`;
      await bucket.upload(photoFile.path, {
        destination: destFileName,
        metadata: {
          contentType: photoFile.mimetype,
          metadata: {
            firebaseStorageDownloadTokens: uuidv4(),
          },
        },
      });

      uploadedImageUrl = `https://firebasestorage.googleapis.com/v0/b/${
        bucket.name
      }/o/${encodeURIComponent(destFileName)}?alt=media`;
    }

    const newUser = await prisma.user.create({
      data: {
        phone,
        fullName,
        email,
        photoUrl: uploadedImageUrl,
        role,
        availability: availability === "false" ? false : true,
      },
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/user/:phone", async (req, res) => {
  const { phone } = req.params;

  if (!phone) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        phone: String(phone),
        role: "User",
      },
    });

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (err) {
    console.error("Error fetching user by phone:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/chef-user/:phone", async (req, res) => {
  const { phone } = req.params;

  if (!phone) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        phone: String(phone),
        role: "chef", // fixed role for Svaadya-Chef
      },
    });

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(404).json({ success: false, message: "Chef not found" });
    }
  } catch (err) {
    console.error("Error fetching chef user:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Route 2: Check if user exists
router.get("/user-exists", async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res.status(400).json({ error: "Phone number is required" });
  }

  try {
    const users = await prisma.user.findMany({
      where: { phone: String(phone) },
    });

    const chefUser = users.find((u) => u.role === "chef");

    if (chefUser) {
      res.json({ exists: true, user: chefUser });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/user-role-check", async (req, res) => {
  const { phone } = req.query;

  if (!phone) {
    return res
      .status(400)
      .json({ success: false, message: "Phone number is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        phone: String(phone),
        role: "User",
      },
    });

    if (user) {
      res.json({ exists: true, user });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/available-chefs-with-dishes", async (req, res) => {
  try {
    const chefs = await prisma.user.findMany({
      where: {
        role: "chef",
        availability: true,
      },
      include: {
        dishes: {
          where: { availability: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        addresses: {
          where: {
            latitude: {
              not: 0,
            },
            longitude: {
              not: 0,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    const formattedChefs = chefs.map((chef) => ({
      id: chef.id,
      name: chef.fullName,
      photoUrl: chef.photoUrl,
      rating: chef.rating ?? 4.5,
      latitude: chef.addresses[0]?.latitude,
      longitude: chef.addresses[0]?.longitude,
      dishes: chef.dishes,
    }));

    res.json({ success: true, chefs: formattedChefs });
  } catch (error) {
    console.error("Error fetching chefs:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/save-address", async (req, res) => {
  const {
    userId,
    fullName,
    phone,
    houseNo,
    floor,
    area,
    landmark,
    city,
    state,
    pincode,
    latitude,
    longitude,
  } = req.body;

  console.log("Received address payload:", req.body);

  // Simple validation
  if (
    !userId ||
    !fullName ||
    !phone ||
    !houseNo ||
    !floor ||
    !area ||
    !city ||
    !state ||
    !pincode ||
    !latitude ||
    !longitude
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    const address = await prisma.address.create({
      data: {
        userId,
        fullName,
        phone,
        houseNo,
        floor,
        area,
        landmark,
        city,
        state,
        pincode,
        latitude,
        longitude,
      },
    });

    res.status(201).json({ success: true, address });
  } catch (error) {
    console.error("Error saving address:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/user/addresses/:userId", async (req, res) => {
  const { userId } = req.params;
  console.log(req.params);

  try {
    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, addresses });
  } catch (err) {
    console.error("Error fetching addresses:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Update an address
router.put("/user/address/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;

  try {
    const updated = await prisma.address.update({
      where: { id },
      data,
    });
    res.json({ success: true, address: updated });
  } catch (err) {
    console.error("Error updating address:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Delete an address
router.delete("/user/address/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.address.delete({ where: { id } });
    res.json({ success: true, message: "Address deleted" });
  } catch (err) {
    console.error("Error deleting address:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.put("/user/:id/availability", async (req, res) => {
  const { id } = req.params;
  const { availability } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: { availability },
    });

    res.json({ success: true, user: updated });
  } catch (err) {
    console.error("Error updating availability:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
