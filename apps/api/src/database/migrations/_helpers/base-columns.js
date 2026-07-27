const { DataTypes } = require('sequelize');

/**
 * The mandatory column set for every table in the system: UUID primary key,
 * timestamps, soft delete, audit trail and an optimistic-locking version
 * column. Every migration below spreads this in so schema drift across
 * tables is impossible.
 */
function baseColumns() {
  return {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  };
}

module.exports = { baseColumns };
