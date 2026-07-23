import type { EChartsType } from "echarts/core";

let latestChartInstance: EChartsType | null = null;

function isLiveEChartsInstance(instance: EChartsType | null): instance is EChartsType {
  if (!instance) return false;
  try {
    return !instance.isDisposed();
  } catch {
    return false;
  }
}

export function setLatestEChartsInstance(instance: EChartsType) {
  if (!isLiveEChartsInstance(instance)) return;
  latestChartInstance = instance;
}

export function clearLatestEChartsInstance(instance?: EChartsType) {
  if (!instance || latestChartInstance === instance) {
    latestChartInstance = null;
  }
}

export function getLatestEChartsDataUrl() {
  if (!isLiveEChartsInstance(latestChartInstance)) {
    latestChartInstance = null;
    return null;
  }
  try {
    return latestChartInstance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#FFFFFF",
    });
  } catch {
    latestChartInstance = null;
    return null;
  }
}
