const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const promo = await prisma.promoCode.create({
    data: {
      code: "NEW50",
      description: "Flat ₹100 Off",
      type: "FLAT",                     // 👈 FLAT type
      discountAmount: 100,             // ✅ set flat discount here
      minOrderAmount: 200,
      isActive: true,
      singleUse: true,
      applicableRoles: ["User", "chef"],
      expiryDate: new Date("2025-12-31"),
    },
  });

  console.log("Promo code created:", promo);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
