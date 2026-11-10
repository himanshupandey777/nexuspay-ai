
import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load backend/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is missing from backend/.env');
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = 'openai/gpt-oss-20b';

// ==========================================
// AI VERIFIER
// Analyzes GitHub PR against project scope
// ==========================================

export const verifyMilestone = async ({
  projectScope,
  githubData,
}) => {
  try {
    if (!Array.isArray(githubData?.files)) {
      throw new Error('Invalid GitHub PR file data.');
    }

    const truncatedFiles = githubData.files.map((file) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch
        ? file.patch.substring(0, 1000) + '...'
        : 'No patch',
    }));

    const systemPrompt = `
You are an expert technical project manager and code reviewer.

Your job is to verify whether a freelancer's submitted GitHub
Pull Request fulfills the agreed project scope.

Analyze the PR title, description, and code changes against
the project requirements.

Consider:
1. Does the code address the requirements?
2. Are the changes substantial and meaningful?
3. Does the PR description explain the work?
4. Are there obvious red flags?

Be thorough but fair.

Return valid JSON only using this structure:

{
  "verified": true,
  "confidenceScore": 85,
  "reasoning": "Detailed explanation",
  "strengths": [],
  "concerns": [],
  "recommendation": "approve"
}
    `.trim();

    const userPrompt = `
PROJECT SCOPE/REQUIREMENTS:
${projectScope}

GITHUB PULL REQUEST DATA:
Title: ${githubData.title}
Description: ${githubData.description}
Author: ${githubData.author}
State: ${githubData.state}
Files Changed: ${githubData.totalFilesChanged}
Additions: ${githubData.additions} lines
Deletions: ${githubData.deletions} lines

CODE CHANGES:
${JSON.stringify(truncatedFiles, null, 2)}

Verify whether this work fulfills the milestone requirements.

Return JSON only. The confidenceScore must be between 0 and 100.
The recommendation must be approve, request_changes, or reject.
    `.trim();

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 0.3,
    });

    const result = JSON.parse(
      completion.choices[0].message.content
    );

    if (
      typeof result.verified !== 'boolean' ||
      !Number.isFinite(Number(result.confidenceScore)) ||
      Number(result.confidenceScore) < 0 ||
      Number(result.confidenceScore) > 100 ||
      !['approve', 'request_changes', 'reject'].includes(
        result.recommendation
      )
    ) {
      throw new Error('AI returned an invalid verification response.');
    }

    console.log('✅ AI Verification Complete:', {
      verified: result.verified,
      confidence: result.confidenceScore,
      recommendation: result.recommendation,
    });

    return {
      success: true,
      data: result,
    };

  } catch (error) {
    console.error('❌ AI Verification Error:', error.message);

    return {
      success: false,
      error: error.message,
    };
  }
};
