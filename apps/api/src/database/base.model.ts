import {
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  Model,
  PrimaryKey,
  UpdatedAt,
} from 'sequelize-typescript';

/**
 * Base columns mandated for every table: UUID primary key, timestamps, soft
 * delete, audit trail (createdBy/updatedBy) and an optimistic-locking version
 * column. Sequelize's built-in `version: true` table option (set per-model via
 * @Table) increments this column automatically on every UPDATE and raises an
 * OptimisticLockError when a stale row is written.
 */
export abstract class BaseModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @DeletedAt
  declare deletedAt: Date | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare createdBy: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare updatedBy: string | null;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare version: number;
}
