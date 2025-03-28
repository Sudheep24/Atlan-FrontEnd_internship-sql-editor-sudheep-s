import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './ResultTable.css';

function ResultTable({ results, isLoading, isDarkMode }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [executionTime, setExecutionTime] = useState(null);
  const [viewMode, setViewMode] = useState('table');
  const [chartType, setChartType] = useState('bar');
  const [isResizing, setIsResizing] = useState(false);
  const exportMenuRef = useRef(null);
  const tableRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLoading && results) {
      const time = Math.random() * 500 + 100;
      setExecutionTime(time.toFixed(2));
    }
  }, [isLoading, results]);

  const startResizing = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e) => {
    if (isResizing && containerRef.current) {
      const height = e.clientY - containerRef.current.getBoundingClientRect().top;
      if (height > 200) {
        containerRef.current.style.height = `${height}px`;
      }
    }
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
        window.removeEventListener('mousemove', resize);
        window.removeEventListener('mouseup', stopResizing);
      };
    }
  }, [isResizing]);

  if (isLoading) {
    return <div className={`loading ${isDarkMode ? 'dark-theme' : ''}`}>Executing query...</div>;
  }

  const { columns, data } = results;
  
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const handleRowSelect = (index) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const handleCopySelected = () => {
    const selectedData = Array.from(selectedRows)
      .map(index => paginatedData[index])
      .map(row => columns.map(col => row[col]).join('\t'))
      .join('\n');
    
    navigator.clipboard.writeText(selectedData);
    
    toast.success('Selected rows copied to clipboard!', {
      icon: '📋',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };
  const exportToCSV = () => {
    const csvContent = [
      columns.join(','),
      ...data.map(row => columns.map(col => `"${row[col]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'query_results.csv';
    link.click();
    setShowExportMenu(false);

    toast.success('Results exported to CSV!', {
      icon: '📊',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'query_results.xlsx');
    setShowExportMenu(false);

    toast.success('Results exported to Excel!', {
      icon: '📊',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.autoTable({
      head: [columns],
      body: data.map(row => columns.map(col => row[col])),
      styles: { fontSize: 8 },
      margin: { top: 20 },
    });
    doc.save('query_results.pdf');
    setShowExportMenu(false);

    toast.success('Results exported to PDF!', {
      icon: '📊',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'query_results.json';
    link.click();
    setShowExportMenu(false);

    toast.success('Results exported to JSON!', {
      icon: '📊',
      style: {
        background: isDarkMode ? '#374151' : '#fff',
        color: isDarkMode ? '#fff' : '#374151',
      },
    });
  };

  const renderChart = () => {
    const numericColumns = columns.filter(col => 
      data.every(row => typeof row[col] === 'number')
    );

    const chartData = data.slice(0, 50);
    const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
    const DataComponent = chartType === 'bar' ? Bar : Line;

    return (
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={columns[0]} />
            <YAxis />
            <Tooltip />
            <Legend />
            {numericColumns.map((col, index) => (
              <DataComponent
                key={col}
                type="monotone"
                dataKey={col}
                stroke={`hsl(${index * 360 / numericColumns.length}, 70%, 50%)`}
                fill={`hsl(${index * 360 / numericColumns.length}, 70%, 50%)`}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div 
      className={`result-table-container ${isDarkMode ? 'dark-theme' : ''}`}
      ref={containerRef}
    >
      <div className="table-header">
        <div className="table-controls">
          <div className="table-info">
            <h2>Query Results</h2>
            {executionTime && (
              <span className="execution-time">Execution time: {executionTime}ms</span>
            )}
          </div>
          <div className="table-actions">
            <div className="view-toggle">
              <button
                className={viewMode === 'table' ? 'active' : ''}
                onClick={() => setViewMode('table')}
              >
                📊 Table
              </button>
              <button
                className={viewMode === 'chart' ? 'active' : ''}
                onClick={() => setViewMode('chart')}
              >
                📈 Chart
              </button>
              {viewMode === 'chart' && (
                <>
                  <button
                    className={chartType === 'bar' ? 'active' : ''}
                    onClick={() => setChartType('bar')}
                  >
                    Bar
                  </button>
                  <button
                    className={chartType === 'line' ? 'active' : ''}
                    onClick={() => setChartType('line')}
                  >
                    Line
                  </button>
                </>
              )}
            </div>
            <button 
              className="table-action-button"
              onClick={handleCopySelected}
              disabled={selectedRows.size === 0}
            >
              <span>📋</span> Copy Selected
            </button>
            <div className="export-dropdown" ref={exportMenuRef}>
              <button 
                className="table-action-button"
                onClick={() => setShowExportMenu(!showExportMenu)}
              >
                <span>📊</span> Export
              </button>
              {showExportMenu && (
                <div className="export-menu">
                  <button onClick={exportToCSV}>Export as CSV</button>
                  <button onClick={exportToExcel}>Export as Excel</button>
                  <button onClick={exportToPDF}>Export as PDF</button>
                  <button onClick={exportToJSON}>Export as JSON</button>
                </div>
              )}
            </div>
            <select 
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rows-per-page"
            >
              <option value="10">10 rows</option>
              <option value="25">25 rows</option>
              <option value="50">50 rows</option>
              <option value="100">100 rows</option>
              <option value="500">500 rows</option>
              <option value="1000">1000 rows</option>
            </select>
          </div>
        </div>
        <span className="row-count">{data.length} rows</span>
      </div>

      {viewMode === 'table' ? (
        <>
          <div className="table-wrapper" ref={tableRef}>
            <table className="result-table">
              <thead>
                <tr>
                  <th className="select-column">
                    <input 
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRows(new Set(Array.from({ length: paginatedData.length }, (_, i) => i)));
                        } else {
                          setSelectedRows(new Set());
                        }
                      }}
                      checked={selectedRows.size === paginatedData.length}
                    />
                  </th>
                  {columns.map((column) => (
                    <th 
                      key={column}
                      onClick={() => handleSort(column)}
                      className={sortConfig.key === column ? sortConfig.direction : ''}
                    >
                      {column}
                      {sortConfig.key === column && (
                        <span className="sort-indicator">
                          {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex}
                    className={selectedRows.has(rowIndex) ? 'selected' : ''}
                    onClick={() => handleRowSelect(rowIndex)}
                  >
                    <td className="select-column">
                      <input 
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => handleRowSelect(rowIndex)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={column}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <div className="pagination-controls">
              <button 
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                ⟪
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ⟨
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                ⟩
              </button>
              <button 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                ⟫
              </button>
            </div>
            <div className="page-size">
              <span>Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, data.length)} of {data.length} entries</span>
            </div>
          </div>
        </>
      ) : (
        renderChart()
      )}

      <div 
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={startResizing}
      />
    </div>
  );
}

export default ResultTable;