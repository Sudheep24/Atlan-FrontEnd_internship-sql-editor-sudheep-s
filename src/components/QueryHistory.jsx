import './QueryHistory.css';

function QueryHistory({ history, onSelect ,isDarkMode}) {
  if (history.length === 0) {
    return null;
  }

  return (
    <div className={`query-history ${isDarkMode ? 'dark-query-history' : ''}`}>
      <h2>Query History</h2>
      <div className="history-list">
        {history.map((item, index) => (
          <div 
            key={index} 
            className="history-item"
            onClick={() => onSelect(item.query)}
          >
            <div className="history-query">{item.query}</div>
            <div className="history-meta">
              <span>{item.timestamp}</span>
              <span>{item.rowCount} rows</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default QueryHistory;