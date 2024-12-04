import TrafficPopup from './TrafficPopup';
import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Typography,
  Box,
  Container,
  Alert,
  styled,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Import marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const TRAFFIC_POINTS = [
  {
    location: 'Via del Curato',
    coords: [44.722348, 11.278319],
    sensors: [
      { id: 12488, direction: 0, name: 'Ingresso a Cento' },
      { id: 12538, direction: 180, name: 'Uscita da Cento' },
    ],
  },
  {
    location: 'Via Ferrarese',
    coords: [44.732178, 11.290936],
    sensors: [
      { id: 12492, direction: 105, name: 'Ingresso a Cento' },
      { id: 12490, direction: 285, name: 'Uscita da Cento' },
    ],
  },
  {
    location: 'Via Giovannina',
    coords: [44.730824, 11.280708],
    sensors: [
      { id: 12484, direction: 20, name: 'Ingresso a Cento' },
      { id: 12486, direction: 200, name: 'Uscita da Cento' },
    ],
  },
  {
    location: 'Ponte Vecchio',
    coords: [44.72207, 11.29472],
    sensors: [
      { id: 10991, direction: 50, name: 'Ingresso a Cento' },
      { id: 10993, direction: 230, name: 'Uscita da Cento' },
    ],
  },
];

const API_BASE_URL = 'https://sensornet-api.lepida.it';

// Styled component for the map container that includes the custom icon styles
const StyledMapContainer = styled(Box)(`
  height: 600px;
  margin-bottom: 32px;

  .custom-traffic-icon {
    background: none !important;
    border: none !important;
  }

  .leaflet-div-icon {
    background: none !important;
    border: none !important;
  }

  .leaflet-marker-icon {
    background: none !important;
    border: none !important;
  }

  .custom-popup .leaflet-popup-content-wrapper {
    padding: 0;
    overflow: hidden;
  }

  .custom-popup .leaflet-popup-content {
    margin: 0;
    width: auto !important;
  }

  .custom-popup .leaflet-popup-close-button {
    color: #666;
    z-index: 1000;
  }
`);

const OverlayContainer = styled(Box)`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const OverlayContent = styled(Box)`
  background: white;
  border-radius: 8px;
  position: relative;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
