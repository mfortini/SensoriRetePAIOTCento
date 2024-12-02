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
    color: '#FF5722',
    multiValue: true,
    chartColors: ['#FF5722', '#FF8A65', '#FFAB91']
  },
  { 
    icon: <OpacityIcon />, 
    label: 'Umidità Relativa', 
    keys: ['UMIDITA'], 
    color: '#2196F3',
    chartColors: ['#2196F3']
  },
  { 
    icon: <CompressIcon />, 
    label: 'Pressione Atmosferica', 
    keys: ['PRESSIONE'], 
    color: '#9C27B0',
    chartColors: ['#9C27B0']
  },
  { 
    icon: <AirIcon />, 
    label: 'Vento', 
    keys: ['VELOCITA MEDIA VENTO', 'VELOCITA MAX VENTO', 'VELOCITA MIN VENTO', 'DIREZIONE_VENTO', 'DIREZIONE RAFFICA'], 
    color: '#00BCD4',
    multiValue: true,
    chartColors: ['#00BCD4', '#4DD0E1', '#80DEEA']
  },
  { 
    icon: <WbSunnyIcon />, 
    label: 'Intensità della Radiazione Solare', 
    keys: ['RADIAZIONE', 'RADIAZIONE MAX'], 
    color: '#FFC107',
    multiValue: true,
    chartColors: ['#FFC107', '#FFD54F']
  },
  { 
    icon: <WaterDropIcon />, 
    label: 'Pioggia', 
    keys: ['PIOGGIA CUMULATA', 'PIOGGIA INCREMENTALE'], 
    color: '#4CAF50',
    multiValue: true,
    chartColors: ['#4CAF50', '#81C784']
  }
];

const convertUTCToRome = (utcDateString) => {
    try {
      // API returns dates in format "YYYY-MM-DD HH:mm:ss"
      // Add Z to make it explicit UTC
      const date = new Date(utcDateString.replace(' ', 'T') + 'Z');
      return date.toLocaleString('it-IT', { 
        timeZone: 'Europe/Rome',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (err) {
      console.error('Date conversion error:', err);
      return 'Invalid Date';
    }
  };
  
  const convertUTCToRomeDate = (utcDateString) => {
    try {
      const date = new Date(utcDateString.replace(' ', 'T') + 'Z');
      const romeDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
      return romeDate;
    } catch (err) {
      console.error('Date conversion error:', err);
      return new Date();
    }
  };
  
  const formatChartTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) {
      return '';
    }
    return date.toLocaleTimeString('it-IT', {
      timeZone: 'Europe/Rome',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getWindDirectionArrow = (degrees) => {
    if (degrees == null) return '';
    if (degrees >= 337.5 || degrees < 22.5) return '↑ N';
    if (degrees >= 22.5 && degrees < 67.5) return '↗ NE';
    if (degrees >= 67.5 && degrees < 112.5) return '→ E';
    if (degrees >= 112.5 && degrees < 157.5) return '↘ SE';
    if (degrees >= 157.5 && degrees < 202.5) return '↓ S';
    if (degrees >= 202.5 && degrees < 247.5) return '↙ SW';
    if (degrees >= 247.5 && degrees < 292.5) return '← W';
    if (degrees >= 292.5 && degrees < 337.5) return '↖ NW';
    return '';
  };
  
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
    const allData = [];

    for (const measureId of measureIds) {
      try {
        const [todayData, yesterdayData] = await Promise.all([
          fetch(`${API_BASE_URL}/getMeasureRealTimeData/${measureId}/${dates.today}`).then(res => res.json()),
          fetch(`${API_BASE_URL}/getMeasureRealTimeData/${measureId}/${dates.yesterday}`).then(res => res.json())
        ]);

        const combinedData = [...todayData, ...yesterdayData]
          .sort((a, b) => new Date(a.timestamp + 'Z') - new Date(b.timestamp + 'Z'))
          .filter(d => {
            const date = new Date(d.timestamp + 'Z');
            const now = new Date();
            const diff = now - date;
            return diff <= 24 * 60 * 60 * 1000;
          });

        allData.push({
          id: measureId,
          data: combinedData
        });
      } catch (err) {
        console.error(`Error fetching historical data for measure ${measureId}:`, err);
      }
    }

    return allData;
  };

  const formatChartData = (historicalData) => {
    if (!historicalData.length) return { xAxis: [], series: [] };

    const timestamps = historicalData[0].data.map(d => convertUTCToRomeDate(d.timestamp));

    const series = historicalData.map((dataset, index) => ({
      data: dataset.data.map(d => parseFloat(d.value)),
      label: selectedParameter?.keys[index],
      color: selectedParameter?.chartColors[index],
    }));

    return {
      xAxis: timestamps,
      series: series,
    };
  };

  const handleCardClick = async (parameter) => {
    setSelectedParameter(parameter);
    setDialogOpen(true);

    const measureIds = parameter.keys
      .map(key => {
        const mainMeasure = weatherData.main?.measures.find(m => m.descrizione.includes(key));
        const windMeasure = weatherData.wind?.measures.find(m => m.descrizione.includes(key));
        return (mainMeasure || windMeasure)?.id_misura;
      })
      .filter(Boolean);

    const historicalDataResult = await fetchHistoricalData(measureIds);
    setHistoricalData(historicalDataResult);
  };

  const getValue = (description) => {
    if (!weatherData.main || !weatherData.wind) return null;
    
    let measure = weatherData.main.measures.find(m => m.descrizione.includes(description));
    let value = measure && weatherData.main.data.find(d => d.id_measure === measure.id_misura);
    
    if (!value) {
      measure = weatherData.wind.measures.find(m => m.descrizione.includes(description));
      value = measure && weatherData.wind.data.find(d => d.id_measure === measure.id_misura);
    }
    
    return value && measure ? {
      value: value.value,
      unit: measure.descrizione_unita_misura,
      time: value.timestamp || value.timedate, // Handle both timestamp and timedate fields
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
                        {/* Add wind direction arrow for DIREZIONE */}
                        {param.keys[idx] === 'DIREZIONE' && (
                          <span style={{ marginLeft: 8, fontSize: '1.2rem' }}>
                            {getWindDirectionArrow(data.value)}
                          </span>
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {param.keys[idx]}
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