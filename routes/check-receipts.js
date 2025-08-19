const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// POST { ids: ["<ticketId>", ...] }
router.post('/', async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || !ids.length) {
      return res.status(400).json({ error: 'Provide { ids: [ticketId, ...] }' });
    }

    let receipts = {};
    for (const chunk of expo.chunkPushNotificationReceiptIds(ids)) {
      const part = await expo.getPushNotificationReceiptsAsync(chunk);
      Object.assign(receipts, part);
    }
    res.json({ receipts });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
