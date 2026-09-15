import { GmFilterType } from './table-config.types';
import type { GmTableConfigColumn } from './table-config.types';
import { GmFilterCondition, GmFilterDataType } from './table-request.types';
import type { GmFilterDescriptor } from './table-request.types';
import type { GmFilterOperator, GmTableFilter } from './table-filter.types';

/**
 * Translates the table's own filters into the descriptors a list endpoint
 * takes.
 *
 * Kept as a pure function rather than folded into the component so the mapping
 * can be tested on its own — it is the one place the library's vocabulary
 * meets the API's, and getting a condition number wrong is silent.
 */

const CONDITION_BY_OPERATOR: Record<GmFilterOperator, GmFilterCondition> = {
  contains: GmFilterCondition.Contains,
  notContains: GmFilterCondition.NotContains,
  startsWith: GmFilterCondition.StartsWith,
  endsWith: GmFilterCondition.EndsWith,
  equals: GmFilterCondition.Equals,
  notEquals: GmFilterCondition.NotEquals,
  gt: GmFilterCondition.GreaterThan,
  gte: GmFilterCondition.GreaterThanOrEqualTo,
  lt: GmFilterCondition.LessThan,
  lte: GmFilterCondition.LessThanOrEqualTo,
  // A multiselect posts its whole list under one descriptor, and the endpoints
  // read that as "equals any of these" — there is no separate `in` condition.
  in: GmFilterCondition.Equals,
};

const DATA_TYPE_BY_FILTER_TYPE: Record<GmFilterType, GmFilterDataType> = {
  [GmFilterType.TEXT]: GmFilterDataType.String,
  [GmFilterType.NUMERIC]: GmFilterDataType.Int,
  [GmFilterType.DATE]: GmFilterDataType.DateTime,
  [GmFilterType.TIME]: GmFilterDataType.DateTime,
  [GmFilterType.BOOLEAN]: GmFilterDataType.Boolean,
  [GmFilterType.SELECT]: GmFilterDataType.String,
  [GmFilterType.MULTISELECT]: GmFilterDataType.String,
};

export function gmFilterDataTypeOf(type?: GmFilterType): GmFilterDataType {
  return type ? DATA_TYPE_BY_FILTER_TYPE[type] : GmFilterDataType.String;
}

export function gmFilterConditionOf(
  operator: GmFilterOperator,
): GmFilterCondition {
  return CONDITION_BY_OPERATOR[operator] ?? GmFilterCondition.Equals;
}

export function gmToFilterDescriptors<T>(
  filters: readonly GmTableFilter[],
  columns: readonly GmTableConfigColumn<T>[],
): GmFilterDescriptor[] {
  return filters.map((filter) => {
    const column = columns.find((candidate) => candidate.field === filter.field);
    const dataType = gmFilterDataTypeOf(column?.filterType);

    return {
      propertyName: filter.field,
      dataType,
      condition: conditionFor(filter, column?.filterType, dataType),
      value: serialise(filter.value, dataType),
      valueTo: null,
    };
  });
}

/**
 * A picked option filters by *substring*, not by exact match: the endpoints
 * compare a select's label against a longer stored description, and an
 * `Equals` there matches nothing. Booleans always compare exactly.
 */
function conditionFor(
  filter: GmTableFilter,
  filterType: GmFilterType | undefined,
  dataType: GmFilterDataType,
): GmFilterCondition {
  if (dataType === GmFilterDataType.Boolean) {
    return GmFilterCondition.Equals;
  }
  if (filterType === GmFilterType.SELECT) {
    return GmFilterCondition.Contains;
  }
  return gmFilterConditionOf(filter.operator);
}

/**
 * Descriptor values travel as text. A date goes as its ISO string, which is
 * what serialising the `Date` would have produced anyway, and a multiselect's
 * list stays a list — the endpoints read an array there, so flattening it to a
 * string would change the query.
 */
function serialise(
  value: unknown,
  dataType: GmFilterDataType,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value as unknown as string;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (
    dataType === GmFilterDataType.Int ||
    dataType === GmFilterDataType.Decimal ||
    dataType === GmFilterDataType.Boolean
  ) {
    return String(value);
  }
  return typeof value === 'string' ? value : String(value);
}
