const express = require('express');
const axios = require('axios');
const router = express.Router();

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_URL = 'https://sandbox.cashfree.com/pg/orders';

router.post('/create-order-token', async (req, res) => {
  const { orderId, orderAmount, customerName, customerPhone, customerEmail } = req.body;
  console.log('Received create-order-token request:', req.body);

  if (!orderId || !orderAmount || !customerName || !customerPhone || !customerEmail) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
    });
  }

  try {
    const response = await axios.post(
      CASHFREE_API_URL,
      {
        order_id: orderId,
        order_amount: parseFloat(orderAmount),
        order_currency: 'INR',
        customer_details: {
          customer_id: customerPhone,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
    order_meta: {
			return_url:
				"https://test.cashfree.com/pgappsdemos/return.php?order_id=order_123",
		},

      },
      {
        headers: {
          'x-client-id': CASHFREE_APP_ID,
          'x-client-secret': CASHFREE_SECRET_KEY,
          'x-api-version': '2023-08-01',
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data;
    console.log('Cashfree Order Created:', {
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
    });

    return res.json({
      success: true,
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
    });
  } catch (error) {
    console.error('Cashfree Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: error.response?.data?.message || 'Failed to create Cashfree order',
    });
  }
});

router.get('/verify-order/:orderId', async (req, res) => {
  const orderId = req.params.orderId;

  try {
    const verifyRes = await axios.get(`${CASHFREE_API_URL}/${orderId}`, {
      headers: {
        'x-client-id': CASHFREE_APP_ID,
        'x-client-secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01',
      },
    });

    const orderStatus = verifyRes.data.order_status;
    return res.json({
      success: true,
      order_status: orderStatus,
      fullDetails: verifyRes.data,
    });
  } catch (err) {
    console.error('Verification Error:', err?.response?.data || err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify order',
    });
  }
});

router.post('/cashfree-webhook', (req, res) => {
  console.log('Webhook received:', req.body);
  res.status(200).send('Webhook received');
});

module.exports = router;