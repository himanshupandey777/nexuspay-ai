
import express from 'express';
import Milestone from '../models/milestone.js';

import { getFullPullRequestData } from '../services/githubService.js';

import { verifyMilestone } from '../services/aiService.js';

import { createPayout } from '../services/paypalService.js';

const router = express.Router();

// ==========================================
// PROCESS MILESTONE
// ==========================================

router.post('/process', async (req, res) => {
  let milestone;
  let payoutSubmitted = false;

  try {
    const {
      projectId,
      title,
      description,
      projectScope,
      amount,
      currency,
      githubUrl,
      freelancerEmail,
      clientOverride,
      overrideReason,
    } = req.body;

    // 1. Validate required fields
    if (
      typeof projectScope !== 'string' ||
      !projectScope.trim() ||
      typeof githubUrl !== 'string' ||
      !githubUrl.trim() ||
      typeof freelancerEmail !== 'string' ||
      !freelancerEmail.trim() ||
      amount === undefined ||
      amount === null ||
      amount === ''
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a valid positive number',
      });
    }

    const senderCurrency = String(currency || 'USD')
      .trim()
      .toUpperCase();

    if (!/^[A-Z]{3}$/.test(senderCurrency)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency code',
      });
    }

    const cleanGithubUrl = githubUrl.trim();
    const cleanEmail = freelancerEmail.trim();

    // 2. Validate client override
    const overrideRequested = clientOverride === true;

    const overrideEnabled =
      process.env.ENABLE_DEMO_CLIENT_OVERRIDE === 'true';

    if (overrideRequested && !overrideEnabled) {
      return res.status(403).json({
        success: false,
        message: 'Client override is disabled.',
      });
    }

    if (
      overrideRequested &&
      (typeof overrideReason !== 'string' || !overrideReason.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: 'An override reason is required.',
      });
    }

    console.log('\n🎯 Starting Milestone Processing Pipeline...\n');

    // 3. Create milestone record
    milestone = new Milestone({
      projectId: projectId || `proj_${Date.now()}`,
      title: title || 'Milestone Payment',
      description: description || '',
      amount: parsedAmount,
      currency: senderCurrency,
      githubUrl: cleanGithubUrl,
      freelancerEmail: cleanEmail,
      status: 'pending',
    });

    await milestone.save();

    // 4. Fetch GitHub pull request data
    console.log('📡 Fetching GitHub PR data...');

    const githubResult = await getFullPullRequestData(cleanGithubUrl);

    if (!githubResult.success) {
      milestone.status = 'failed';
      await milestone.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch GitHub data',
        error: githubResult.error,
        milestoneId: milestone._id,
      });
    }

    // 5. AI verification
    console.log('🧠 Running AI verification...');

    const verificationResult = await verifyMilestone({
      projectScope: projectScope.trim(),
      githubData: githubResult.data,
    });

    if (!verificationResult.success) {
      milestone.status = 'failed';
      await milestone.save();

      return res.status(500).json({
        success: false,
        message: 'AI verification failed',
        error: verificationResult.error,
        milestoneId: milestone._id,
      });
    }

    const aiResult = verificationResult.data;

    // 6. Normalize AI confidence score
    const rawConfidence = Number(aiResult.confidenceScore);

    if (
      !Number.isFinite(rawConfidence) ||
      rawConfidence < 0 ||
      rawConfidence > 100
    ) {
      milestone.status = 'failed';
      await milestone.save();

      return res.status(500).json({
        success: false,
        message: 'AI returned an invalid confidence score',
        verification: aiResult,
        milestoneId: milestone._id,
      });
    }

    const confidenceScore =
      rawConfidence <= 1
        ? rawConfidence * 100
        : rawConfidence;

    console.log('📊 AI Confidence:', confidenceScore);

    // 7. Determine verification result
    const isVerified =
      aiResult.verified === true &&
      confidenceScore >= 70 &&
      aiResult.recommendation === 'approve';

    const overrideApproved =
      !isVerified &&
      overrideRequested &&
      overrideEnabled &&
      Boolean(overrideReason?.trim());

    milestone.aiVerification = {
      verified: isVerified,
      confidenceScore,
      reasoning: aiResult.reasoning,
      verifiedAt: new Date(),
    };

    milestone.clientOverride = overrideApproved;

    if (overrideApproved) {
      milestone.overrideReason = overrideReason.trim();
    }

    // 8. Reject if neither AI nor client approved
    if (!isVerified && !overrideApproved) {
      console.log('❌ Milestone rejected by AI verification');

      milestone.status = 'failed';
      await milestone.save();

      return res.json({
        success: false,
        message: 'AI did not verify the milestone',
        milestoneId: milestone._id,
        verification: {
          ...aiResult,
          confidenceScore,
        },
      });
    }

    if (overrideApproved) {
      console.log('⚠️ CLIENT OVERRIDE ACCEPTED');
      console.log('Override reason:', overrideReason.trim());
    } else {
      console.log('✅ AI verification approved');
    }

    milestone.status = 'verified';
    await milestone.save();

    // 9. Execute PayPal payout
    console.log('💰 Executing PayPal payout...');

    const payoutCurrency = milestone.currency;

    const payoutNote = overrideApproved
      ? `Client override payment for: ${title || 'Milestone'}. Reason: ${overrideReason.trim()}`
      : `Payment for: ${title || 'Milestone'}. AI verified with ${confidenceScore}% confidence.`;

    const payoutResult = await createPayout({
      email: cleanEmail,
      amount: milestone.amount,
      currency: payoutCurrency,
      note: payoutNote,
      senderItemId: `milestone_${milestone._id}`,
    });

    if (!payoutResult.success) {
      milestone.status = 'failed';
      await milestone.save();

      return res.status(500).json({
        success: false,
        message: 'PayPal payout failed',
        error: payoutResult.error,
        milestoneId: milestone._id,
        verification: {
          ...aiResult,
          confidenceScore,
        },
        clientOverride: overrideApproved,
      });
    }

    // From this point onward, PayPal has accepted the submission.
    // Do not mark it failed just because a later save fails.
    payoutSubmitted = true;

    // 10. Save payout details and map PayPal status
    const paypalStatus = String(
      payoutResult.status || 'PENDING'
    ).toUpperCase();

    milestone.paypalPayoutId = payoutResult.batchId;

    if (paypalStatus === 'SUCCESS') {
      milestone.status = 'paid';
    } else if (
      paypalStatus === 'DENIED' ||
      paypalStatus === 'CANCELED'
    ) {
      milestone.status = 'failed';
    } else {
      // PENDING / PROCESSING are not completed payments
      milestone.status = 'pending';
    }

    await milestone.save();

    console.log(
      `📦 PayPal payout submitted with status: ${paypalStatus}`
    );

    // 11. Return result
    return res.json({
      success: true,

      message:
        milestone.status === 'paid'
          ? 'Milestone payment completed successfully'
          : milestone.status === 'failed'
            ? 'PayPal payout was not completed'
            : 'Milestone verified and payout submitted',

      milestoneId: milestone._id,

      verification: {
        ...aiResult,
        confidenceScore,
        clientOverride: overrideApproved,
        overrideReason: overrideApproved
          ? overrideReason.trim()
          : undefined,
      },

      payout: {
        batchId: payoutResult.batchId,
        status: paypalStatus,
        amount: milestone.amount,
        currency: payoutCurrency,
      },

      summary: {
        workVerified: isVerified,
        clientOverride: overrideApproved,
        confidenceScore,
        paymentStatus: paypalStatus,
      },
    });

  } catch (error) {
    console.error(
      '❌ Milestone Processing Error:',
      error.message
    );

    // Do not mark a submitted PayPal payout as failed.
    if (milestone && !payoutSubmitted) {
      try {
        milestone.status = 'failed';
        await milestone.save();
      } catch (saveError) {
        console.error(
          'Could not update milestone status:',
          saveError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
      milestoneId: milestone?._id,
    });
  }
});

// ==========================================
// GET ALL MILESTONES
// ==========================================

router.get('/', async (req, res) => {
  try {
    const milestones = await Milestone.find().sort({
      createdAt: -1,
    });

    return res.json({
      success: true,
      count: milestones.length,
      data: milestones,
    });

  } catch (error) {
    console.error(
      'Failed to fetch milestones:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
});

export default router;
