import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Container,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const SENSORS = [
  { id: 1748, name: "Traffico - MTS - SP 10 dalla Loc. Decima al Confine provinciale BO/FE (BO)" },
  { id: 1462, name: "Traffico - MTS - SP 11 fra Pieve di Cento e San Pietro in Casale (BO)" },
  { id: 1456, name: "Traffico - MTS - SP 42 fra Pieve di Cento e Castello d'Argile (BO)" },
  { id: 1459, name: "Traffico - MTS - SP 66 fra Cento e Sant'Agostino (FE)" },
  { id: 1453, name: "Traffico - MTS - SP 6 fra Cento e Pilastrello (FE)" },
  { id: 791, name: "IDRO - Arpa - Cento (FE)" }
];

const API_BASE_URL = 'https://sensornet-api.lepida.it';

const SensorDashboard = () => {
  const [selectedInterval, setSelectedInterval] = useState(60000); // Default 1 minute
  const [sensorData, setSensorData] = useState({});
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSensorData = async () => {
    try {
      setError(null);
      const allSensorData = {};

      for (const sensor of SENSORS) {
        // First get measure IDs for this sensor
        const measureResponse = await fetch(`${API_BASE_URL}/getMeasuresID/${sensor.id}`);
        if (!measureResponse.ok) throw new Error(`Failed to fetch measures for sensor ${sensor.id}`);
        const measures = await measureResponse.json();

        // Then get last data for each measure
        const measureIds = measures.map(m => m.id_misura).join(',');
        const dataResponse = await fetch(`${API_BASE_URL}/getMeasureListLastData/${measureIds}`);
        if (!dataResponse.ok) throw new Error(`Failed to fetch data for sensor ${sensor.id}`);
        const data = await dataResponse.json();

        allSensorData[sensor.id] = {
          measures: measures,
          data: data
        };
      }

      setSensorData(allSensorData);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchSensorData();
    const interval = setInterval(fetchSensorData, selectedInterval);
    return () => clearInterval(interval);
  }, [selectedInterval]);

  const formatValue = (value, unit) => {
    if (typeof value === 'number') {
      return `${value.toFixed(2)} ${unit}`;
    }
    return `${value} ${unit}`;
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Sensor Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Polling Interval</InputLabel>
            <Select
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              label="Polling Interval"
            >
              <MenuItem value={30000}>30 seconds</MenuItem>
              <MenuItem value={60000}>1 minute</MenuItem>
              <MenuItem value={300000}>5 minutes</MenuItem>
              <MenuItem value={600000}>10 minutes</MenuItem>
            </Select>
          </FormControl>
          
          {lastUpdate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {SENSORS.map((sensor) => (
          <Grid item xs={12} md={6} lg={4} key={sensor.id}>
            <Card>
              <CardHeader 
                title={sensor.name}
                titleTypographyProps={{ variant: 'h6' }}
                sx={{ pb: 1 }}
              />
              <CardContent>
                {sensorData[sensor.id]?.measures?.map((measure, idx) => {
                  const value = sensorData[sensor.id]?.data?.find(
                    d => d.id_measure === measure.id_misura
                  );
                  return (
                    <Box key={measure.id_misura} sx={{ mt: idx > 0 ? 2 : 0 }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        {measure.descrizione}
                      </Typography>
                      <Typography>
                        {value ? formatValue(value.value, measure.descrizione_unita_misura) : 'Loading...'}
                      </Typography>
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default SensorDashboard;