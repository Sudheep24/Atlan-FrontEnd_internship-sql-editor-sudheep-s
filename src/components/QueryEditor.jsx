import { useState, useRef, useEffect, useCallback } from 'react';
import Editor from "@monaco-editor/react";
import { format } from 'sql-formatter';
import toast from 'react-hot-toast';
import './QueryEditor.css';

function QueryEditor({ value, onChange, onExecute, isLoading, isDarkMode }) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
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

  // Configure Monaco editor autocomplete when editor is mounted
  const handleEditorWillMount = useCallback((monaco) => {
    monacoRef.current = monaco;
    
    // Register SQL keywords for autocompletion
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 
      'OUTER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT INTO', 
      'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 
      'CREATE INDEX', 'DROP INDEX', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'AS', 'DISTINCT', 
      'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'IN', 'NOT', 'BETWEEN', 'LIKE', 'IS NULL', 
      'IS NOT NULL', 'AND', 'OR', 'DESC', 'ASC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ];

    // Register custom autocomplete provider
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Create SQL keyword suggestions
        const keywordSuggestions = sqlKeywords.map(keyword => ({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range: range
        }));

        // Create suggestions from saved queries
        const savedQuerySuggestions = savedQueries.map(savedQuery => ({
          label: savedQuery.name,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: savedQuery.query,
          documentation: savedQuery.query,
          detail: `Saved Query: ${new Date(savedQuery.timestamp).toLocaleString()}`,
          range: range
        }));

        // Combine suggestions
        return {
          suggestions: [...keywordSuggestions, ...savedQuerySuggestions]
        };
      }
    });
  }, [savedQueries]);

  // Update the autocomplete provider when savedQueries changes
  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      // Manually trigger the completion provider refresh
      monacoRef.current.editor.registerCommand('refreshCompletionItems', () => {
        if (editorRef.current) {
          editorRef.current.trigger('source', 'editor.action.triggerSuggest', {});
        }
      });
    }
  }, [savedQueries]);

  // Memoize event handlers to prevent recreating them on each render
  const handleEditorDidMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    
    // Setup additional editor configurations
    editor.addAction({
      id: 'execute-query',
      label: 'Execute Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
      run: handleExecute
    });

    editor.addAction({
      id: 'format-query',
      label: 'Format Query',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: handleFormat
    });

    editor.addAction({
      id: 'save-query',
      label: 'Save Query',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        setShowSaveModal(true);
        return null;
      }
    });
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

  // Optimize editor options for performance and enhance autocomplete
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 10, bottom: 10 },
    // Enable autocomplete features
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true
    },
    suggestOnTriggerCharacters: true,
    wordBasedSuggestions: true,
    // Improve autocomplete experience
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    // Disable features that might cause lag during batch operations
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
          beforeMount={handleEditorWillMount}
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
          <span>Autocomplete: <kbd>Ctrl</kbd>+<kbd>Space</kbd></span>
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