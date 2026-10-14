/**
 * LinguaFlow — Translation Service
 * Uses MyMemory Translation API (free, no API key required).
 */

const API_BASE = 'https://api.mymemory.translated.net/get';

/**
 * Supported languages with metadata.
 */
export const LANGUAGES = [
  { code: 'en', name: 'English',   nativeName: 'English',  flag: '🇬🇧', myMemoryCode: 'en' },
  { code: 'ta', name: 'Tamil',     nativeName: 'தமிழ்',     flag: '🇮🇳', myMemoryCode: 'ta' },
  { code: 'te', name: 'Telugu',    nativeName: 'తెలుగు',    flag: '🇮🇳', myMemoryCode: 'te' },
  { code: 'hi', name: 'Hindi',     nativeName: 'हिन्दी',     flag: '🇮🇳', myMemoryCode: 'hi' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം',  flag: '🇮🇳', myMemoryCode: 'ml' },
];

/**
 * Get language metadata by code.
 */
export function getLanguage(code) {
  return LANGUAGES.find((l) => l.code === code);
}

/**
 * Translate text using MyMemory API.
 * @param {string} text - Text to translate.
 * @param {string} sourceLang - Source language code (e.g., 'en').
 * @param {string} targetLang - Target language code (e.g., 'ta').
 * @param {AbortSignal} [signal] - Optional AbortSignal for cancellation.
 * @returns {Promise<string>} Translated text.
 */
export async function translateText(text, sourceLang, targetLang, signal) {
  if (!text.trim()) return '';
  if (sourceLang === targetLang) return text;

  const langPair = `${sourceLang}|${targetLang}`;
  const url = `${API_BASE}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langPair)}`;

  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Translation failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || 'Translation failed');
  }

  return data.responseData.translatedText;
}

/**
 * Web Speech API – Speech-to-Text.
 * Returns a SpeechRecognition instance or null if unsupported.
 */
export function createSpeechRecognition(langCode) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  const recognition = new SpeechRecognition();
  recognition.lang = langCode === 'ta' ? 'ta-IN'
    : langCode === 'te' ? 'te-IN'
    : langCode === 'hi' ? 'hi-IN'
    : langCode === 'ml' ? 'ml-IN'
    : 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

/**
 * Web Speech API – Text-to-Speech.
 */
export function speakText(text, langCode) {
  if (!window.speechSynthesis || !text.trim()) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode === 'ta' ? 'ta-IN'
    : langCode === 'te' ? 'te-IN'
    : langCode === 'hi' ? 'hi-IN'
    : langCode === 'ml' ? 'ml-IN'
    : 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
}
