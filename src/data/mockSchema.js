/**
 * mockSchema.js
 * Simulates a PostgreSQL-like database schema tree.
 * Structure: database → table → field[]
 */
import { TYPE_COLOR, TYPE_BADGE } from "../utils/chartUtils";

export { TYPE_COLOR, TYPE_BADGE };

export const schema = {
  research: {
    label: "research",
    tables: {
      scopus: {
        label: "scopus",
        dataKey: "scopus",            // maps to datasets[dataKey]
        fields: [
          { name: "id",              type: "string" },
          { name: "dc_title",        type: "string" },
          { name: "citedby_count",   type: "number" },
          { name: "prism_coverDate", type: "date"   },
        ],
      },
    },
  },

  business: {
    label: "business",
    tables: {
      revenue: {
        label: "revenue",
        dataKey: "revenue",
        fields: [
          { name: "month", type: "string" },
          { name: "value", type: "number" },
        ],
      },
    },
  },
};

/** Flatten into an array for easy lookup */
export function findTable(db, table) {
  return schema[db]?.tables?.[table] ?? null;
}
