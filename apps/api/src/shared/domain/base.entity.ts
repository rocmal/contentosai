/**
 * Common audit/concurrency fields every domain entity carries. Plain data shape -
 * no ORM/framework types leak into the domain layer.
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
  version: number;
}
