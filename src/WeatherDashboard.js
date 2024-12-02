import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Container,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import { LineChart } from '@mui/x-charts';
import RefreshIcon from '@mui/icons-material/Refresh';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import OpacityIcon from '@mui/icons-material/Opacity';
import CompressIcon from '@mui/icons-material/Compress';
import AirIcon from '@mui/icons-material/Air';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import WaterDropIcon from '@mui/icons-material/WaterDrop';

const WEATHER_STATIONS = {
  MAIN: 12494,  // Stazione Meteo Polizia Locale Cento - Pioggia
  WIND: 12501   // Stazione Meteo Polizia Locale Cento - Vento
};

const API_BASE_URL = 'https://sensornet-api.lepida.it';

const weatherParameters = [
  { 
    icon: <ThermostatIcon />, 
    label: 'Temperatura', 
    keys: ['TEMPERATURA', 'TEMPERATURA MAX', 'TEMPERATURA MIN'], 
    keyLabels: {
      'TEMPERATURA': 'Temperatura attuale',
      'TEMPERATURA MAX': 'Temperatura massima',
      'TEMPERATURA MIN': 'Temperatura minima'
    },
    color: '#FF5722',
    multiValue: true,
    chartColors: ['#FF5722', '#FF8A65', '#FFAB91']
  },
  { 
    icon: <OpacityIcon />, 
    label: 'Umidità Relativa', 
    keys: ['UMIDITA'], 
    keyLabels: {
      'UMIDITA': 'Umidità'
    },
    color: '#2196F3',
    chartColors: ['#2196F3']
  },
  { 
    icon: <CompressIcon />, 
    label: 'Pressione Atmosferica', 
    keys: ['PRESSIONE'], 
    keyLabels: {
      'PRESSIONE': 'Pressione'
    },
    color: '#9C27B0',
    chartColors: ['#9C27B0']
  },
  { 
    icon: <AirIcon />, 
    label: 'Vento', 
    keys: ['VELOCITA MEDIA VENTO', 'VELOCITA MAX VENTO', 'VELOCITA MIN VENTO', 'DIREZIONE_VENTO', 'DIREZIONE RAFFICA'], 
    keyLabels: {
      'VELOCITA MEDIA VENTO': 'Velocità media del vento',
      'VELOCITA MAX VENTO': 'Velocità massima del vento',
      'VELOCITA MIN VENTO': 'Velocità minima del vento',
      'DIREZIONE_VENTO': 'Direzione del vento',
      'DIREZIONE RAFFICA': 'Direzione raffica'
    },
    color: '#00BCD4',
    multiValue: true,
    chartColors: ['#00BCD4', '#4DD0E1', '#80DEEA']
  },
  { 
    icon: <WbSunnyIcon />, 
    label: 'Intensità della Radiazione Solare', 
    keys: ['RADIAZIONE', 'RADIAZIONE MAX'], 
    keyLabels: {
      'RADIAZIONE': 'Radiazione solare',
      'RADIAZIONE MAX': 'Radiazione solare massima'
    },
    color: '#FFC107',
    multiValue: true,
    chartColors: ['#FFC107', '#FFD54F']
  },
  { 
    icon: <WaterDropIcon />, 
    label: 'Pioggia', 
    keys: ['PIOGGIA CUMULATA', 'PIOGGIA INCREMENTALE'], 
    keyLabels: {
      'PIOGGIA CUMULATA': 'Pioggia cumulata',
      'PIOGGIA INCREMENTALE': 'Pioggia incrementale'
    },
    color: '#4CAF50',
    multiValue: true,
    chartColors: ['#4CAF50', '#81C784']
  }
];


