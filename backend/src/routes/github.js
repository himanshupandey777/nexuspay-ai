import express from 'express';
import { getFullPullRequestData, parseGitHubUrl } from '../services/githubService.js';

const router = express.Router();

/**
 * POST /api/github/fetch
 * Fetches PR data from a GitHub URL
 */
router.post('/fetch', async (req, res) => {
  try {
    const { githubUrl } = req.body;
    
    if (!githubUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub URL is required',
      });
    }
    
    // Validate URL format first
    try {
      parseGitHubUrl(githubUrl);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    const result = await getFullPullRequestData(githubUrl);
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch GitHub data',
        error: result.error,
      });
    }
    
    res.json({
      success: true,
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