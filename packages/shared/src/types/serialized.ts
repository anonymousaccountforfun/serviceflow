/**
 * Serialized<T> converts all Date fields to string and null to null | undefined.
 * Use this type when receiving data from the API where dates are JSON-serialized.
 *
 * @example
 * // Entity with Date fields
 * interface Customer {
 *   createdAt: Date;
 *   lastContactAt?: Date;
 * }
 *
 * // API response has strings instead
 * type CustomerResponse = Serialized<Customer>;
 * // { createdAt: string; lastContactAt?: string; }
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends Date | null
    ? string | null
    : T extends Date | undefined
      ? string | undefined
      : T extends Date | null | undefined
        ? string | null | undefined
        : T extends (infer U)[]
          ? Serialized<U>[]
          : T extends object
            ? { [K in keyof T]: Serialized<T[K]> }
            : T;

/**
 * SerializedWithRelations<T, R> extends Serialized to include optional relations.
 * Relations are typed as Serialized versions of their entity types.
 *
 * @example
 * type CustomerWithJobs = SerializedWithRelations<Customer, { jobs: Job[] }>;
 */
export type SerializedWithRelations<T, R extends object = object> = Serialized<T> & {
  [K in keyof R]?: Serialized<R[K]>;
};
