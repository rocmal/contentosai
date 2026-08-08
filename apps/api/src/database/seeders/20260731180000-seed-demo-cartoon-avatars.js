'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeds illustrated/cartoon-style avatars (DiceBear-generated SVGs) into the
 * "Lumora Demo" / "Default" workspace, mapped across all four avatar
 * categories. Idempotent - matched by (workspaceId, slug), safe to re-run.
 */
const AVATARS = [
  {
    name: 'Leo Sharp',
    slug: 'leo-sharp',
    description: 'Illustrated business avatar with a sharp, approachable look for corporate explainers.',
    imageUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo-Sharp&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Leo-Sharp&backgroundType=gradientLinear&size=200',
    category: 'business',
    gender: 'male',
    ageGroup: 'adult',
    tags: ['cartoon', 'illustrated', 'professional'],
    emotionDefault: 'confident',
    qualityScore: 88,
    isFavorite: false,
  },
  {
    name: 'Nova Chen',
    slug: 'nova-chen',
    description: 'Illustrated business avatar, clean and modern for corporate updates.',
    imageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova-Chen&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nova-Chen&backgroundType=gradientLinear&size=200',
    category: 'business',
    gender: 'female',
    ageGroup: 'young_adult',
    tags: ['cartoon', 'illustrated', 'professional'],
    emotionDefault: 'friendly',
    qualityScore: 87,
    isFavorite: false,
  },
  {
    name: 'Max Turbo',
    slug: 'max-turbo',
    description: 'Bold, fun cartoon avatar for punchy marketing and ad content.',
    imageUrl: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Max-Turbo&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Max-Turbo&backgroundType=gradientLinear&size=200',
    category: 'marketing',
    gender: 'male',
    ageGroup: 'young_adult',
    tags: ['cartoon', 'illustrated', 'energetic'],
    emotionDefault: 'excited',
    qualityScore: 85,
    isFavorite: true,
  },
  {
    name: 'Coco Bright',
    slug: 'coco-bright',
    description: 'Playful, colorful cartoon avatar built for social campaigns and promos.',
    imageUrl: 'https://api.dicebear.com/7.x/croodles/svg?seed=Coco-Bright&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/croodles/svg?seed=Coco-Bright&backgroundType=gradientLinear&size=200',
    category: 'marketing',
    gender: 'female',
    ageGroup: 'young_adult',
    tags: ['cartoon', 'illustrated', 'playful'],
    emotionDefault: 'happy',
    qualityScore: 86,
    isFavorite: false,
  },
  {
    name: 'Ivy Scholar',
    slug: 'ivy-scholar',
    description: 'Friendly illustrated avatar suited for course intros and tutorials.',
    imageUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Ivy-Scholar&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Ivy-Scholar&backgroundType=gradientLinear&size=200',
    category: 'education',
    gender: 'female',
    ageGroup: 'adult',
    tags: ['cartoon', 'illustrated', 'teacher'],
    emotionDefault: 'friendly',
    qualityScore: 89,
    isFavorite: false,
  },
  {
    name: 'Professor Finch',
    slug: 'professor-finch',
    description: 'Warm, wise illustrated avatar for lectures and training content.',
    imageUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Professor-Finch&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/notionists/svg?seed=Professor-Finch&backgroundType=gradientLinear&size=200',
    category: 'education',
    gender: 'male',
    ageGroup: 'senior',
    tags: ['cartoon', 'illustrated', 'professor'],
    emotionDefault: 'calm',
    qualityScore: 88,
    isFavorite: false,
  },
  {
    name: 'Ziggy Star',
    slug: 'ziggy-star',
    description: 'Expressive, modern illustrated avatar for creative and lifestyle content.',
    imageUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=Ziggy-Star&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/personas/svg?seed=Ziggy-Star&backgroundType=gradientLinear&size=200',
    category: 'custom',
    gender: 'non_binary',
    ageGroup: 'young_adult',
    tags: ['cartoon', 'illustrated', 'creative'],
    emotionDefault: 'happy',
    qualityScore: 84,
    isFavorite: false,
  },
  {
    name: 'Milo Byte',
    slug: 'milo-byte',
    description: 'Versatile illustrated avatar for mixed-format and experimental content.',
    imageUrl: 'https://api.dicebear.com/7.x/micah/svg?seed=Milo-Byte&backgroundType=gradientLinear',
    thumbnailUrl: 'https://api.dicebear.com/7.x/micah/svg?seed=Milo-Byte&backgroundType=gradientLinear&size=200',
    category: 'custom',
    gender: 'male',
    ageGroup: 'adult',
    tags: ['cartoon', 'illustrated', 'versatile'],
    emotionDefault: 'neutral',
    qualityScore: 83,
    isFavorite: false,
  },
];

async function findOne(queryInterface, Sequelize, table, where) {
  const columns = Object.keys(where)
    .map((key) => `${key} = :${key}`)
    .join(' AND ');
  const [row] = await queryInterface.sequelize.query(`SELECT * FROM ${table} WHERE ${columns} LIMIT 1`, {
    replacements: where,
    type: Sequelize.QueryTypes.SELECT,
  });
  return row ?? null;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const organization = await findOne(queryInterface, Sequelize, 'organizations', { slug: 'lumora-demo' });
    if (!organization) {
      throw new Error(
        'Organization "lumora-demo" not found - run the 20260101000002-seed-demo-users-and-organization seeder first.',
      );
    }

    const workspace = await findOne(queryInterface, Sequelize, 'workspaces', {
      organizationId: organization.id,
      slug: 'default',
    });
    if (!workspace) {
      throw new Error('Workspace "default" not found for organization "lumora-demo".');
    }

    const admin = await findOne(queryInterface, Sequelize, 'users', { email: 'admin@lumora.ai' });
    if (!admin) {
      throw new Error('User "admin@lumora.ai" not found - run the demo user/organization seeder first.');
    }

    const rows = [];
    for (const avatar of AVATARS) {
      const existing = await findOne(queryInterface, Sequelize, 'avatars', {
        workspaceId: workspace.id,
        slug: avatar.slug,
      });
      if (existing) continue;

      rows.push({
        id: uuidv4(),
        organizationId: organization.id,
        workspaceId: workspace.id,
        userId: admin.id,
        name: avatar.name,
        slug: avatar.slug,
        description: avatar.description,
        imageUrl: avatar.imageUrl,
        thumbnailUrl: avatar.thumbnailUrl,
        category: avatar.category,
        gender: avatar.gender,
        language: 'en-US',
        tags: JSON.stringify(avatar.tags),
        voiceId: null,
        emotionDefault: avatar.emotionDefault,
        ageGroup: avatar.ageGroup,
        isFavorite: avatar.isFavorite,
        isPublic: true,
        isArchived: false,
        qualityScore: avatar.qualityScore,
        provider: 'mock',
        providerAvatarId: avatar.slug,
        metadata: JSON.stringify({ seeded: true, style: 'cartoon' }),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdBy: admin.id,
        updatedBy: admin.id,
        version: 0,
      });
    }

    if (rows.length > 0) {
      await queryInterface.bulkInsert('avatars', rows);
    }
  },

  async down(queryInterface) {
    const organization = await queryInterface.sequelize.query(
      `SELECT id FROM organizations WHERE slug = 'lumora-demo'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!organization[0]) return;

    await queryInterface.bulkDelete('avatars', {
      organizationId: organization[0].id,
      slug: AVATARS.map((a) => a.slug),
    });
  },
};
