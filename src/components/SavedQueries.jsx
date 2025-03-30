import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { sampleQueries } from '../data/sampleQueries';
import './SavedQueries.css';

// Memoized query item to prevent unnecessary re-renders
const QueryItem = memo(({ query, isActive, onSelect }) => (
  <div 
    className={`query-item ${isActive ? 'active' : ''}`}
    onClick={() => onSelect(query)}
  >
    <span className="query-icon">󰆼</span>
    <div className="query-info">
      <h3>{query.name}</h3>
      <p>{query.description || 'Custom saved query'}</p>
    </div>
  </div>
));

// Memoized tips component since this never changes
const AnalystTips = memo(() => (
  <div className="analyst-tips">
    <h3>SQL Pro Tips</h3>
    <ul>
      <li><span className="tip-icon">⌨️</span> Format query: <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd></li>
      <li><span className="tip-icon">📜</span> History: <kbd>Ctrl</kbd>+<kbd>H</kbd></li>
      <li><span className="tip-icon">💾</span> Save query: <kbd>Ctrl</kbd>+<kbd>S</kbd></li>
      <li><span className="tip-icon">⚡</span> <strong>Type <code>--large-dataset</code> for 1000 rows</strong></li>
<li><span className="tip-icon">🚀</span> <strong>Type <code>--huge-dataset</code> for 10,000 rows</strong></li>

    
    </ul>
  </div>
));

function SavedQueries({ onSelectQuery, isDarkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState(null);
  const [savedQueries, setSavedQueries] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Load saved queries from localStorage
  useEffect(() => {
    // Function to load saved queries
    const loadSavedQueries = () => {
      try {
        const saved = localStorage.getItem('savedQueries');
        if (saved) {
          // Use a function to update state based on previous state
          setSavedQueries(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Error loading saved queries:", error);
      }
    };

    // Initial load
    loadSavedQueries();

    // Listen for storage changes
    window.addEventListener('storage', loadSavedQueries);
    
    // Custom event listener for immediate updates
    window.addEventListener('savedQueriesUpdated', loadSavedQueries);
    
    return () => {
      window.removeEventListener('storage', loadSavedQueries);
      window.removeEventListener('savedQueriesUpdated', loadSavedQueries);
    };
  }, []);

  // Memoize the combined queries to prevent recalculation on every render
  const allQueries = useMemo(() => [...sampleQueries, ...savedQueries], [savedQueries]);
  
  // Memoize filtered queries to avoid filtering on every render
  const filteredQueries = useMemo(() => {
    if (!searchTerm.trim()) return allQueries;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allQueries.filter(query => 
      query.name.toLowerCase().includes(lowerSearchTerm) ||
      query.query.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allQueries, searchTerm]);

  // Debounced search function
  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSearching]);

  // Handle search input with debounce
  const handleSearchInput = useCallback((e) => {
    setIsSearching(true);
    setSearchTerm(e.target.value);
  }, []);

  // Handle query selection
  const handleQuerySelect = useCallback((query) => {
    setActiveQuery(query.name);
    onSelectQuery(query.query);
  }, [onSelectQuery]);

  // Virtual list rendering for large datasets
  const renderQueryItems = () => {

    // This basic implementation limits the number of rendered items
    const maxVisibleItems = 100; 
    const visibleQueries = filteredQueries.slice(0, maxVisibleItems);
    
    return visibleQueries.map((query, index) => (
      <QueryItem 
        key={`${query.name}-${index}`}
        query={query}
        isActive={activeQuery === query.name}
        onSelect={handleQuerySelect}
      />
    ));
  };

  // Show loading indicator during search
  const renderContent = () => {
    if (isSearching) {
      return <div className="loading-indicator">Searching...</div>;
    }

    if (filteredQueries.length === 0) {
      return <div className="no-results">No queries found</div>;
    }

    return <div className="query-group">{renderQueryItems()}</div>;
  };

  return (
    <div className={`saved-queries ${isDarkMode ? 'dark-theme' : ''}`}>
      <h2>Saved Queries</h2>
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Search queries..." 
          value={searchTerm}
          onChange={handleSearchInput}
        />
      </div>

      {renderContent()}
      <AnalystTips />
    </div>
  );
}

export default SavedQueries;