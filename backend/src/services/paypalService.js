import paypal from '@paypal/payouts-sdk';

// Configure PayPal environment
const environment = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  
  if (process.env.PAYPAL_MODE === 'live') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

const client = () => {
  return new paypal.core.PayPalHttpClient(environment());
};

/**
 * Create a payout to a freelancer
 * @param {Object} params
 * @param {string} params.email - Freelancer's PayPal email
 * @param {number} params.amount - Amount to send
 * @param {string} params.currency - Currency code (USD, EUR, etc.)
 * @param {string} params.note - Optional note for the payment
 * @param {string} params.senderItemId - Unique ID for tracking
 */
export const createPayout = async ({ email, amount, currency, note, senderItemId }) => {
  try {
    const request = new paypal.payouts.PayoutsPostRequest();
    
    request.requestBody({
      sender_batch_header: {
        sender_batch_id: senderItemId || `batch_${Date.now()}`,
        email_subject: 'NexusPay AI: Milestone Payment',
        email_message: note || 'Payment for completed milestone verified by AI.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: currency.toUpperCase(),
          },
          receiver: email,
          note: note || 'Milestone payment',
          sender_item_id: senderItemId || `item_${Date.now()}`,
        },
      ],
    });

    const response = await client().execute(request);
    console.log('✅ PayPal Payout Created:', response.result);
    
    return {
      success: true,
      batchId: response.result.batch_header.payout_batch_id,
      status: response.result.batch_header.batch_status,
      data: response.result,
    };
  } catch (error) {
    console.error('❌ PayPal Payout Error:', error.message);
    return {
      success: false,
      error: error.message,
      details: error.details || null,
    };
  }
};

/**
 * Check the status of a specific payout item
 */
export const getPayoutItemStatus = async (payoutItemId) => {
  try {
    const request = new paypal.payouts.PayoutItemGetRequest(payoutItemId);
    const response = await client().execute(request);
    
    return {
      success: true,
      status: response.result.transaction_status,
      data: response.result,
    };
  } catch (error) {
    console.error('❌ PayPal Payout Status Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Check the status of an entire payout batch
 */
export const getPayoutBatchStatus = async (batchId) => {
  try {
    const request = new paypal.payouts.PayoutsGetRequest(batchId);
    const response = await client().execute(request);
    
    return {
      success: true,
      status: response.result.batch_header.batch_status,
      data: response.result,
    };
  } catch (error) {
    console.error('❌ PayPal Batch Status Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};