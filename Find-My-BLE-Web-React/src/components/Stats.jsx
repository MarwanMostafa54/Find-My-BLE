import React, { useMemo } from 'react';

const INACTIVE_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

const Stats = ({ locations = [] }) => {
  // const stats = useMemo(() => {
  //   const totalDevices = locations.length;
  //   const activeDevices = locations.filter(loc => loc.isActive).length;
  //   const inactiveDevices = totalDevices - activeDevices;
  //   const activePercentage = totalDevices ? ((activeDevices / totalDevices) * 100).toFixed(1) : 0;
    
  //   const now = new Date().getTime();
  //   const longInactiveDevices = locations.filter(loc => {
  //     const lastUpdate = new Date(loc.timestamp).getTime();
  //     return !loc.isActive && (now - lastUpdate) > INACTIVE_THRESHOLD;
  //   });

  //   return {
  //     total: totalDevices,
  //     active: activeDevices,
  //     inactive: inactiveDevices,
  //     activePercentage,
  //     longInactive: longInactiveDevices
  //   };
  // }, [locations]);

  // return (
  //   <div className="stats-panel">
  //     <div className="stats-header">
  //       {/* <h2>Device Statistics</h2>
  //       <div className="stats-summary">
  //         <div className="stat-item">
  //           <span className="stat-value">{stats.total}</span>
  //           <span className="stat-label">Total Devices</span>
  //         </div>
  //         <div className="stat-divider" />
  //         <div className="stat-item">
  //           <div className="stat-value-group">
  //             <span className="stat-value">{stats.active}</span>
  //             <span className="stat-percentage">({stats.activePercentage}%)</span>
  //           </div>
  //           <span className="stat-label">Active</span>
  //         </div>
  //         <div className="stat-divider" />
  //         <div className="stat-item">
  //           <span className="stat-value">{stats.inactive}</span>
  //           <span className="stat-label">Inactive</span>
  //         </div>
  //       </div> */}
  //     </div>
      
  //     {stats.longInactive.length > 0 && (
  //       <div className="long-inactive-section">
  //         <h3>Extended Inactivity</h3>
  //         <div className="long-inactive-list">
  //           {stats.longInactive.map(device => {
  //             const inactiveDuration = new Date().getTime() - new Date(device.timestamp).getTime();
  //             const minutes = Math.floor(inactiveDuration / (1000 * 60));
              
  //             return (
  //               <div key={device.name} className="inactive-device-item">
  //                 <span className="device-name">{device.name}</span>
  //                 <span className="inactive-duration">
  //                   Inactive for {minutes} minutes
  //                 </span>
  //               </div>
  //             );
  //           })}
  //         </div>
  //       </div>
  //     )}
  //   </div>
  // );
};

export default Stats; 