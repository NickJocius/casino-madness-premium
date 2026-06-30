import {
  dinero,
  toSnapshot,
  toDecimal,
  add as dineroAdd,
  subtract as dineroSubtract,
  multiply as dineroMultiply,
  allocate as dineroAllocate,
  equal as dineroEqual,
  greaterThan as dineroGt,
  greaterThanOrEqual as dineroGte,
  lessThan as dineroLt,
  isZero as dineroIsZero,
  isNegative as dineroIsNegative,
} from 'dinero.js';
import type { Dinero } from 'dinero.js';
import { USD } from 'dinero.js/currencies';

export type MoneyAmount = Dinero<number, 'USD'>;

export function toMoney(cents: number): MoneyAmount {
  if (!Number.isInteger(cents)) {
    throw new Error(`toMoney expects integer cents, got ${cents}`);
  }
  return dinero({ amount: cents, currency: USD });
}

export function toCents(money: MoneyAmount): number {
  return toSnapshot(money).amount;
}

export function toDisplayString(money: MoneyAmount): string {
  return toDecimal(money, ({ value, currency }) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value))
  );
}

export function add(a: MoneyAmount, b: MoneyAmount): MoneyAmount {
  return dineroAdd(a, b);
}

export function subtract(a: MoneyAmount, b: MoneyAmount): MoneyAmount {
  return dineroSubtract(a, b);
}

export function multiply(money: MoneyAmount, multiplier: number): MoneyAmount {
  if (!Number.isInteger(multiplier)) {
    throw new Error(`multiply expects an integer multiplier, got ${multiplier}`);
  }
  return dineroMultiply(money, multiplier);
}

export function allocate(money: MoneyAmount, ratios: readonly number[]): readonly MoneyAmount[] {
  return dineroAllocate(money, ratios);
}

export function equal(a: MoneyAmount, b: MoneyAmount): boolean {
  return dineroEqual(a, b);
}

export function greaterThan(a: MoneyAmount, b: MoneyAmount): boolean {
  return dineroGt(a, b);
}

export function greaterThanOrEqual(a: MoneyAmount, b: MoneyAmount): boolean {
  return dineroGte(a, b);
}

export function lessThan(a: MoneyAmount, b: MoneyAmount): boolean {
  return dineroLt(a, b);
}

export function isZero(money: MoneyAmount): boolean {
  return dineroIsZero(money);
}

export function isNegative(money: MoneyAmount): boolean {
  return dineroIsNegative(money);
}
