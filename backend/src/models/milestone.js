import mongoose from 'mongoose';

const milestoneSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    githubUrl: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'paid', 'failed'],
      default: 'pending',
    },
    aiVerification: {
      verified: Boolean,
      confidenceScore: Number,
      reasoning: String,
      verifiedAt: Date,
    },
    aiOptimization: {
      recommendedCurrency: String,
      estimatedSavings: Number,
      routingLogic: String,
    },
    paypalPayoutId: {
      type: String,
    },
    freelancerEmail: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Milestone = mongoose.model('Milestone', milestoneSchema);
export default Milestone;