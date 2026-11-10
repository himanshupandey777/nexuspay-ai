import express from 'express';
import { createPayout, getPayoutBatchStatus, getPayoutItemStatus } from '../services/paypalService.js';

const router = express.Router();

/**
 * POST /api/payments/payout
 * Creates a PayPal payout
 * Body: { email, amount, currency, note, senderItemId }
 */
router.post('/payout', async (req, res) => {
  try {
    const { email, amount, currency = 'USD', note, senderItemId } = req.body;
    
    // Validation
    if (!email || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Email and amount are required',
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }
    
    const result = await createPayout({
      email,
      amount: parseFloat(amount),
      currency,
      note,
      senderItemId,
    });
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create payout',
        error: result.error,
        details: result.details,
      });
    }
    
    res.json({
      success: true,
      batchId: result.batchId,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/batch/:batchId
 * Check status of a payout batch
 */
router.get('/batch/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const result = await getPayoutBatchStatus(batchId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch batch status',
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/item/:itemId
 * Check status of a specific payout item
 */
router.get('/item/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const result = await getPayoutItemStatus(itemId);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch item status',
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      status: result.status,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

export default router;