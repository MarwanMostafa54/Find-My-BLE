import { useState } from 'react';
import Map from './Map';
import Legend from './Legend';
import Stats from './Stats';

const LocationTracker = () => {
  const [locations, setLocations] = useState([]);

  const handleLocationUpdate = (newLocations) => {
    setLocations(newLocations);
  };

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      overflow: 'hidden' 
    }}>
      <Map onLocationUpdate={handleLocationUpdate} />
      <Legend locations={locations} />
      <Stats locations={locations} />
    </div>
  );
};

export default LocationTracker; 