import React, { memo } from "react";
import type { DemoDatasetRow } from "@modules/dashboards/designer-v2/components/services/datasetService";
import type { ChartConfig, DataField, DeviceMode, TransformedChartData } from "@modules/dashboards/designer-v2/components/types";
import EChartsRenderer from "@modules/dashboards/designer-v2/components/components/charts/EChartsRenderer";

type ChartPreviewProps = {
  config: ChartConfig;
  datasetRows: DemoDatasetRow[];
  fields: DataField[];
  previewMode: boolean;
  deviceMode: DeviceMode;
  zoom: number;
  density?: "standard" | "compact" | "mini";
  transformedData?: TransformedChartData;
};

function ChartPreview({ config, datasetRows, fields, previewMode, deviceMode, zoom, density = "standard", transformedData }: ChartPreviewProps) {
  return (
    <EChartsRenderer
      chartType={config.chartType}
      datasetRows={datasetRows}
      allFields={fields}
      fieldMappings={config.mappings}
      chartSettings={config.settings}
      filters={config.filters}
      sort={config.sort}
      textElements={config.textElements}
      imageName={config.imageName}
      previewMode={previewMode}
      deviceMode={deviceMode}
      zoom={zoom}
      density={density}
      transformedData={transformedData}
    />
  );
}

export default memo(ChartPreview);
