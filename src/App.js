import React, { useState, useRef } from "react";
import { Tabs, Tab, Box } from '@mui/material';
import CentoDashboard from './CentoDashboard';
import WeatherDashboard from './WeatherDashboard';
import TrafficDashboard from './TrafficDashboard';

function App() {
  const [activeTab, setActiveTab] = useState(0); // Track active tab using index
  const trafficDashboardRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    if (newValue === 1 && trafficDashboardRef.current) {
      // Trigger invalidateSize when the TrafficDashboard tab is activated
      trafficDashboardRef.current.invalidateMapSize();
    }
  };

  return (
    <div className="App">
      <h1>Sensori RetePAIOT nel Comune di Cento</h1>
      
      {/* Tabs Navigation */}
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        variant="fullWidth" 
        indicatorColor="primary" 
        textColor="primary"
        aria-label="Dashboard Tabs"
      >
        <Tab label="Stazione meteo" />
        <Tab label="Traffico" />
        <Tab label="Altri sensori" />
      </Tabs>
      
      {/* Tab Content */}
      <Box sx={{ marginTop: 2 }}>
        <div style={{ display: activeTab === 0 ? 'block' : 'none' }}>
          <WeatherDashboard pollingInterval={300000} />
        </div>
        <div style={{ visibility: activeTab === 1 ? "visible" : "hidden", height: activeTab === 1 ? "auto" : 0 }}>
  <TrafficDashboard ref={trafficDashboardRef} pollingInterval={300000} />
</div>
        <div style={{ display: activeTab === 2 ? 'block' : 'none' }}>
          <CentoDashboard pollingInterval={300000} />
        </div>
      </Box>
    </div>
  );
}

export default App;
