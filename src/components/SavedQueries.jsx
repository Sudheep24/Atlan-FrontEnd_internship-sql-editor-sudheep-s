import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { FixedSizeList as List } from 'react-window';
import debounce from 'lodash.debounce';
import { sampleQueries } from '../data/sampleQueries';
import './SavedQueries.css';

// Memoized query item
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

// Memoized SQL Tips component
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

  // Load saved queries from localStorage once
  useEffect(() => {
    const loadSavedQueries = () => {
      try {
        const saved = localStorage.getItem('savedQueries');
        if (saved) setSavedQueries(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading saved queries:", error);
      }
    };

    loadSavedQueries();

    // Listen for storage updates
    window.addEventListener('storage', loadSavedQueries);
    window.addEventListener('savedQueriesUpdated', loadSavedQueries);

    return () => {
      window.removeEventListener('storage', loadSavedQueries);
      window.removeEventListener('savedQueriesUpdated', loadSavedQueries);
    };
  }, []);

  // Combine sample queries and saved queries
  const allQueries = useMemo(() => [...sampleQueries, ...savedQueries], [savedQueries]);

  // Efficient filtering with memoization
  const filteredQueries = useMemo(() => {
    if (!searchTerm.trim()) return allQueries;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allQueries.filter(query =>
      query.name.toLowerCase().includes(lowerSearchTerm) ||
      query.query.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allQueries, searchTerm]);

  // Debounced search input handler
  const handleSearchInput = useCallback(debounce((value) => {
    setSearchTerm(value);
  }, 300), []);

  // Handle query selection
  const handleQuerySelect = useCallback((query) => {
    setActiveQuery(query.name);
    onSelectQuery(query.query);
  }, [onSelectQuery]);

  // Virtualized list renderer
  const renderRow = ({ index, style }) => {
    const query = filteredQueries[index];
    return (
      <div style={style} key={query.name}>
        <QueryItem query={query} isActive={activeQuery === query.name} onSelect={handleQuerySelect} />
      </div>
    );
  };

  return (
    <div className={`saved-queries ${isDarkMode ? 'dark-theme' : ''}`}>
      <h2>Saved Queries</h2>
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Search queries..." 
          onChange={(e) => handleSearchInput(e.target.value)}
        />
      </div>

      {filteredQueries.length === 0 ? (
        <div className="no-results">No queries found</div>
      ) : (
        <List
          height={400}
          itemCount={filteredQueries.length}
          itemSize={60}
          width="100%"
        >
          {renderRow}
        </List>
      )}
      
      <AnalystTips />
    </div>
  );
}

export default SavedQueries;
