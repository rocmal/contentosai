'use strict';

const { baseColumns } = require('./_helpers/base-columns');

const TIERS = ['economy', 'fast', 'studio'];
const MODES = [
  'text_to_video',
  'image_to_video',
  'video_to_video',
  'character',
  'voice',
  'music',
  'image',
  'text',
];
const UNITS = ['per_second', 'per_minute', 'per_image', 'per_1k_tokens', 'per_generation'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Capabilities: stable, one row per model, never effective-dated.
    await queryInterface.createTable('catalog_models', {
      ...baseColumns(),
      provider: { type: Sequelize.STRING(100), allowNull: false },
      modelId: { type: Sequelize.STRING(150), allowNull: false },
      displayName: { type: Sequelize.STRING(150), allowNull: false },
      tier: { type: Sequelize.ENUM(...TIERS), allowNull: false },
      supportedModes: { type: Sequelize.JSON, allowNull: false },
      supportedStyles: { type: Sequelize.JSON, allowNull: false },
      maxDurationSeconds: { type: Sequelize.INTEGER, allowNull: true },
      supportsNativeAudio: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      supportsStatefulEditing: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      isEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('catalog_models', ['modelId'], {
      unique: true,
      name: 'catalog_models_model_id_unique',
    });
    await queryInterface.addIndex('catalog_models', ['tier', 'isEnabled']);

    // Vendor cost: effective-dated, immutable rows. A price change is a new
    // row plus an effectiveTo on the old one - never an UPDATE of the rate.
    await queryInterface.createTable('model_prices', {
      ...baseColumns(),
      provider: { type: Sequelize.STRING(100), allowNull: false },
      modelId: { type: Sequelize.STRING(150), allowNull: false },
      unit: { type: Sequelize.ENUM('per_second', 'per_image', 'per_1k_tokens'), allowNull: false },
      unitCostUsd: { type: Sequelize.DECIMAL(12, 6), allowNull: false },
      minimumBillableUnits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      expectedSuccessRate: { type: Sequelize.DECIMAL(4, 3), allowNull: false, defaultValue: 1 },
      effectiveFrom: { type: Sequelize.DATE, allowNull: false },
      effectiveTo: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('model_prices', ['modelId', 'effectiveFrom']);

    // The published rate card. This is what users are charged.
    await queryInterface.createTable('tier_prices', {
      ...baseColumns(),
      tier: { type: Sequelize.ENUM(...TIERS), allowNull: false },
      mode: { type: Sequelize.ENUM(...MODES), allowNull: false },
      unit: { type: Sequelize.ENUM(...UNITS), allowNull: false },
      creditsPerUnit: { type: Sequelize.INTEGER, allowNull: false },
      minimumBillableUnits: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      effectiveFrom: { type: Sequelize.DATE, allowNull: false },
      effectiveTo: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addIndex('tier_prices', ['tier', 'mode', 'effectiveFrom'], {
      name: 'tier_prices_tier_mode_effective',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('tier_prices');
    await queryInterface.dropTable('model_prices');
    await queryInterface.dropTable('catalog_models');
  },
};
