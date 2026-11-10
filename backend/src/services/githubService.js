import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Parse a GitHub PR URL into owner, repo, and PR number
 * @param {string} url - e.g., "https://github.com/facebook/react/pull/12345"
 */
export const parseGitHubUrl = (url) => {
  try {
    const regex = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
    const match = url.match(regex);
    
    if (!match) {
      throw new Error('Invalid GitHub PR URL format');
    }
    
    return {
      owner: match[1],
      repo: match[2],
      pullNumber: parseInt(match[3], 10),
    };
  } catch (error) {
    throw new Error(`Failed to parse GitHub URL: ${error.message}`);
  }
};

/**
 * Fetch Pull Request details
 */
export const getPullRequest = async (owner, repo, pullNumber) => {
  try {
    const { data } = await octokit.pulls.get({
      owner,
      repo,
      pull_number: pullNumber,
    });
    
    return {
      success: true,
      data: {
        title: data.title,
        description: data.body || '',
        state: data.state,
        author: data.user.login,
        createdAt: data.created_at,
        mergedAt: data.merged_at,
        additions: data.additions,
        deletions: data.deletions,
        changedFiles: data.changed_files,
        url: data.html_url,
      },
    };
  } catch (error) {
    console.error('❌ GitHub PR Fetch Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch the files changed in a Pull Request (the actual code diff)
 */
export const getPullRequestFiles = async (owner, repo, pullNumber) => {
  try {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });
    
    // Extract the actual code changes (patches)
    const filesWithPatches = data.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch || 'No patch available', // The actual code diff
    }));
    
    return {
      success: true,
      files: filesWithPatches,
      totalFiles: data.length,
    };
  } catch (error) {
    console.error('❌ GitHub Files Fetch Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Fetch all GitHub data for a PR (details + files)
 */
export const getFullPullRequestData = async (githubUrl) => {
  try {
    const { owner, repo, pullNumber } = parseGitHubUrl(githubUrl);
    
    const [prResult, filesResult] = await Promise.all([
      getPullRequest(owner, repo, pullNumber),
      getPullRequestFiles(owner, repo, pullNumber),
    ]);
    
    if (!prResult.success || !filesResult.success) {
      throw new Error('Failed to fetch complete PR data');
    }
    
    return {
      success: true,
      data: {
        ...prResult.data,
        files: filesResult.files,
        totalFilesChanged: filesResult.totalFiles,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};