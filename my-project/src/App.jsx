import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import { LANGUAGES, getLanguage, createSpeechRecognition, speakText } from './translate';
import { useTranslation } from './useTranslation';

const MAX_CHARS = 5000;

function App() {
  // Language selection
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ta');

  // Input text
  const [inputText, setInputText] = useState('');

  // Speech recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Translation history
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('linguaflow-history')) || [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // Toast
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const toastTimerRef = useRef(null);

  // Translation hook
  const { translated, isLoading, error } = useTranslation(inputText, sourceLang, targetLang);

  // Get current language objects
  const srcLang = getLanguage(sourceLang);
  const tgtLang = getLanguage(targetLang);

  // ——— Toast helper ———
  const showToast = useCallback((message, type = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type, visible: true });
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2500);
  }, []);

  // ——— Save to history ———
  useEffect(() => {
    if (translated && inputText.trim() && sourceLang !== targetLang) {
      const entry = {
        id: Date.now(),
        source: inputText.trim(),
        result: translated,
        from: sourceLang,
        to: targetLang,
      };

      setHistory((prev) => {
        const updated = [entry, ...prev.filter((h) => h.source !== entry.source)].slice(0, 20);
        localStorage.setItem('linguaflow-history', JSON.stringify(updated));
        return updated;
      });
    }
  }, [translated]);

  // ——— Swap languages ———
  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(translated);
  };

  // ——— Clear input ———
  const handleClear = () => {
    setInputText('');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // ——— Copy to clipboard ———
  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied to clipboard ✓');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  // ——— Speech recognition (input) ———
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = createSpeechRecognition(sourceLang);
    if (!recognition) {
      showToast('Speech recognition not supported in this browser', 'error');
      return;
    }

    recognitionRef.current = recognition;
    let finalTranscript = inputText;

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? ' ' : '') + transcript;
        } else {
          interim += transcript;
        }
      }
      setInputText(finalTranscript + (interim ? ' ' + interim : ''));
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        showToast(`Mic error: ${event.error}`, 'error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
    showToast('Listening… speak now 🎙️');
  };

  // ——— Text-to-Speech ———
  const handleSpeak = (text, lang) => {
    speakText(text, lang);
  };

  // ——— Keyboard shortcuts ———
  useEffect(() => {
    const handler = (e) => {
      // Ctrl+Shift+S → Swap
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSwap();
      }
      // Ctrl+Shift+M → Mic toggle
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ——— Load history item ———
  const loadHistoryItem = (item) => {
    setSourceLang(item.from);
    setTargetLang(item.to);
    setInputText(item.source);
  };

  return (
    <div className="app">
      {/* Ambient Background */}
      <div className="app__ambient" aria-hidden="true" />

      {/* Header */}
      <header className="header">
        <div className="header__brand">
          <div className="header__logo" aria-hidden="true">🌐</div>
          <div>
            <h1 className="header__title">LinguaFlow</h1>
            <p className="header__subtitle">Real-Time Translator</p>
          </div>
        </div>
        <div className="header__status">
          <span className="header__status-dot" />
          <span>Ready</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Language Selector Bar */}
        <div className="lang-bar">
          <div className="lang-select-wrapper">
            <label className="lang-select-label" htmlFor="source-lang">
              From
            </label>
            <select
              id="source-lang"
              className="lang-select"
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag}  {lang.name} — {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            className="swap-btn tooltip"
            data-tooltip="Swap languages (Ctrl+Shift+S)"
            onClick={handleSwap}
            aria-label="Swap languages"
          >
            ⇄
          </button>

          <div className="lang-select-wrapper">
            <label className="lang-select-label" htmlFor="target-lang">
              To
            </label>
            <select
              id="target-lang"
              className="lang-select"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag}  {lang.name} — {lang.nativeName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Translator Panels */}
        <div className="translator">
          {/* Input Pane */}
          <div className="pane pane--input">
            <div className="pane__header">
              <div className="pane__lang">
                <span className="pane__lang-flag">{srcLang?.flag}</span>
                <span>{srcLang?.name}</span>
              </div>
              <div className="pane__actions">
                <button
                  className={`pane__action-btn tooltip ${isListening ? 'pane__action-btn--active' : ''}`}
                  data-tooltip={isListening ? 'Stop listening' : 'Start dictation'}
                  onClick={toggleListening}
                  aria-label={isListening ? 'Stop listening' : 'Start dictation'}
                >
                  🎙️
                </button>
                <button
                  className="pane__action-btn tooltip"
                  data-tooltip="Listen"
                  onClick={() => handleSpeak(inputText, sourceLang)}
                  aria-label="Read input aloud"
                  disabled={!inputText.trim()}
                >
                  🔊
                </button>
                <button
                  className="pane__action-btn tooltip"
                  data-tooltip="Copy"
                  onClick={() => handleCopy(inputText)}
                  aria-label="Copy input text"
                  disabled={!inputText.trim()}
                >
                  📋
                </button>
              </div>
            </div>
            <div className="pane__body">
              <textarea
                className="pane__textarea"
                value={inputText}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    setInputText(e.target.value);
                  }
                }}
                placeholder={`Type or speak in ${srcLang?.name}…`}
                aria-label="Input text for translation"
                autoFocus
              />
              {inputText && (
                <button
                  className="pane__clear-btn tooltip"
                  data-tooltip="Clear"
                  onClick={handleClear}
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="pane__footer">
              <span
                className={`pane__char-count ${inputText.length > MAX_CHARS * 0.9 ? 'pane__char-count--warn' : ''}`}
              >
                {inputText.length} / {MAX_CHARS}
              </span>
              {isListening && (
                <span style={{ color: 'var(--color-accent-tertiary)' }}>● Recording</span>
              )}
            </div>
          </div>

          {/* Output Pane */}
          <div className="pane pane--output">
            <div className="pane__header">
              <div className="pane__lang">
                <span className="pane__lang-flag">{tgtLang?.flag}</span>
                <span>{tgtLang?.name}</span>
              </div>
              <div className="pane__actions">
                <button
                  className="pane__action-btn tooltip"
                  data-tooltip="Listen"
                  onClick={() => handleSpeak(translated, targetLang)}
                  aria-label="Read translation aloud"
                  disabled={!translated}
                >
                  🔊
                </button>
                <button
                  className="pane__action-btn tooltip"
                  data-tooltip="Copy"
                  onClick={() => handleCopy(translated)}
                  aria-label="Copy translation"
                  disabled={!translated}
                >
                  📋
                </button>
              </div>
            </div>
            <div className="pane__body">
              {isLoading ? (
                <div className="pane__loading">
                  <div className="pane__loading-dots">
                    <div className="pane__loading-dot" />
                    <div className="pane__loading-dot" />
                    <div className="pane__loading-dot" />
                  </div>
                  <span>Translating…</span>
                </div>
              ) : error ? (
                <div
                  className="pane__output-text"
                  style={{ color: 'var(--color-accent-warning)' }}
                >
                  ⚠ {error}
                </div>
              ) : (
                <div
                  className={`pane__output-text ${!translated ? 'pane__output-text--empty' : ''}`}
                >
                  {translated || `Translation will appear here…`}
                </div>
              )}
            </div>
            <div className="pane__footer">
              <span className="pane__char-count">
                {translated.length} chars
              </span>
              <span>Powered by MyMemory</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="shortcut-hint" aria-hidden="true">
          <div className="shortcut-hint__item">
            <span className="shortcut-hint__key">Ctrl</span>
            <span>+</span>
            <span className="shortcut-hint__key">Shift</span>
            <span>+</span>
            <span className="shortcut-hint__key">S</span>
            <span style={{ marginLeft: 4 }}>Swap</span>
          </div>
          <div className="shortcut-hint__item">
            <span className="shortcut-hint__key">Ctrl</span>
            <span>+</span>
            <span className="shortcut-hint__key">Shift</span>
            <span>+</span>
            <span className="shortcut-hint__key">M</span>
            <span style={{ marginLeft: 4 }}>Mic</span>
          </div>
        </div>

        {/* Translation History */}
        {history.length > 0 && (
          <div className="history">
            <button
              className="history__toggle"
              onClick={() => setShowHistory((v) => !v)}
            >
              <span
                className={`history__toggle-icon ${showHistory ? 'history__toggle-icon--open' : ''}`}
              >
                ▾
              </span>
              <span>Recent translations ({history.length})</span>
            </button>
            {showHistory && (
              <div className="history__list">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="history__item"
                    onClick={() => loadHistoryItem(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') loadHistoryItem(item);
                    }}
                  >
                    <div>
                      <div className="history__item-lang">
                        {getLanguage(item.from)?.flag} {getLanguage(item.from)?.name}
                      </div>
                      <div className="history__item-text">{item.source}</div>
                    </div>
                    <div className="history__item-arrow">→</div>
                    <div>
                      <div className="history__item-lang">
                        {getLanguage(item.to)?.flag} {getLanguage(item.to)?.name}
                      </div>
                      <div className="history__item-text">{item.result}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast Notification */}
      <div
        className={`toast ${toast.visible ? 'toast--visible' : ''} ${toast.type === 'error' ? 'toast--error' : 'toast--success'}`}
        role="status"
        aria-live="polite"
      >
        {toast.message}
      </div>
    </div>
  );
}

export default App;
