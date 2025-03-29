import { useState, useRef, useEffect, useCallback } from 'react';
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
  
  // Debounce execution time updates to prevent excessive re-renders
  const updateExecutionTime = useCallback((time) => {
    // Only update if difference is significant (more than 50ms)
    if (!executionTime || Math.abs(time - executionTime) > 50) {
      setExecutionTime(time);
    }
  }, [executionTime]);

  // Memoize event handlers to prevent recreating them on each render
  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  const handleExecute = useCallback(async () => {
    // Only measure time for single query executions, not batch operations
    const startTime = performance.now();
    await onExecute();
    const endTime = performance.now();
    updateExecutionTime(Math.round(endTime - startTime));
  }, [onExecute, updateExecutionTime]);

  const handleCopyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(value);
    toast.success('Query copied to clipboard!', {
      icon: '📋',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  }, [value, isDarkMode]);

  const handleFormat = useCallback(() => {
    try {
      const formatted = format(value, {
        language: 'sql',
        indent: '  ',
      });
      onChange(formatted);
      toast.success('Query formatted!', {
        icon: '✨',
        style: {
          background: isDarkMode ? '#374151' : '#fff',
          color: isDarkMode ? '#fff' : '#374151',
        },
      });
    } catch (error) {
      toast.error('Failed to format query. Please check syntax.', {
        style: {
          background: isDarkMode ? '#374151' : '#fff',
          color: isDarkMode ? '#fff' : '#374151',
        },
      });
    }
  }, [value, onChange, isDarkMode]);

  // Batch localStorage updates instead of doing them immediately
  const saveToLocalStorage = useCallback((queries) => {
    // Use requestIdleCallback to defer non-critical work
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => {
        localStorage.setItem('savedQueries', JSON.stringify(queries));
      });
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(() => {
        localStorage.setItem('savedQueries', JSON.stringify(queries));
      }, 0);
    }
  }, []);

  // Only attach key event listeners when the editor is focused
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Only process shortcuts if the editor is focused or the modal is open
      if (!editorRef.current?.hasTextFocus() && !showSaveModal) return;
      
      // Format Query: Shift + Alt + F
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handleFormat();
      }
      // Execute Query: Ctrl + Enter
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
      // Save Query: Ctrl + S
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowSaveModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleFormat, handleExecute, showSaveModal]);

  const openSaveModal = useCallback(() => {
    setShowSaveModal(true);
  }, []);

  const handleSaveQuery = useCallback(() => {
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
    saveToLocalStorage(updatedQueries);
    
    // Dispatch custom event for immediate update
    window.dispatchEvent(new Event('savedQueriesUpdated'));
    
    setShowSaveModal(false);
    setQueryName('');
    
    toast.success('Query saved!', {
      icon: '💾',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  }, [queryName, value, savedQueries, isDarkMode, saveToLocalStorage]);

  // Optimize editor options for performance
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 10, bottom: 10 },
    // Disable features that might cause lag during batch operations
    quickSuggestions: !isLoading && savedQueries.length < 100,
    wordBasedSuggestions: !isLoading && savedQueries.length < 100,
    // Reduce parsing work during heavy operations
    folding: !isLoading,
    // Optimize for large files
    largeFileOptimizations: true,
    // Reduce rendering work
    renderLineHighlight: isLoading ? 'none' : 'all',
    // Improve scrolling performance
    smoothScrolling: false
  };

  return (
    <div className={`query-editor ${isDarkMode ? 'dark-theme' : ''}`}>
      <div className="editor-header">
        <div className="editor-info">
          <h2>Query Editor</h2>
          {executionTime && !isLoading && (
            <span className="execution-time">Last execution: {executionTime}ms</span>
          )}
        </div>
        <div className="editor-actions">
          <button 
            className="action-button"
            onClick={handleCopyToClipboard}
            disabled={isLoading}
          >
            <span className="icon">📋</span>
            Copy
          </button>
          <button 
            className="action-button"
            onClick={handleFormat}
            disabled={isLoading}
          >
            <span className="icon">✨</span>
            Format
          </button>
          <button 
            className="action-button"
            onClick={openSaveModal}
            disabled={isLoading}
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
          options={editorOptions}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveQuery();
                } else if (e.key === 'Escape') {
                  setShowSaveModal(false);
                }
              }}
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