import React from "react";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const chartJsMock = vi.hoisted(() => ({
  configs: [],
  destroy: vi.fn(),
  resize: vi.fn(),
}));

vi.mock("chart.js/auto", () => ({
  default: class ChartMock {
    constructor(_context, config) {
      chartJsMock.configs.push(config);
    }

    destroy() {
      chartJsMock.destroy();
    }

    resize() {
      chartJsMock.resize();
    }
  },
}));

import ChartJsRenderer from "./ChartJsRenderer";

describe("ChartJsRenderer lifecycle", () => {
  beforeEach(() => {
    chartJsMock.configs.length = 0;
    chartJsMock.destroy.mockClear();
    chartJsMock.resize.mockClear();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({});
  });

  it("owns responsive resizing instead of enabling Chart.js detached-canvas observers", () => {
    const { unmount } = render(
      <ChartJsRenderer
        config={{
          type: "bar",
          data: { labels: ["A"], datasets: [{ data: [1] }] },
          options: { responsive: true },
        }}
      />
    );

    expect(chartJsMock.configs).toHaveLength(1);
    expect(chartJsMock.configs[0].options.responsive).toBe(false);

    unmount();
    expect(chartJsMock.destroy).toHaveBeenCalledTimes(1);
  });
});
