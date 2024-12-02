import React, { useState, useEffect } from "react";
import axios from "axios";

axios.defaults.baseURL = 'https://sensornet-api.lepida.it'; // Replace with your actual base URL

// Mapping station names to their respective IDs
const stationMap = {
  "Traffico - MTS - SP 10 dalla Loc. Decima al Confine provinciale BO/FE (BO)": 1748,
  "Traffico - MTS - SP 11 fra Pieve di Cento e San Pietro in Casale (BO)": 1462,
  "Traffico - MTS - SP 42 fra Pieve di Cento e Castello d'Argile (BO)": 1456,
  "Traffico - MTS - SP 66 fra Cento e Sant'Agostino (FE)": 1459,
  "Traffico - MTS - SP 6 fra Cento e Pilastrello (FE)": 1453,
  "IDRO - Arpa - Cento (FE)": 791
};


const SensorDashboard = ({ pollingInterval }) => {
  const [measureData, setMeasureData] = useState({}); // Store fetched measure data
  const [measureMetadata, setMeasureMetadata] = useState({}); // Metadata for measures
  const [error, setError] = useState(null);

  // Step 1: Fetch Measure Metadata for All Stations
  const fetchMeasureMetadata = async () => {
    try {
      const metadata = {};
      const measures = await Promise.all(
        Object.entries(stationMap).map(async ([stationName, stationId]) => {
          const response = await axios.get(`/getMeasuresID/${stationId}`);
          metadata[stationName] = response.data.map((item) => ({
            id_misura: item.id_misura,
            descrizione: item.descrizione,
            unita_misura: item.unita_misura,
            descrizione_unita_misura: item.descrizione_unita_misura,
          }));
          return metadata[stationName];
        })
      );
      setMeasureMetadata(metadata);
    } catch (err) {
      console.error("Error fetching measure metadata:", err);
      setError("Failed to fetch measure metadata. Please try again.");
    }
  };

  // Step 2: Fetch Latest Data for All Measures
  const fetchLatestData = async () => {
    try {
      // Collect all measure IDs from metadata
      const allMeasureIds = Object.values(measureMetadata)
        .flat()
        .map((meta) => meta.id_misura);

      if (allMeasureIds.length === 0) return;

      const idsString = allMeasureIds.join(",");
      const response = await axios.get(`/getMeasureListLastData/${idsString}`);

      // Update measure data
      setMeasureData(response.data); // Assuming the response matches the metadata structure
    } catch (err) {
      console.error("Error fetching latest measure data:", err);
      setError("Failed to fetch the latest measure data. Please try again.");
    }
  };

  // Initialize metadata on mount
  useEffect(() => {
    fetchMeasureMetadata();
  }, []);

  // Periodically fetch latest data
  useEffect(() => {
    const intervalId = setInterval(fetchLatestData, pollingInterval);

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [measureMetadata, pollingInterval]);

  return (
    <div>
      <h1>Sensor Dashboard</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        {Object.entries(measureMetadata).length > 0 ? (
          Object.entries(measureMetadata).map(([stationName, metadata]) => (
            <div key={stationName}>
              <h2>{stationName}</h2>
              {metadata.map((measure) => (
                <div key={measure.id_misura}>
                  <p>
                    <strong>{measure.descrizione}</strong> ({measure.descrizione_unita_misura})
                  </p>
                  <pre>
                    {JSON.stringify(
                      measureData[measure.id_misura] || "No data available",
                      null,
                      2
                    )}
                  </pre>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p>Loading metadata...</p>
        )}
      </div>
    </div>
  );
};

export default SensorDashboard;







