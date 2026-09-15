import {
  gmFilterConditionOf,
  gmFilterDataTypeOf,
  gmToFilterDescriptors,
} from './table-config-filters';
import { GmFilterType } from './table-config.types';
import type { GmTableConfigColumn } from './table-config.types';
import { GmFilterCondition, GmFilterDataType } from './table-request.types';

interface Row {
  name: string;
  score: number;
  status: string;
  tags: string;
  active: boolean;
  joined: Date;
}

const COLUMNS: GmTableConfigColumn<Row>[] = [
  { field: 'name', header: 'name', filterType: GmFilterType.TEXT },
  { field: 'score', header: 'score', filterType: GmFilterType.NUMERIC },
  { field: 'status', header: 'status', filterType: GmFilterType.SELECT },
  { field: 'tags', header: 'tags', filterType: GmFilterType.MULTISELECT },
  { field: 'active', header: 'active', filterType: GmFilterType.BOOLEAN },
  { field: 'joined', header: 'joined', filterType: GmFilterType.DATE },
];

describe('gmToFilterDescriptors', () => {
  it('maps every operator onto the condition the endpoints publish', () => {
    expect(gmFilterConditionOf('contains')).toBe(GmFilterCondition.Contains);
    expect(gmFilterConditionOf('notContains')).toBe(
      GmFilterCondition.NotContains,
    );
    expect(gmFilterConditionOf('startsWith')).toBe(
      GmFilterCondition.StartsWith,
    );
    expect(gmFilterConditionOf('endsWith')).toBe(GmFilterCondition.EndsWith);
    expect(gmFilterConditionOf('equals')).toBe(GmFilterCondition.Equals);
    expect(gmFilterConditionOf('notEquals')).toBe(GmFilterCondition.NotEquals);
    expect(gmFilterConditionOf('gt')).toBe(GmFilterCondition.GreaterThan);
    expect(gmFilterConditionOf('gte')).toBe(
      GmFilterCondition.GreaterThanOrEqualTo,
    );
    expect(gmFilterConditionOf('lt')).toBe(GmFilterCondition.LessThan);
    expect(gmFilterConditionOf('lte')).toBe(
      GmFilterCondition.LessThanOrEqualTo,
    );
  });

  it('maps a filter type onto the data type the endpoints read', () => {
    expect(gmFilterDataTypeOf(GmFilterType.TEXT)).toBe(GmFilterDataType.String);
    expect(gmFilterDataTypeOf(GmFilterType.NUMERIC)).toBe(GmFilterDataType.Int);
    expect(gmFilterDataTypeOf(GmFilterType.DATE)).toBe(
      GmFilterDataType.DateTime,
    );
    expect(gmFilterDataTypeOf(GmFilterType.TIME)).toBe(
      GmFilterDataType.DateTime,
    );
    expect(gmFilterDataTypeOf(GmFilterType.BOOLEAN)).toBe(
      GmFilterDataType.Boolean,
    );
    // An unfiltered column still has to say something.
    expect(gmFilterDataTypeOf(undefined)).toBe(GmFilterDataType.String);
  });

  it('carries a text rule through as written', () => {
    expect(
      gmToFilterDescriptors(
        [{ field: 'name', operator: 'contains', value: 'clinic' }],
        COLUMNS,
      ),
    ).toEqual([
      {
        propertyName: 'name',
        dataType: GmFilterDataType.String,
        condition: GmFilterCondition.Contains,
        value: 'clinic',
        valueTo: null,
      },
    ]);
  });

  it('compares a picked option by substring, not exactly', () => {
    // The endpoints match a select's label against a longer stored
    // description, so `Equals` there would match nothing.
    const [descriptor] = gmToFilterDescriptors(
      [{ field: 'status', operator: 'equals', value: 'Draft' }],
      COLUMNS,
    );
    expect(descriptor.condition).toBe(GmFilterCondition.Contains);
  });

  it('always compares a boolean exactly, and sends it as text', () => {
    const [descriptor] = gmToFilterDescriptors(
      [{ field: 'active', operator: 'contains', value: false }],
      COLUMNS,
    );
    expect(descriptor.condition).toBe(GmFilterCondition.Equals);
    expect(descriptor.value).toBe('false');
  });

  it('stringifies a numeric value', () => {
    const [descriptor] = gmToFilterDescriptors(
      [{ field: 'score', operator: 'gte', value: 12 }],
      COLUMNS,
    );
    expect(descriptor.dataType).toBe(GmFilterDataType.Int);
    expect(descriptor.value).toBe('12');
  });

  it('sends a date as its ISO string', () => {
    const joined = new Date(Date.UTC(2026, 0, 5));
    const [descriptor] = gmToFilterDescriptors(
      [{ field: 'joined', operator: 'lt', value: joined }],
      COLUMNS,
    );
    expect(descriptor.condition).toBe(GmFilterCondition.LessThan);
    expect(descriptor.value).toBe(joined.toISOString());
  });

  it('keeps a multiselect list a list under one descriptor', () => {
    const [descriptor] = gmToFilterDescriptors(
      [{ field: 'tags', operator: 'in', value: ['a', 'b'] }],
      COLUMNS,
    );
    expect(descriptor.condition).toBe(GmFilterCondition.Equals);
    expect(descriptor.value).toEqual(['a', 'b'] as unknown as string);
  });

  it('emits one descriptor per rule, in order', () => {
    const descriptors = gmToFilterDescriptors(
      [
        { field: 'name', operator: 'startsWith', value: 'b', logic: 'or' },
        { field: 'name', operator: 'contains', value: 'clinic', logic: 'or' },
      ],
      COLUMNS,
    );
    expect(descriptors.length).toBe(2);
    expect(descriptors.map((d) => d.condition)).toEqual([
      GmFilterCondition.StartsWith,
      GmFilterCondition.Contains,
    ]);
  });

  it('leaves a rule on a column the config does not declare as plain text', () => {
    const [descriptor] = gmToFilterDescriptors(
      [{ field: 'unknown', operator: 'equals', value: 'x' }],
      COLUMNS,
    );
    expect(descriptor.dataType).toBe(GmFilterDataType.String);
    expect(descriptor.condition).toBe(GmFilterCondition.Equals);
  });
});
