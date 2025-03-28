import { useState, useEffect, useCallback } from 'react';
import { Toaster } from 'react-hot-toast';
import './App.css';
import { sampleQueries } from './data/sampleQueries';
import QueryEditor from './components/QueryEditor';
import ResultTable from './components/ResultTable';
import SavedQueries from './components/SavedQueries';
import QueryHistory from './components/QueryHistory';

function App() {
  const [currentQuery, setCurrentQuery] = useState(sampleQueries[0].query);
  const [results, setResults] = useState(sampleQueries[0].results);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [queryHistory, setQueryHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const handleQueryExecution = () => {
    setIsLoading(true);
    
    const isLargeDataset = currentQuery.includes('--large-dataset');
    const isHugeDataset = currentQuery.includes('--huge-dataset');
    
    setTimeout(() => {
      const matchingQuery = sampleQueries.find(q => q.query.trim().toLowerCase() === currentQuery.trim().toLowerCase());
      let queryResult = matchingQuery ? matchingQuery.results : sampleQueries[0].results;
      
      if (isLargeDataset || isHugeDataset) {
        const size = isHugeDataset ? 10000 : 1000;
        queryResult = {
          ...queryResult,
          data: Array.from({ length: size }, (_, i) => ({
            ...queryResult.data[i % queryResult.data.length],
            id: i + 1
          }))
        };
      }
      
      setResults(queryResult);
      setIsLoading(false);

      setQueryHistory(prev => [{
        query: currentQuery,
        timestamp: new Date().toLocaleString(),
        rowCount: queryResult.data.length
      }, ...prev]);
    }, 500);
  };

  const handleQuerySelect = (query) => {
    setCurrentQuery(query);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark-theme');
  };

  const startResizing = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 200 && newWidth < window.innerWidth * 0.4) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
      }
      if (e.ctrlKey && e.key === 'h') {
        e.preventDefault();
        setShowHistory(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : ''}`}>
      <Toaster position="top-right" />
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            
            <div className="logo-text">
              <h1>FronEnd Internship</h1>
              <p>SQL Query Tool</p>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="header-button" onClick={() => setShowHistory(!showHistory)}>
            <span className="icon">📜</span>
            <span>History</span>
          </button>
          <button className="header-button" onClick={toggleTheme}>
            <span className="icon">{isDarkMode ? '🌞' : '🌙'}</span>
            <span>{isDarkMode ? 'Light' : 'Dark'} Theme</span>
          </button>
         
          <button className="header-button">
            <span className="icon">󰊤</span>
            <span>GitHub</span>
          </button>
        </div>
      </header>
      
      <main className="main-content">
        <SavedQueries 
          onSelectQuery={handleQuerySelect} 
          isDarkMode={isDarkMode}
          style={{ width: `${sidebarWidth}px` }}
        />
        <div 
          className={`resize-handle ${isResizing ? 'active' : ''}`}
          onMouseDown={startResizing}
        />
        <div className="editor-results">
          <QueryEditor 
            value={currentQuery}
            onChange={setCurrentQuery}
            onExecute={handleQueryExecution}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
          />
          {showHistory && (
            <QueryHistory 
              history={queryHistory}
              onSelect={handleQuerySelect}
              isDarkMode={isDarkMode}
            />
          )}
          <ResultTable 
            results={results}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
          />
        </div>
      </main>
    </div>
  );
}

export default App;