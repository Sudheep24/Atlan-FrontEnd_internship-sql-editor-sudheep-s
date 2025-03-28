import { useState, useEffect } from 'react';
import { sampleQueries } from '../data/sampleQueries';
import './SavedQueries.css';

function SavedQueries({ onSelectQuery, isDarkMode }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState(null);
  const [savedQueries, setSavedQueries] = useState([]);

  useEffect(() => {
    const loadSavedQueries = () => {
      const saved = localStorage.getItem('savedQueries');
      if (saved) {
        setSavedQueries(JSON.parse(saved));
      }
    };

    loadSavedQueries();
    window.addEventListener('storage', loadSavedQueries);
    
    return () => {
      window.removeEventListener('storage', loadSavedQueries);
    };
  }, []);

  const allQueries = [...sampleQueries, ...savedQueries];
  
  const filteredQueries = allQueries.filter(query => 
    query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    query.query.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuerySelect = (query) => {
    setActiveQuery(query.name);
    onSelectQuery(query.query);
  };

  return (
    <div className={`saved-queries ${isDarkMode ? 'dark-theme' : ''}`}>
      <h2>Saved Queries</h2>
      <div className="search-box">
        <input 
          type="text" 
          placeholder="Search queries..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="query-group">
        {filteredQueries.map((query, index) => (
          <div 
            key={index} 
            className={`query-item ${activeQuery === query.name ? 'active' : ''}`}
            onClick={() => handleQuerySelect(query)}
          >
            <span className="query-icon">󰆼</span>
            <div className="query-info">
              <h3>{query.name}</h3>
              <p>{query.description || 'Custom saved query'}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="analyst-tips">
        <h3>SQL Pro Tips</h3>
        <ul>
          <li><span className="tip-icon">⌨️</span> Format query: <kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>F</kbd></li>
          <li><span className="tip-icon">📜</span> History: <kbd>Ctrl</kbd>+<kbd>H</kbd></li>
          <li><span className="tip-icon">💾</span> Save query: <kbd>Ctrl</kbd>+<kbd>S</kbd></li>
          <li><span className="tip-icon">📊</span> Export: <kbd>Ctrl</kbd>+<kbd>E</kbd></li>
          <li><span className="tip-icon">🔍</span> Search: <kbd>Ctrl</kbd>+<kbd>P</kbd></li>
          <li><span className="tip-icon">⚡</span> Add <code>--large-dataset</code> for 1000 rows</li>
          <li><span className="tip-icon">🚀</span> Add <code>--huge-dataset</code> for 10,000 rows</li>
          <li><span className="tip-icon">↔️</span> Drag handles to resize panels</li>
        </ul>
      </div>
    </div>
  );
}

export default SavedQueries;