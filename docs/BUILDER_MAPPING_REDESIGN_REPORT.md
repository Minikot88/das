# Builder Mapping Redesign Report

Date: 2026-06-16

## Scope

Target screen: `/builder`

This sprint focused on making field mapping the primary Builder workflow while preserving existing chart generation, preview, save, dataset, and routing behavior.

## Files Changed

- `src/features/builder/BuilderPage.jsx`
- `src/features/builder/DropZone.jsx`
- `src/styles/layoutArchitecturePass.css`

## UX Changes Completed

### Summary Strip Removed

Removed the `builder-v3-summary-bar` from the Builder page.

Removed summary items:

- ประเภทกราฟ
- ชุดข้อมูล
- X Axis
- Y Axis
- Series

The top area now keeps only the primary save action, reducing repeated metadata and giving more space to the core mapping workflow.

### Field Mapping Promoted

Moved `builder-v3-mapping-panel` out of the right-side accordion and into the primary Builder flow below the chart type selector.

New workflow:

1. เลือกรูปแบบกราฟ
2. แมปฟิลด์
3. ดูตัวอย่าง
4. ตั้งค่าเพิ่มเติม

This makes the required chart setup steps more visible and reduces the need to hunt inside settings accordions.

### Drag and Drop Mapping Improved

Dataset fields remain draggable and the mapping zones now support clearer drag/drop behavior:

- Drag enter
- Drag over
- Drag leave
- Drop
- Remove mapped field

Roles supported:

- แกน X
- แกน Y
- กลุ่มข้อมูล

Drop zones now show a visible active state while dragging over them.

### Live Preview Preserved

The promoted mapping panel still uses the existing Builder callbacks:

- `builder.assignField`
- `builder.removeField`
- `builder.canAssignField`

Because the same state path is preserved, mapping updates continue to update the chart preview immediately.

### Save Action Preserved

The save button remains in the top-right action area.

No duplicate save controls were added.

## Responsive Layout

### Desktop

Layout remains:

- Dataset
- Mapping and Preview
- Save/Settings

The mapping panel is now in the center workflow, directly above the preview.

### Tablet

Layout stacks into:

- Dataset
- Chart type and Mapping
- Preview
- Settings

This avoids the crowded three-column layout at tablet widths.

### Mobile

Layout stacks into a single-column workflow with full-width Builder sections.

## Validation

Browser validation covered:

- 1920x900
- 1440x900
- 1024x900
- 768x900
- 375x812
- 320x812

Results:

- `builder-v3-summary-bar`: 0 instances
- `builder-v3-mapping-panel`: 1 instance
- Drop zones: 3
- Draggable fields: 19
- Horizontal overflow: none
- Clipped Builder cards/drop zones/preview frames: none
- Console errors: none

## Command Verification

Passed:

```bash
npm run build
npm run lint
npm test
```

Test result:

- 7 test files passed
- 9 tests passed

## Known Limitations

- This was intentionally UI-focused. No chart logic, dataset logic, API contracts, dashboard persistence, or routing behavior was changed.
- Tablet order keeps chart type selection above mapping because the requested placement was below the chart type selector.
