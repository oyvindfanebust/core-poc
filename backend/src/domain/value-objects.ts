import { Currency } from '../types/index.js';

/**
 * Money value object that handles financial amounts with proper precision
 */
export class Money {
  private readonly _amount: bigint;
  private readonly _currency: Currency;

  constructor(amount: bigint | string | number, currency: Currency) {
    if (typeof amount === 'string') {
      this._amount = BigInt(amount);
    } else if (typeof amount === 'number') {
      // Convert number to string first to avoid floating point issues
      this._amount = BigInt(Math.round(amount));
    } else {
      this._amount = amount;
    }
    this._currency = currency;
  }

  get amount(): bigint {
    return this._amount;
  }

  get currency(): Currency {
    return this._currency;
  }

  /**
   * Add two Money objects (must be same currency)
   */
  add(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot add different currencies: ${this._currency} and ${other._currency}`);
    }
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract two Money objects (must be same currency)
   */
  subtract(other: Money): Money {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot subtract different currencies: ${this._currency} and ${other._currency}`);
    }
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiply by a number (for interest calculations, etc.)
   */
  multiply(factor: number): Money {
    return new Money(this._amount * BigInt(Math.round(factor * 100)) / 100n, this._currency);
  }

  /**
   * Check if this money is greater than another
   */
  greaterThan(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot compare different currencies: ${this._currency} and ${other._currency}`);
    }
    return this._amount > other._amount;
  }

  /**
   * Check if this money is less than another
   */
  lessThan(other: Money): boolean {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot compare different currencies: ${this._currency} and ${other._currency}`);
    }
    return this._amount < other._amount;
  }

  /**
   * Check if this money equals another
   */
  equals(other: Money): boolean {
    return this._currency === other._currency && this._amount === other._amount;
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this._amount === 0n;
  }

  /**
   * Check if amount is positive
   */
  isPositive(): boolean {
    return this._amount > 0n;
  }

  /**
   * Check if amount is negative
   */
  isNegative(): boolean {
    return this._amount < 0n;
  }

  /**
   * Get absolute value
   */
  abs(): Money {
    return new Money(this._amount < 0n ? -this._amount : this._amount, this._currency);
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return this._amount.toString();
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): { amount: string; currency: Currency } {
    return {
      amount: this._amount.toString(),
      currency: this._currency,
    };
  }

  /**
   * Create Money from JSON object
   */
  static fromJSON(json: { amount: string; currency: Currency }): Money {
    return new Money(json.amount, json.currency);
  }

  /**
   * Create zero money in given currency
   */
  static zero(currency: Currency): Money {
    return new Money(0n, currency);
  }
}

/**
 * Account ID value object for type safety
 */
export class AccountId {
  private readonly _value: bigint;

  constructor(value: bigint | string) {
    if (typeof value === 'string') {
      this._value = BigInt(value);
    } else {
      this._value = value;
    }
  }

  get value(): bigint {
    return this._value;
  }

  toString(): string {
    return this._value.toString();
  }

  equals(other: AccountId): boolean {
    return this._value === other._value;
  }

  toJSON(): string {
    return this._value.toString();
  }

  static fromString(value: string): AccountId {
    return new AccountId(value);
  }
}

/**
 * Customer ID value object for type safety
 */
export class CustomerId {
  private readonly _value: string;

  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Customer ID cannot be empty');
    }
    if (value.length > 50) {
      throw new Error('Customer ID cannot be longer than 50 characters');
    }
    if (!/^[A-Za-z0-9\-_]+$/.test(value)) {
      throw new Error('Customer ID must contain only letters, numbers, hyphens, and underscores');
    }
    this._value = value.trim();
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  equals(other: CustomerId): boolean {
    return this._value === other._value;
  }

  toJSON(): string {
    return this._value;
  }
}