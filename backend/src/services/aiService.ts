import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import pool from '../db';
import fs from 'fs';
import path from 'path';
dotenv.config();

let aiClient: any = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (e) {
    console.warn('Failed to initialize Gemini Client, falling back to local engine.');
  }
}

/**
 * Local Rule-Based Engine (Fallback)
 */
const localEngine = {
  parseSegment: (prompt: string): string => {
    const p = prompt.toLowerCase();
    const conditions: string[] = [];
    
    // Country logic
    const checkCountry = (dbName: string, keywords: string[]) => {
      for (const kw of keywords) {
        if (new RegExp(`\\b${kw}\\b`).test(p)) {
          // Check if preceded by exclusion words (limit gap to 2 words max)
          const exclusionRegex = new RegExp(`(?:except|not|outside|excluding)[\\s,]+(?:[a-z]+[\\s,]+){0,2}${kw}`);
          if (exclusionRegex.test(p)) {
            conditions.push(`country != '${dbName}'`);
          } else {
            conditions.push(`country = '${dbName}'`);
          }
          return;
        }
      }
    };

    checkCountry('India', ['india']);
    checkCountry('USA', ['usa', 'united states']);
    checkCountry('UK', ['uk', 'united kingdom']);
    checkCountry('Germany', ['germany']);
    checkCountry('UAE', ['uae']);

    // City logic
    const checkCity = (dbName: string, keywords: string[]) => {
      for (const kw of keywords) {
        if (new RegExp(`\\b${kw}\\b`).test(p)) {
          const exclusionRegex = new RegExp(`(?:except|not|outside|excluding)[\\s,]+(?:[a-z]+[\\s,]+){0,2}${kw}`);
          if (exclusionRegex.test(p)) {
            conditions.push(`city != '${dbName}'`);
          } else {
            conditions.push(`city = '${dbName}'`);
          }
          return;
        }
      }
    };

    checkCity('London', ['london']);
    checkCity('New York', ['new york', 'ny', 'nyc']);
    checkCity('Bengaluru', ['bengaluru', 'bangalore']);
    checkCity('Mumbai', ['mumbai', 'bombay']);
    checkCity('Paris', ['paris']);
    checkCity('Berlin', ['berlin']);
    checkCity('Dubai', ['dubai']);
    checkCity('Sydney', ['sydney']);

    // Gender logic
    const checkGender = (dbMatch: string, keywords: string[]) => {
      for (const kw of keywords) {
        if (new RegExp(`\\b${kw}\\b`).test(p)) {
          const exclusionRegex = new RegExp(`(?:except|not|excluding)[\\s,]+(?:[a-z]+[\\s,]+){0,2}${kw}`);
          if (exclusionRegex.test(p)) {
            conditions.push(`gender != '${dbMatch}'`);
          } else {
            conditions.push(`gender = '${dbMatch}'`);
          }
          return;
        }
      }
    };

    checkGender('Female', ['female', 'women', 'womens', 'girls', 'woman', 'girl']);
    checkGender('Male', ['male', 'men', 'mens', 'boys', 'man', 'boy']);

    // Age logic
    const ageRegex = /(?:over|above|older than)\s+(\d+)/;
    const overMatch = p.match(ageRegex);
    if (overMatch) {
      conditions.push(`age > ${overMatch[1]}`);
    }

    const underRegex = /(?:under|below|younger than)\s+(\d+)/;
    const underMatch = p.match(underRegex);
    if (underMatch) {
      conditions.push(`age < ${underMatch[1]}`);
    }

    const betweenRegex = /(?:between|from)\s+(\d+)\s+(?:and|to|-)\s+(\d+)/;
    const betweenMatch = p.match(betweenRegex);
    if (betweenMatch) {
      conditions.push(`age BETWEEN ${betweenMatch[1]} AND ${betweenMatch[2]}`);
    }

    // Item logic
    const checkItem = (keyword: string, dbMatch: string) => {
      if (new RegExp(`\\b${keyword}\\b`).test(p)) {
        const exclusionRegex = new RegExp(`(?:except|not|excluding)[\\s,]+(?:[a-z]+[\\s,]+){0,2}${keyword}`);
        if (exclusionRegex.test(p)) {
          conditions.push(`items::text NOT ILIKE '%${dbMatch}%'`);
        } else {
          conditions.push(`items::text ILIKE '%${dbMatch}%'`);
        }
      }
    };

    checkItem('coat', 'Coat');
    checkItem('jacket', 'Jacket');
    checkItem('dress', 'Dress');
    checkItem('denim', 'Denim');
    checkItem('jean', 'Jeans');
    checkItem('jeans', 'Jeans');
    checkItem('shirt', 'Shirt');
    checkItem('leather', 'Leather');
    checkItem('sneaker', 'Sneaker');
    checkItem('sneakers', 'Sneaker');
    checkItem('hoodie', 'Hoodie');
    checkItem('belt', 'Belt');
    checkItem('ethnic', 'Ethnic');

    if (conditions.length === 0) return "1=1"; // default to all if no clear rules
    return conditions.join(' AND ');
  },
  
  draftMessage: (customer: any): string => {
    return `Hi ${customer.name}, we loved that you shopped with us in ${customer.city}. Check out our latest arrivals and get 15% off today!`;
  }
};

