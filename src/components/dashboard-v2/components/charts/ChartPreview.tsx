import React, { memo } from "react";
import type { DemoDatasetRow } from "../../services/datasetService";
import type { ChartConfig, DataField, DeviceMode } from "../../types";
import EChartsRenderer from "./EChartsRenderer";

type ChartPreviewProps = {
  config: ChartConfig;
  datasetRows: DemoDatasetRow[];
  fields: DataField[];
  previewMode: boolean;
  deviceMode: DeviceMode;
  zoom: number;
};

function ChartPreview({ config, datasetRows, fields, previewMode, deviceMode, zoom }: ChartPreviewProps) {
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
    />
  );
}

export default memo(ChartPreview);
