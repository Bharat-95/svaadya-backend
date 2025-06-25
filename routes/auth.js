// twilioRoutes.js
const express = require('express');
const router = express.Router();
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send OTP
router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;

  try {
    const verification = await client.verify
      .v2.services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to: `+91${phone}`,
        channel: 'sms',
      });

    res.status(200).json({ success: true, sid: verification.sid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { phone, code } = req.body;

  try {
    const verification_check = await client.verify
      .v2.services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to: `+91${phone}`,
        code,
      });

    if (verification_check.status === 'approved') {
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Invalid code' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/otp', async(req, res) =>{
    res.send("Auth is working")
})

module.exports = router;
