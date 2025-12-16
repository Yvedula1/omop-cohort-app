import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Plot from "react-plotly.js";
import jsPDF from "jspdf";
import { mockAuth } from "./mockAuth";

const API = "http://localhost:8000";

// Disease dropdown
const DISEASES = [
  { key: "diabetes", label: "Diabetes" },
];

// Measurement picker
const MEASUREMENTS = [
  { id: 3004501, label: "Glucose [Mass/volume] in Serum or Plasma" },
  { id: 3000963, label: "Hemoglobin [Mass/volume] in Blood" },
];

export default function Dashboard() {
  const [disease, setDisease] = useState("diabetes");
  const [measurementId, setMeasurementId] = useState(3004501);

  const [counts, setCounts] = useState(null);
  const [ageSexRows, setAgeSexRows] = useState([]);
  const [outcomeRows, setOutcomeRows] = useState([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const plotRef = useRef(null);

  // ----------------------------
  // Fetch data
  // ----------------------------
  const buildCohort = async () => {
    setLoading(true);
    setMessage("");

    try {
      const c = await axios.get(`${API}/cohort/diabetes/patients`);
      setCounts(c.data);

      const a = await axios.get(`${API}/cohort/diabetes/age-sex`);
      setAgeSexRows(a.data.rows || []);

      const o = await axios.get(`${API}/cohort/diabetes/outcomes`, {
        params: { measurement_id: measurementId },
      });

      const rows = (o.data.rows || [])
        .filter((r) => r.value !== null)
        .map((r) => ({
          cohort: r.cohort,
          value: Number(r.value),
        }));

      setOutcomeRows(rows);

      if (rows.length === 0) {
        setMessage("No data available for selected measurement.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buildCohort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurementId, disease]);

  // ----------------------------
  // Age / Sex chart
  // ----------------------------
  const ageGroups = ["<20", "20–40", "40–60", "60+"];

  const ageSexTraces = useMemo(() => {
    const series = [
      { cohort: "Disease", sex: "Male", name: "Disease - Male" },
      { cohort: "Disease", sex: "Female", name: "Disease - Female" },
      { cohort: "Non-Disease", sex: "Male", name: "Non-Disease - Male" },
      { cohort: "Non-Disease", sex: "Female", name: "Non-Disease - Female" },
    ];

    return series.map((s) => ({
      type: "bar",
      name: s.name,
      x: ageGroups,
      y: ageGroups.map(
        (ag) =>
          ageSexRows.find(
            (r) =>
              r.cohort === s.cohort &&
              r.sex === s.sex &&
              r.age_group === ag
          )?.count || 0
      ),
    }));
  }, [ageSexRows]);

  // ----------------------------
  // Split cohorts
  // ----------------------------
  const diseaseValues = outcomeRows
    .filter((r) => r.cohort === "Disease")
    .map((r) => r.value);

  const nonDiseaseValues = outcomeRows
    .filter((r) => r.cohort === "Non-Disease")
    .map((r) => r.value);

  // ----------------------------
  // Stats
  // ----------------------------
  const stats = (values) => {
    if (!values.length) return { n: 0, median: "-", p25: "-", p75: "-" };
    const s = [...values].sort((a, b) => a - b);
    const q = (p) => s[Math.floor(p * (s.length - 1))];
    return {
      n: s.length,
      median: q(0.5),
      p25: q(0.25),
      p75: q(0.75),
    };
  };

  const dStats = stats(diseaseValues);
  const nStats = stats(nonDiseaseValues);

  // ----------------------------
  // Export
  // ----------------------------
  const exportPNG = async () => {
    const img = await window.Plotly.toImage(plotRef.current, {
      format: "png",
      width: 900,
      height: 450,
    });
    const a = document.createElement("a");
    a.href = img;
    a.download = "boxplot.png";
    a.click();
  };

  const exportPDF = async () => {
    const img = await window.Plotly.toImage(plotRef.current, {
      format: "png",
      width: 900,
      height: 450,
    });
    const pdf = new jsPDF("landscape");
    pdf.addImage(img, "PNG", 10, 10, 270, 150);
    pdf.save("boxplot.pdf");
  };

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <div style={{ padding: 30, fontFamily: "Arial" }}>
        <p>
  Logged in as: <b>{mockAuth.currentUser()}</b>
</p>

<button
  onClick={() => {
    mockAuth.logout();
    window.location.reload(); // simple mock reset
  }}
>
  Logout
</button>

      <h1>OMOP Cohort Builder</h1>

      {/* Disease dropdown */}
      <div>
        <b>Select Disease:</b>{" "}
        <select value={disease} onChange={(e) => setDisease(e.target.value)}>
          {DISEASES.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Measurement picker */}
      <div style={{ marginTop: 10 }}>
        <b>Select Outcome:</b>
        {MEASUREMENTS.map((m) => (
          <label key={m.id} style={{ marginLeft: 12 }}>
            <input
              type="radio"
              checked={measurementId === m.id}
              onChange={() => setMeasurementId(m.id)}
            />
            {m.label}
          </label>
        ))}
      </div>

      <button onClick={buildCohort} disabled={loading} style={{ marginTop: 10 }}>
        {loading ? "Loading..." : "Build Cohort"}
      </button>

      {message && <p style={{ color: "crimson" }}>{message}</p>}

      {/* Counts */}
      {counts && (
        <>
          <h3>Cohort Counts</h3>
          <p>
            Disease: <b>{counts.case_count}</b> | Non-Disease:{" "}
            <b>{counts.control_count}</b>
          </p>
        </>
      )}

      {/* Age / Sex */}
      <h3>Age-group / Sex Comparison</h3>
      <Plot
        data={ageSexTraces}
        layout={{ barmode: "group", height: 350 }}
        config={{ responsive: true }}
      />

      {/* Box plot */}
      <h3>Measurement Distribution</h3>

      
        <>
          <button onClick={exportPNG}>Export PNG</button>{" "}
          <button onClick={exportPDF}>Export PDF</button>

          <Plot
            onInitialized={(_, gd) => (plotRef.current = gd)}
            data={[
              { type: "box", name: "Disease", y: diseaseValues },
              { type: "box", name: "Non-Disease", y: nonDiseaseValues },
            ]}
            layout={{
              height: 400,
              yaxis: {
                title: MEASUREMENTS.find(
                  (m) => m.id === measurementId
                )?.label,
              },
            }}
            config={{ responsive: true, scrollZoom: true }}
          />
        </>
      
      {/* Stats */}
      <h3>Summary Statistics</h3>
      <table border="1" cellPadding="6">
        <tbody>
          <tr>
            <th>Cohort</th>
            <th>n</th>
            <th>Median</th>
            <th>P25</th>
            <th>P75</th>
          </tr>
          <tr>
            <td>Disease</td>
            <td>{dStats.n}</td>
            <td>{dStats.median}</td>
            <td>{dStats.p25}</td>
            <td>{dStats.p75}</td>
          </tr>
          <tr>
            <td>Non-Disease</td>
            <td>{nStats.n}</td>
            <td>{nStats.median}</td>
            <td>{nStats.p25}</td>
            <td>{nStats.p75}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
