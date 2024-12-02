import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { DateTime } from "luxon";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = "https://sensornet-api.lepida.it"; // Replace with the actual base URL

const Dashboard = () => {
  const [stations, setStations] = useState([
    { id: 12494, name: "Meteo 1" },
    { id: 12501, name: "Meteo 2" },
    { id: 10991, name: "Traffico Ponte Vecchio verso Pieve" },
    { id: 10993, name: "Traffico Ponte Vecchio verso Cento" },
  ]); // Example station list; replace or dynamically fetch
  const [selectedStation, setSelectedStation] = useState("");
  const [measures, setMeasures] = useState([]);
  const [selectedMeasure, setSelectedMeasure] = useState("");
  const [currentValue, setCurrentValue] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch measures when a station is selected
  useEffect(() => {
    if (!selectedStation) return;

    const fetchMeasures = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/getMeasuresID/${selectedStation}`
        );
        setMeasures(response.data);
      } catch (error) {
        console.error("Error fetching measures:", error);
      }
    };

    fetchMeasures();
  }, [selectedStation]);

  // Fetch the latest value for the selected measure
  useEffect(() => {
    if (!selectedMeasure) return;

    const fetchCurrentValue = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/getMeasureLastData/${selectedMeasure}`
        );
        setCurrentValue(response.data);
      } catch (error) {
        console.error("Error fetching current value:", error);
      }
    };

    fetchCurrentValue();
  }, [selectedMeasure]);

  // Fetch the time-series data for the current day
  useEffect(() => {
    if (!selectedMeasure) return;

    const fetchChartData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0]; // Get current date in yyyy-MM-dd format

      try {
        const response = await axios.get(
          `${API_BASE_URL}/getMeasureRealTimeData/${selectedMeasure}/${today}`
        );

        // Prepare data for the chart
        const timestamps = response.data.map((entry) =>
            DateTime.fromISO(entry.timestamp.replace(" ", "T"), { zone: "UTC" })
              .setZone("Europe/Rome")
              .toFormat("HH:mm")
          );
        const values = response.data.map((entry) => parseFloat(entry.value));

        setChartData({
          labels: timestamps,
          datasets: [
            {
              label: "Sensor Values",
              data: values,
              borderColor: "rgba(75,192,192,1)",
              backgroundColor: "rgba(75,192,192,0.2)",
              fill: true,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [selectedMeasure]);

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Sensor Dashboard
      </Typography>

      {/* Station Selector */}
      <FormControl fullWidth margin="normal">
        <InputLabel>Select Station</InputLabel>
        <Select
          value={selectedStation}
          onChange={(e) => {
            setSelectedStation(e.target.value);
            setMeasures([]);
            setSelectedMeasure("");
          }}
        >
          {stations.map((station) => (
            <MenuItem key={station.id} value={station.id}>
              {station.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Measure Selector */}
      {measures.length > 0 && (
        <FormControl fullWidth margin="normal">
          <InputLabel>Select Measure</InputLabel>
          <Select
            value={selectedMeasure}
            onChange={(e) => setSelectedMeasure(e.target.value)}
          >
            {measures.map((measure) => (
              <MenuItem key={measure.id_misura} value={measure.id_misura}>
                {measure.descrizione} ({measure.descrizione_unita_misura})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Current Value Display */}
      {currentValue && (
        <Card variant="outlined" style={{ marginTop: "16px" }}>
          <CardContent>
            <Typography variant="h6">Current Value</Typography>
            <Typography>
              {currentValue.value}{" "}
              {
                measures.find((m) => m.id_misura === selectedMeasure)
                  ?.descrizione_unita_misura
              }
            </Typography>
            <Typography variant="caption">
            Timestamp:{" "}
            {DateTime.fromISO(currentValue.timedate.replace(" ", "T"), { zone: "UTC" })
                .setZone("Europe/Rome")
                .toLocaleString(DateTime.DATETIME_MED)}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      {loading ? (
        <CircularProgress style={{ marginTop: "16px" }} />
      ) : chartData ? (
        <Card variant="outlined" style={{ marginTop: "16px" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Today's Data
            </Typography>
            <Line data={chartData} />
          </CardContent>
        </Card>
      ) : (
        <Typography style={{ marginTop: "16px" }}>
          Select a station and measure to view the data.
        </Typography>
      )}
    </Container>
  );
};

export default Dashboard;