const convertUTCToRome = (utcDateString) => {
  try {
    const date = new Date(utcDateString.replace(' ', 'T') + 'Z');
    return date.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  } catch (err) {
    console.error('Date conversion error:', err);
    return 'Invalid Date';
  }
};
  
  const convertUTCToRomeDate = (utcDateString) => {
    try {
      const date = new Date(utcDateString.replace(' ', 'T') + 'Z');
      const romeDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
      return romeDate;
    } catch (err) {
      console.error('Date conversion error:', err);
      return new Date();
    }
  };
  
  const formatChartTime = (date) => {
    return date ? date.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }) : '';
  };

  const WIND_DIRECTIONS = ['↑ N', '↗ NE', '→ E', '↘ SE', '↓ S', '↙ SW', '← W', '↖ NW'];
  const getWindDirectionArrow = (degrees) => degrees == null ? '' : WIND_DIRECTIONS[Math.floor((degrees % 360) / 45)];
  
const WeatherDashboard = () => {
  const [selectedInterval, setSelectedInterval] = useState(60000);
  const [weatherData, setWeatherData] = useState({
    main: null,
    wind: null
  });
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedParameter, setSelectedParameter] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);

  const fetchStationData = useCallback(async (stationId) => {
    const measureResponse = await fetch(`${API_BASE_URL}/getMeasuresID/${stationId}`);
    if (!measureResponse.ok) throw new Error(`Failed to fetch measures for station ${stationId}`);
    const measures = await measureResponse.json();

    const measureIds = measures.map(m => m.id_misura).join(',');
    const dataResponse = await fetch(`${API_BASE_URL}/getMeasureListLastData/${measureIds}`);
    if (!dataResponse.ok) throw new Error(`Failed to fetch data for station ${stationId}`);
    const data = await dataResponse.json();

    return { measures, data };
  },[]);

  const fetchWeatherData = useCallback(async () => {
    try {
      setError(null);
      
      const [mainStationData, windStationData] = await Promise.all([
        fetchStationData(WEATHER_STATIONS.MAIN),
        fetchStationData(WEATHER_STATIONS.WIND)
      ]);

      setWeatherData({
        main: mainStationData,
        wind: windStationData
      });
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    }
  },[fetchStationData]);

  const getDates = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return {
      today: today.toISOString().split('T')[0],
      yesterday: yesterday.toISOString().split('T')[0]
    };
  };

  const fetchHistoricalData = async (measureIds) => {
    const dates = getDates();
    const allPromises = measureIds.map(measureId => 
      Promise.all([
        fetch(`${API_BASE_URL}/getMeasureRealTimeData/${measureId}/${dates.today}`).then(res => res.json()),
        fetch(`${API_BASE_URL}/getMeasureRealTimeData/${measureId}/${dates.yesterday}`).then(res => res.json())
      ]).then(([todayData, yesterdayData]) => {
        const combinedData = [...todayData, ...yesterdayData]
          .sort((a, b) => new Date(a.timestamp + 'Z') - new Date(b.timestamp + 'Z'))
          .filter(d => new Date() - new Date(d.timestamp + 'Z') <= 24 * 60 * 60 * 1000);
        return { id: measureId, data: combinedData };
      }).catch(err => {
        console.error(`Error fetching historical data for measure ${measureId}:`, err);
        return { id: measureId, data: [] };
      })
    );

    return Promise.all(allPromises);
  };

  const formatChartData = (historicalData) => {
    if (!historicalData.length) return { xAxis: [], series: [] };

    const timestamps = historicalData[0].data.map(d => convertUTCToRomeDate(d.timestamp));
    const series = [];

    for (const [index, dataset] of historicalData.entries()) {
      const data = dataset.data.map(d => parseFloat(d.value));
      series.push({
        data,
        label: selectedParameter?.keys[index],
        color: selectedParameter?.chartColors[index],
      });
    }

    return {
      xAxis: timestamps,
      series,
    };
  };

  const handleCardClick = async (parameter) => {
    setSelectedParameter(parameter);
    setDialogOpen(true);

    const measureIds = parameter.keys.reduce((ids, key) => {
      const measure = weatherData.main?.measures.concat(weatherData.wind?.measures || []).find(m => m.descrizione.includes(key));
      if (measure) ids.push(measure.id_misura);
      return ids;
    }, []);

    const historicalDataResult = await fetchHistoricalData(measureIds);
    setHistoricalData(historicalDataResult);
  };

  const getValue = (description) => {
    if (!weatherData.main || !weatherData.wind) return null;

    const findMeasureAndValue = (data, measures) => {
      const measure = measures.find(m => m.descrizione.includes(description));
      const value = measure && data.find(d => d.id_measure === measure.id_misura);
      return { measure, value };
    };

    let { measure, value } = findMeasureAndValue(weatherData.main.data, weatherData.main.measures);

    if (!value) {
      ({ measure, value } = findMeasureAndValue(weatherData.wind.data, weatherData.wind.measures));
    }

    return value && measure ? {
      value: value.value,
      unit: measure.descrizione_unita_misura,
      time: value.timestamp || value.timedate,
      source: value.id_measure
    } : null;
  };

  useEffect(() => {
    fetchWeatherData();
    const interval = setInterval(fetchWeatherData, selectedInterval);
    return () => clearInterval(interval);
  }, [selectedInterval, fetchWeatherData]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Stazione Meteo Cento (Polizia Locale)
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Intervallo agg.</InputLabel>
            <Select
              value={selectedInterval}
              onChange={(e) => setSelectedInterval(e.target.value)}
              label="Update Interval"
            >
              <MenuItem value={30000}>30 secondi</MenuItem>
              <MenuItem value={60000}>1 minuto</MenuItem>
              <MenuItem value={300000}>5 minuti</MenuItem>
              <MenuItem value={600000}>10 minuti</MenuItem>
            </Select>
          </FormControl>
          
          {lastUpdate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RefreshIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Ultimo aggiornamento: {lastUpdate.toLocaleString()}
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
        {weatherParameters.map((param) => {
          const values = param.keys.map(key => getValue(key)).filter(Boolean);
          return (
            <Grid item xs={12} sm={6} md={4} key={param.label}>
              <Card 
                sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
                onClick={() => handleCardClick(param)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ color: param.color }}>
                      {param.icon}
                    </Box>
                    <Typography variant="h6">{param.label}</Typography>
                  </Box>
                  {values.length > 0 ? (
  values.map((data, idx) => (
    <Box key={idx} sx={{ mb: idx < values.length - 1 ? 1 : 0 }}>
      <Typography variant="h5">
        {`${parseFloat(data.value).toFixed(1)} ${data.unit}`}
        {(param.keys[idx] === 'DIREZIONE_VENTO' || param.keys[idx] === 'DIREZIONE RAFFICA' )&& (
          <span style={{ marginLeft: 8, fontSize: '1.2rem' }}>
            {getWindDirectionArrow(data.value)}
          </span>
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {param.keyLabels[param.keys[idx]] || param.keys[idx]}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Ultimo agg.: {convertUTCToRome(data.time)}
      </Typography>
    </Box>
  ))
) : (
  <Typography color="text.secondary">No data available</Typography>
)}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {selectedParameter?.label} - Ultime 24h
        </DialogTitle>
        <DialogContent>
          <Box sx={{ height: 400, mt: 2, width: '100%' }}>
            {historicalData.length > 0 && historicalData[0].data.length > 0 && (
              <LineChart
                xAxis={[{
                  data: formatChartData(historicalData).xAxis,
                  scaleType: 'time',
                  tickMinStep: 3600000,
                  valueFormatter: (date) => formatChartTime(date)
                }]}
                series={formatChartData(historicalData).series.map(series => ({
                  ...series,
                  data: series.data,
                  showMark: false,
                }))}
                height={350}
                sx={{
                  '.MuiLineElement-root': {
                    strokeWidth: 2,
                  }
                }}
              />
            )}
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default WeatherDashboard;