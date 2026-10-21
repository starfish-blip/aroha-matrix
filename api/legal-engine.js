import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';
const resultCache = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const { mode, sourceText } = req.body || {};
  if (!sourceText) return res.status(400).json({ error: 'sourceText required' });

  return res.status(200).json({ success: true, mode: mode || 'rectify', timestamp: new Date().toISOString() });
}
