import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { Card, CardContent, Typography } from '@mui/material';

const TrafficPopup = ({ point, trafficData }) => {
  const processData = () => {
    let timeSeriesData = [];
    let maxTrafficValue = 10;
    let maxSpeedValue = 10;
    let totalIn = 0;
    let totalOut = 0;
    let speedsIn = [];
    let speedsOut = [];

    // Process each sensor's data
    point.sensors.forEach(sensor => {
      const sensorData = trafficData[sensor.id];
      if (!sensorData) return;

      const isInbound = sensor.name.includes('Ingresso');
      const isOutbound = sensor.name.includes('Uscita');

      console.log(sensor.name, 'sensorData:', sensorData);
      const totalTraffic = sensorData.rawTraffic.reduce((sum, d) => sum + d.value, 0);
      console.log('totalTraffic', totalTraffic);

      // Process traffic data
      if (sensorData.rawTraffic) {
        sensorData.rawTraffic.forEach(d => {
          const timestamp = d.timestamp;
          const count = d.value;

          if (isInbound) {
            totalIn += count;
            timeSeriesData.push({
              timestamp,
              traffic_in: count,
              traffic_out: null,
              speed_in: null,
              speed_out: null
            });
          }
          if (isOutbound) {
            totalOut += count;
            timeSeriesData.push({
              timestamp,
              traffic_in: null,
              traffic_out: -count, // Negative for outbound
              speed_in: null,
              speed_out: null
            });
          }

          maxTrafficValue = Math.max(maxTrafficValue, count);
        });
      }

      // Process speed data
      if (sensorData.rawSpeed) {
        sensorData.rawSpeed.forEach(d => {
          const timestamp = d.timestamp;
          const speed = parseFloat(d.value);

          if (isInbound) {
            speedsIn.push(speed);
            const existingPoint = timeSeriesData.find(p => p.timestamp.getTime() === timestamp.getTime());
            if (existingPoint) {
              existingPoint.speed_in = speed;
            } else {
              timeSeriesData.push({
                timestamp,
                traffic_in: null,
                traffic_out: null,
                speed_in: speed,
                speed_out: null
              });
            }
          }
          if (isOutbound) {
            speedsOut.push(speed);
            const existingPoint = timeSeriesData.find(p => p.timestamp.getTime() === timestamp.getTime());
            if (existingPoint) {
              existingPoint.speed_out = speed;
            } else {
              timeSeriesData.push({
                timestamp,
                traffic_in: null,
                traffic_out: null,
                speed_in: null,
                speed_out: speed
              });
            }
          }

          maxSpeedValue = Math.max(maxSpeedValue, speed);
        });
      }
    });

    // Sort by timestamp
    timeSeriesData.sort((a, b) => a.timestamp - b.timestamp);

    // Calculate average speeds
    const avgSpeedIn = speedsIn.length > 0 
      ? speedsIn.reduce((a, b) => a + b, 0) / speedsIn.length 
      : 0;
    const avgSpeedOut = speedsOut.length > 0 
      ? speedsOut.reduce((a, b) => a + b, 0) / speedsOut.length 
      : 0;

    // Round up maxValues to nearest 10
    maxTrafficValue = Math.ceil(maxTrafficValue / 10) * 10;
    maxSpeedValue = Math.ceil(maxSpeedValue / 10) * 10;

    return {
      timeSeriesData,
      maxTrafficValue,
      maxSpeedValue,
      totalIn,
      totalOut,
      avgSpeedIn,
      avgSpeedOut
    };
  };

  const { 
    timeSeriesData, 
    maxTrafficValue, 
    maxSpeedValue,
    totalIn,
    totalOut,
    avgSpeedIn,
    avgSpeedOut
  } = processData();

  const formatTimestamp = (timestamp) => {
    return timestamp.toLocaleTimeString('it-IT', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Card sx={{ width: 600, maxWidth: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {point.location} - Ultimi flussi di traffico
        </Typography>
          
          {/* Traffic Volume Graph */}
          <Typography variant="subtitle2" gutterBottom>
            Veicoli totali: entranti {Math.round(totalIn)}, uscenti {Math.round(totalOut)}
          </Typography>
          <div style={{ height: 256, marginBottom: 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={timeSeriesData}
                margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: '#666' }}
                />
                <YAxis 
                  domain={[-maxTrafficValue, maxTrafficValue]}
                  ticks={Array.from(
                    { length: (maxTrafficValue * 2) / 10 + 1 },
                    (_, i) => -maxTrafficValue + i * 10
                  )}
                  axisLine={{ stroke: '#666' }}
                  tickFormatter={(value) => Math.abs(value)}
                />
                <Tooltip 
                  labelFormatter={formatTimestamp}
                  formatter={(value, name, props) => {
                    const direction = props.dataKey.includes('_in') ? 'Entrante' : 'Uscente';
                    return [Math.abs(Math.round(value)), direction];
                  }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#000" />
                <Line 
                  type="monotone" 
                  dataKey="traffic_in" 
                  stroke="#4CAF50" 
                  name="Veicoli Entranti"
                  connectNulls={true}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="traffic_out" 
                  stroke="#f44336" 
                  name="Veicoli Uscenti"
                  connectNulls={true}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Speed Graph */}
          <Typography variant="subtitle2" gutterBottom>
            Velocità medie: entranti {avgSpeedIn.toFixed(2)} km/h, uscenti {avgSpeedOut.toFixed(2)} km/h
          </Typography>
          <div style={{ height: 256 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={timeSeriesData}
                margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTimestamp}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: '#666' }}
                />
                <YAxis 
                  domain={[0, maxSpeedValue]}
                  axisLine={{ stroke: '#666' }}
                  tickFormatter={(value) => parseFloat(value).toFixed(2)}
                />
                <Tooltip 
                  labelFormatter={formatTimestamp}
                  formatter={(value, name, props) => {
                    const direction = props.dataKey.includes('_in') ? 'Entrante' : 'Uscente';
                    return [parseFloat(value).toFixed(2), direction];
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="speed_in" 
                  stroke="#2196F3" 
                  name="Velocità Media Entrante"
                  connectNulls={true}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="speed_out" 
                  stroke="#FF9800" 
                  name="Velocità Media Uscente"
                  connectNulls={true}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </CardContent>
    </Card>
  );
};

export default TrafficPopup;