/**
 * AI Service facade
 */
export const AIService = {
  async generateSegmentFilter(prompt: string): Promise<string> {
    // Permanently use the regex local engine for ultra-fast evaluation
    return localEngine.parseSegment(prompt);
  },

  async draftMessage(customer: any, promptInfo: string = ''): Promise<string> {
    if (!aiClient) return localEngine.draftMessage(customer);

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          { role: 'user', parts: [{ text: `You are an expert fashion marketer for Aura Threads. Draft a short, highly personalized marketing message (SMS/WhatsApp style) for a customer matching this profile:
City: ${customer.city}
Persona: ${customer.persona}
Campaign Context: ${promptInfo}

Keep it under 3 sentences. Be friendly, urgent, and include a call to action.
CRITICAL INSTRUCTION: Start the message with "Hey [Name]," or similar, using the exact literal string "[Name]" as a placeholder instead of an actual name. Do not include subject lines.` }] }
        ],});
      return response.text.trim();
    } catch (e) {
      return localEngine.draftMessage(customer);
    }
  },

  async chat(prompt: string, history: any[] = []): Promise<string> {
    if (!aiClient) return "I'm sorry, I cannot connect to my intelligence core. Please provide a valid Gemini API key in the `.env` file.";

    try {
      // The Gemini API requires the contents array to start with a 'user' role.
      // We filter out the hardcoded initial greeting from the frontend.
      const validHistory = history.filter((msg, index) => !(index === 0 && msg.role === 'model'));
      
      const contents: any[] = validHistory.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: prompt }] });

      const csvPath = path.resolve(__dirname, '../../Database.csv');
      let csvContext = '';
      try {
        if (fs.existsSync(csvPath)) {
          csvContext = fs.readFileSync(csvPath, 'utf8');
        }
      } catch (e) {
        console.warn('Could not read CSV context for AI.');
      }

      const config = {
        systemInstruction: `You are an intelligent AI assistant built into the Aura Threads CRM. Help the marketer analyze data, create campaign strategies, or answer questions about CRM best practices. Be concise.
        
Here is the complete customer database in CSV format for you to reference. If the user asks about the database or customer counts, read through this data carefully and count the rows yourself to give exact, accurate answers without hallucinating numbers:

${csvContext}`
      };

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents,
        config
      });

      return response.text;
    } catch (e: any) {
      console.error('Chat API Error:', e);
      if (e?.status === 429 || e?.message?.includes('429') || e?.message?.includes('Quota')) {
        return "⚠️ **API Limit Reached:** It looks like your Gemini API key has exceeded its free tier rate limit or quota. Please wait a minute and try again, or check your Google Cloud Billing dashboard!";
      }
      return "I encountered an error while trying to connect to Gemini. Please make sure your API key in `.env` is valid.";
    }
  }
};