`;

const CloseButton = styled(IconButton)`
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 1;
`;


const createArrow = (direction) => {
  return `
    <svg width="20" height="12" viewBox="0 0 20 12" style="transform: rotate(${direction}deg)">
      <path 
        d="M14,0 L20,6 L14,12 L14,8 L0,8 L0,4 L14,4 Z" 
        fill="#666666"
      />
    </svg>
  `;
};

const createTrafficIcon = (point, trafficData) => {
  const baseHeight = 36 + point.sensors.length * 50;

  const html = renderToStaticMarkup(
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '8px',
        width: '160px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.12)',
        position: 'relative',
        left: '-80px',
        top: `-${baseHeight / 2}px`,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          fontWeight: 500,
          marginBottom: '8px',
          color: 'rgba(0,0,0,0.87)',
          fontSize: '12px',
        }}
      >
        {point.location}
      </div>

      {point.sensors.map((sensor, index) => (
        <div
          key={sensor.id}
          style={{
            marginTop: index > 0 ? '8px' : 0,
            padding: '4px 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '12px',
                flexShrink: 0,
              }}
              dangerouslySetInnerHTML={{ __html: createArrow(sensor.direction) }}
            />

            {trafficData[sensor.id] ? (
              <div style={{ fontSize: '11px', fontWeight: 500 }}>
                {Math.round(trafficData[sensor.id].totalTraffic)} veicoli
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'rgba(0,0,0,0.38)' }}>
                No data
              </div>
            )}
          </div>

          {trafficData[sensor.id] && (
            <div
              style={{
                fontSize: '10px',
                color: 'rgba(0,0,0,0.6)',
                paddingLeft: '28px',
              }}
            >
              media {trafficData[sensor.id].speedStats.avg.toFixed(0)} km/h
              <br />
              (min {trafficData[sensor.id].speedStats.min.toFixed(0)}/
              max {trafficData[sensor.id].speedStats.max.toFixed(0)} km/h)
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return divIcon({
    html,
    className: 'custom-traffic-icon',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

// Update marker icons with imported images
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Helper function to align a date to the previous 15-minute interval with zero seconds and milliseconds
const alignToPrevious15MinInterval = (date) =>
  new Date(Math.floor(date.getTime() / 900000) * 900000);

const TrafficDashboard = forwardRef((props, ref) => {
  const [trafficData, setTrafficData] = useState({});
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    invalidateMapSize: () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    },
  }));

  function interpolateData(interval, data) {
    // Helper function to linearly interpolate between two points
    const linearInterpolate = (x, x0, y0, x1, y1) => {
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    };

    // Sort the data by timestamp to ensure proper interpolation
    data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    // Map through the interval to calculate interpolated values
    return interval.map((targetTime) => {
        const targetDate = new Date(targetTime).getTime();

        // Find the two data points surrounding the target time
        let prevPoint = null;
        let nextPoint = null;

        for (let i = 0; i < data.length; i++) {
            const currentDataTime = new Date(data[i].timestamp).getTime();

            if (currentDataTime <= targetDate) {
                prevPoint = data[i];
            }
            if (currentDataTime >= targetDate && nextPoint === null) {
                nextPoint = data[i];
            }

            // Stop searching if we have both points
            if (prevPoint && nextPoint) break;
        }

        // If no surrounding points are found, return null for value
        if (!prevPoint || !nextPoint || prevPoint === nextPoint) {
            return { timestamp: new Date(targetTime), value: null };
        }

        // Perform linear interpolation
        const interpolatedValue = linearInterpolate(
            targetDate,
            new Date(prevPoint.timestamp).getTime(),
            prevPoint.value,
            new Date(nextPoint.timestamp).getTime(),
            nextPoint.value
        );

        return { timestamp: new Date(targetTime), value: interpolatedValue };
    });
}

function interpolateData(interval, data) {
  // Helper function to linearly interpolate between two points
  const linearInterpolate = (x, x0, y0, x1, y1) => {
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  };

  // Sort the data by timestamp to ensure proper interpolation
  data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Map through the interval to calculate interpolated values
  return interval.map((targetTime) => {
      const targetDate = new Date(targetTime).getTime();

      // Find the two data points surrounding the target time, skipping null values
      let prevPoint = null;
      let nextPoint = null;

      for (let i = 0; i < data.length; i++) {
          const currentDataTime = new Date(data[i].timestamp).getTime();

          if (currentDataTime <= targetDate && data[i].value !== null) {
              prevPoint = data[i];
          }
          if (currentDataTime >= targetDate && nextPoint === null && data[i].value !== null) {
              nextPoint = data[i];
          }

          // Stop searching if we have both points
          if (prevPoint && nextPoint) break;
      }

      // If no surrounding points are found or both points are identical, skip interpolation
      if (!prevPoint || !nextPoint || prevPoint === nextPoint) {
          return null; // Skip this entry
      }

      // Perform linear interpolation
      const interpolatedValue = linearInterpolate(
          targetDate,
          new Date(prevPoint.timestamp).getTime(),
          prevPoint.value,
          new Date(nextPoint.timestamp).getTime(),
          nextPoint.value
      );

      return { timestamp: new Date(targetTime), value: interpolatedValue };
  }).filter(result => result !== null); // Filter out skipped entries
}

  const fetchSensorData = useCallback(async (sensorId) => {
    try {
      const measureResponse = await fetch(`${API_BASE_URL}/getMeasuresID/${sensorId}`);
      if (!measureResponse.ok)
        throw new Error(`Failed to fetch measures for sensor ${sensorId}`);
      const measures = await measureResponse.json();

      const trafficMeasure = measures.find(
        (m) => m.descrizione === 'CONTATORE PARZIALE TRAFFICO'
      );
      const speedMeasure = measures.find((m) => m.descrizione === 'VELOCITA MEDIA VEICOLI');
      if (!trafficMeasure || !speedMeasure) {
        throw new Error('Required measures not found');
      }

      // Get dates to fetch to cover last 24h
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const formatDate = (date) => date.toISOString().split('T')[0];

      // Get unique dates between twentyFourHoursAgo and now
      const datesToFetch = [];
      const startDate = new Date(formatDate(twentyFourHoursAgo));
      const endDate = new Date(formatDate(now));
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        datesToFetch.push(formatDate(d));
      }
      // Fetch data for these dates
      const trafficDataPromises = datesToFetch.map((date) =>
        fetch(
          `${API_BASE_URL}/getMeasureRealTimeData/${trafficMeasure.id_misura}/${date}`
        ).then((res) => res.json())
      );

      const speedDataPromises = datesToFetch.map((date) =>
        fetch(
          `${API_BASE_URL}/getMeasureRealTimeData/${speedMeasure.id_misura}/${date}`
        ).then((res) => res.json())
      );

      // Wait for all data
      const trafficDataResponses = await Promise.all(trafficDataPromises);
      const speedDataResponses = await Promise.all(speedDataPromises);

      // Combine all data
      let allTrafficData = trafficDataResponses.flat();
      let allSpeedData = speedDataResponses.flat();

      // Parse timestamps
      const parseTimestamp = (timestamp) => {
        const date = new Date(timestamp.replace(' ', 'T') + 'Z');
        return date;
      };

      // Map and sort data
      allTrafficData = allTrafficData
        .map((d) => ({
          ...d,
          timestamp: parseTimestamp(d.timestamp),
          value: parseFloat(d.value),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      allSpeedData = allSpeedData
        .map((d) => ({
          ...d,
          timestamp: parseTimestamp(d.timestamp),
          value: parseFloat(d.value),
        }))
        .sort((a, b) => a.timestamp - b.timestamp);
        function convertToCumulativeSum(data) {
          const cumSum = [0]; // Start with 0 as the first value
      
          data.forEach((curr, idx) => {
              cumSum.push(cumSum[idx] + curr.value); // Add current value to the last cumulative sum
          });
      
          // Create the output array with one additional value
          return [
              { timestamp: null, value: 0 }, // First value with timestamp set to null or a placeholder
              ...data.map((d, idx) => ({ ...d, value: cumSum[idx + 1] })), // Map data with cumulative sums
          ];
      }
      
        function convertCumsumToCounts(cumsumData) {
          return cumsumData.slice(1).map((d, i) => ({
              timestamp: d.timestamp,
              value: d.value - cumsumData[i].value, // Difference between current and previous
          }));
      }
      
      // Filter data to last 24h
      function filterDataWithPreviousPoint(dataArray, twentyFourHoursAgo, now) {
        // Ensure data is sorted by timestamp in ascending order
        dataArray.sort((a, b) => a.timestamp - b.timestamp);

        // Find the index of the first data point where timestamp >= twentyFourHoursAgo
        const startIndex = dataArray.findIndex(
          (d) => d.timestamp >= twentyFourHoursAgo
        );

        let filteredData = [];

        if (startIndex === -1) {
          // No data points are within the desired range; include the last available data point
          if (dataArray.length > 0) {
            filteredData.push(dataArray[dataArray.length - 1]);
          }
        } else {
          // Include all data points from startIndex up to where timestamp <= now
          const endIndex = dataArray.findIndex((d) => d.timestamp > now);
          const effectiveEndIndex = endIndex === -1 ? dataArray.length : endIndex;
          filteredData = dataArray.slice(startIndex, effectiveEndIndex);

          // Include the previous data point if it exists
          if (startIndex > 0) {
            filteredData.unshift(dataArray[startIndex - 2]);
          }
        }

        return filteredData;
      }

      // Apply the function to your data arrays
      allTrafficData = filterDataWithPreviousPoint(
        allTrafficData,
        twentyFourHoursAgo,
        now
      );

      allSpeedData = filterDataWithPreviousPoint(
        allSpeedData,
        twentyFourHoursAgo,
        now
      );

      // Find the earliest data timestamp
      const earliestTrafficTimestamp =
        allTrafficData.length > 0 ? allTrafficData[0].timestamp : twentyFourHoursAgo;
      const earliestSpeedTimestamp =
        allSpeedData.length > 0 ? allSpeedData[0].timestamp : twentyFourHoursAgo;
      const earliestDataTimestamp =
        earliestTrafficTimestamp < earliestSpeedTimestamp
          ? earliestTrafficTimestamp
          : earliestSpeedTimestamp;
      const startTime =
        earliestDataTimestamp < twentyFourHoursAgo ? twentyFourHoursAgo : earliestDataTimestamp;

      // Align startTime and endTime to 15-minute intervals
      const startTimeAligned = alignToPrevious15MinInterval(startTime);
      const endTimeAligned = alignToPrevious15MinInterval(now);
      endTimeAligned.setMinutes(endTimeAligned.getMinutes() /*+ 15*/); // Ensure we cover up to 'now'

      // Helper function to create 15-minute intervals
      const create15MinIntervals = (startTime, endTime) => {
        const intervals = [];
        let currentTime = new Date(startTime);
        while (currentTime <= endTime) {
          intervals.push(new Date(currentTime));
          currentTime.setMinutes(currentTime.getMinutes() + 15);
        }
        return intervals;
      };

      // Create intervals
      const intervals = create15MinIntervals(startTimeAligned, endTimeAligned);

      // Resample speed data (linear interpolation)
      const resampledSpeed = interpolateData(intervals, allSpeedData);
      
      const trafficCumsum = convertToCumulativeSum(allTrafficData);
      const resampledTrafficCumsum = interpolateData(intervals, trafficCumsum);
      const resampledTraffic = convertCumsumToCounts(resampledTrafficCumsum);
      
      console.log('resampledTraffic', resampledTraffic);
      console.log('resampledSpeed', resampledSpeed);
      
      // Calculate total traffic
      const totalTraffic = resampledTraffic.reduce((sum, d) => sum + d.value, 0);

      // Calculate speed stats
      const speedValues = resampledSpeed.map((d) => d.value);
      const speedStats = {
        min: Math.min(...speedValues),
        max: Math.max(...speedValues),
        avg: speedValues.reduce((sum, v) => sum + v, 0) / speedValues.length,
      };

      return {
        totalTraffic,
        speedStats,
        lastUpdate: new Date().toISOString(),
        rawTraffic: resampledTraffic,
        rawSpeed: resampledSpeed,
      };
    } catch (err) {
      console.error(`Error fetching data for sensor ${sensorId}:`, err);
      return null;
    }
  },[]);

  const fetchAllData = useCallback(async () => {
    try {
      setError(null);
      const results = {};

      const allSensors = TRAFFIC_POINTS.flatMap((point) => point.sensors);
      const fetchPromises = allSensors.map((sensor) =>
        fetchSensorData(sensor.id).then((data) => ({
          id: sensor.id,
          data,
        }))
      );

      const resolvedData = await Promise.all(fetchPromises);

      for (const { id, data } of resolvedData) {
        if (data) {
          results[id] = data;
        }
      }

      setTrafficData(results);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    }
  }, [fetchSensorData]); // Dependencies of fetchAllData


  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [fetchAllData]);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, []);

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return date.toLocaleString('it-IT', {
      timeZone: 'Europe/Rome',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4 }}>
        Traffico nelle ultime 24h
      </Typography>
      <small>(ultimo aggiornamento: {formatDateTime(lastUpdate)})</small>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <StyledMapContainer>
        <MapContainer
          center={[44.7274, 11.2891]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {TRAFFIC_POINTS.map((point) => (
            <Marker
              key={point.location}
              position={point.coords}
              icon={createTrafficIcon(point, trafficData)}
              zIndexOffset={1000}
              eventHandlers={{
                click: () => setSelectedPoint(point),
              }}
            />
          ))}
        </MapContainer>
      </StyledMapContainer>

      {selectedPoint && (
        <OverlayContainer>
          <OverlayContent>
            <CloseButton onClick={() => setSelectedPoint(null)}>
              <CloseIcon />
            </CloseButton>
            <TrafficPopup point={selectedPoint} trafficData={trafficData} />
          </OverlayContent>
        </OverlayContainer>
      )}
    </Container>
  );
});

export default TrafficDashboard;
