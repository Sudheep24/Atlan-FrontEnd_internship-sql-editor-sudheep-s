import { useState, useRef, useEffect } from 'react';
import Editor from "@monaco-editor/react";
import { format } from 'sql-formatter';
import toast from 'react-hot-toast';

import './QueryEditor.css';

function QueryEditor({ value, onChange, onExecute, isLoading, isDarkMode }) {
  const editorRef = useRef(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [savedQueries, setSavedQueries] = useState(() => {
    const saved = localStorage.getItem('savedQueries');
    return saved ? JSON.parse(saved) : [];
  });
  const [executionTime, setExecutionTime] = useState(null);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.shiftKey && e.altKey && e.key === 'F') {
        e.preventDefault();
        handleFormat();
      }
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        openSaveModal();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onExecute, value]);

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
    
    // Add SQL autocompletion
    editor.addAction({
      id: 'sql-autocomplete',
      label: 'SQL Autocomplete',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space],
      run: (ed) => {
        const position = ed.getPosition();
        const word = ed.getModel().getWordUntilPosition(position);
        const suggestions = sqlAutocomplete.getSuggestions(
          ed.getValue(),
          position.lineNumber,
          word.word
        );
        
        ed.trigger('sql-autocomplete', 'editor.action.triggerSuggest', {
          suggestions
        });
      }
    });
  };

  const handleExecute = async () => {
    const startTime = performance.now();
    await onExecute();
    const endTime = performance.now();
    setExecutionTime(Math.round(endTime - startTime));
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(value);
    toast.success('Query copied to clipboard!', {
      icon: '📋',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  const handleFormat = () => {
    const formatted = format(value);
    onChange(formatted);
    toast.success('Query formatted!', {
      icon: '✨',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  const openSaveModal = () => {
    setShowSaveModal(true);
  };

  const handleSaveQuery = () => {
    if (!queryName.trim()) {
      toast.error('Please enter a name for your query');
      return;
    }

    const newQuery = {
      name: queryName,
      query: value,
      timestamp: new Date().toISOString(),
    };

    const updatedQueries = [...savedQueries, newQuery];
    setSavedQueries(updatedQueries);
    localStorage.setItem('savedQueries', JSON.stringify(updatedQueries));
    
    setShowSaveModal(false);
    setQueryName('');
    
    toast.success('Query saved!', {
      icon: '💾',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  return (
    <div className={`query-editor ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="editor-header">
        <div className="editor-info">
          <h2>Query Editor</h2>
          {executionTime && (
            <span className="execution-time">Last execution: {executionTime}ms</span>
          )}
        </div>
        <div className="editor-actions">
          <button 
            className="action-button"
            onClick={handleCopyToClipboard}
          >
            <span className="icon">📋</span>
            Copy
          </button>
          <button 
            className="action-button"
            onClick={handleFormat}
          >
            <span className="icon">✨</span>
            Format
          </button>
          <button 
            className="action-button"
            onClick={openSaveModal}
          >
            <span className="icon">💾</span>
            Save
          </button>
        </div>
      </div>

      <div className="editor-container">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          theme={isDarkMode ? "vs-dark" : "light"}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 10, bottom: 10 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            wordBasedSuggestions: true
          }}
        />
      </div>

      <div className="editor-footer">
        <button 
          className="execute-button"
          onClick={handleExecute}
          disabled={isLoading}
        >
          {isLoading ? 'Executing...' : 'Execute Query'}
        </button>
        <div className="shortcuts">
          <span>Execute: <kbd>Ctrl</kbd>+<kbd>Enter</kbd></span>
          <span>Format: <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd></span>
          <span>Save: <kbd>Ctrl</kbd>+<kbd>S</kbd></span>
        </div>
      </div>

      {showSaveModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowSaveModal(false)} />
          <div className={`save-query-modal ${isDarkMode ? 'dark-theme' : ''}`}>
            <h3>Save Query</h3>
            <input
              type="text"
              placeholder="Enter query name"
              value={queryName}
              onChange={(e) => setQueryName(e.target.value)}
              autoFocus
            />
            <div className="modal-buttons">
              <button className="modal-button cancel-button" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button className="modal-button save-button" onClick={handleSaveQuery}>
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default QueryEditor;