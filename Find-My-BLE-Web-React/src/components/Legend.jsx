import { useState, useMemo } from 'react';

const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

const formatDuration = (minutes) => {
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const remainingMinutes = minutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${remainingMinutes}m`;
};

const Legend = ({ locations = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const deviceStats = useMemo(() => {
    const now = new Date().getTime();
    const activeDevices = locations.filter(loc => loc.isActive);
    const inactiveDevices = locations.filter(loc => !loc.isActive)
      .map(device => ({
        ...device,
        inactiveDuration: Math.floor((now - new Date(device.timestamp).getTime()) / (1000 * 60))
      }))
      .sort((a, b) => b.inactiveDuration - a.inactiveDuration);

    return {
      active: activeDevices,
      inactive: inactiveDevices,
      total: locations.length
    };
  }, [locations]);

  return (
    <div className={`legend-container ${isExpanded ? 'expanded' : ''}`}>
      {/* Header */}
      <div className="legend-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="legend-title">
          <h3>Devices</h3>
          <div className="device-summary">
            <span className="total-count">{deviceStats.total}</span>
            <button className="expand-button">
              {isExpanded ? '−' : '+'}
            </button>
          </div>
        </div>

        {/* Status Summary */}
        <div className="status-summary">
          <div className="status-group">
            <div className="status-badge active">
              <span className="status-count">{deviceStats.active.length}</span>
              <span className="status-label">Active</span>
            </div>
            <div className="status-badge inactive">
              <span className="status-count">{deviceStats.inactive.length}</span>
              <span className="status-label">Inactive</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="device-details">
          {/* Active Devices */}
          {deviceStats.active.length > 0 && (
            <div className="device-section">
              <h4 className="section-title">
                <span className="status-dot active"></span>
                Active Devices
              </h4>
              <div className="device-list">
                {deviceStats.active.map(device => (
                  <div key={device.name} className="device-item">
                    <span className="name">{device.name}</span>
                    <span className="time">
                      Updated: {new Date(device.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive Devices */}
          {deviceStats.inactive.length > 0 && (
            <div className="device-section">
              <h4 className="section-title">
                <span className="status-dot inactive"></span>
                Inactive Devices
              </h4>
              <div className="device-list">
                {deviceStats.inactive.map(device => (
                  <div 
                    key={device.name} 
                    className={`device-item ${device.inactiveDuration >= 5 ? 'warning' : ''}`}
                  >
                    <div className="device-info">
                      <span className="name">{device.name}</span>
                      <span className="time">
                        Last seen: {new Date(device.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {device.inactiveDuration >= 5 && (
                      <span className="duration-badge" title={`Inactive for ${device.inactiveDuration} minutes`}>
                        {formatDuration(device.inactiveDuration)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Legend; 