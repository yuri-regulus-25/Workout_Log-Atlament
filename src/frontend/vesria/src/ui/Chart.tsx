import ApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { useReducedMotion } from "motion/react";
import { useRuntime } from "../application/runtime";

/** 読み取り専用chart。Reduced Motion時はApex側の補間も停止する。表は同じ値を提供する。 */
export default function Chart({
  kind = "area",
  labels,
  values,
  name,
  height = 230,
}: {
  kind?: "area" | "bar" | "donut";
  labels: string[];
  values: number[];
  name: string;
  height?: number;
}) {
  const systemReduced = useReducedMotion(),
    { reduced } = useRuntime();
  const options: ApexOptions = {
    chart: {
      background: "transparent",
      toolbar: { show: false },
      animations: { enabled: !systemReduced && !reduced },
      fontFamily: "inherit",
    },
    theme: { mode: "dark" },
    colors: [
      "#96e7ec",
      "#b0b5fa",
      "#67aebc",
      "#d9d2ac",
      "#88beae",
      "#7184a2",
      "#c4a7c8",
    ],
    stroke: { curve: "smooth", width: kind === "bar" ? 0 : 2 },
    fill: {
      type: kind === "area" ? "gradient" : "solid",
      gradient: { opacityFrom: 0.35, opacityTo: 0.01 },
    },
    grid: { borderColor: "#ffffff0c", strokeDashArray: 4 },
    xaxis: {
      categories: labels,
      labels: { style: { colors: "#8b9ea6", fontSize: "10px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      min: 0,
      labels: {
        style: { colors: "#8b9ea6" },
        formatter: (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1)),
      },
    },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { theme: "dark" },
    labels,
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "45%" },
      pie: { donut: { size: "78%" } },
    },
    noData: { text: "該当する記録なし" },
  };
  return (
    <div className="chart">
      <div aria-hidden="true">
        <ApexChart
          options={options}
          series={kind === "donut" ? values : [{ name, data: values }]}
          type={kind}
          height={height}
        />
      </div>
      <details className="chart-table">
        <summary>{name}を表で読む</summary>
        <table>
          <caption>{name}</caption>
          <thead>
            <tr>
              <th>対象</th>
              <th>値</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={`${label}-${i}`}>
                <td>{label}</td>
                <td>{values[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
