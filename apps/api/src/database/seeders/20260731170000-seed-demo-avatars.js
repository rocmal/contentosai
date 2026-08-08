'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeds a handful of ready-to-use avatars into the "Lumora Demo" / "Default"
 * workspace so Character Studio has something to show out of the box.
 * Idempotent - matched by (workspaceId, slug), safe to re-run.
 */
const AVATARS = [
  {
    name: 'Sarah Chen',
    slug: 'sarah-chen',
    description: 'Polished corporate presenter, ideal for executive updates and investor decks.',
    imageUrl: 'https://randomuser.me/api/portraits/women/44.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/women/44.jpg',
    category: 'business',
    gender: 'female',
    ageGroup: 'adult',
    tags: ['professional', 'corporate', 'presenter'],
    emotionDefault: 'confident',
    qualityScore: 96,
    isFavorite: true,
  },
  {
    name: 'James Wright',
    slug: 'james-wright',
    description: 'Authoritative executive avatar for formal announcements and leadership messages.',
    imageUrl: 'https://randomuser.me/api/portraits/men/32.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/men/32.jpg',
    category: 'business',
    gender: 'male',
    ageGroup: 'middle_aged',
    tags: ['executive', 'formal', 'leadership'],
    emotionDefault: 'serious',
    qualityScore: 94,
    isFavorite: false,
  },
  {
    name: 'Maria Lopez',
    slug: 'maria-lopez',
    description: 'Upbeat, energetic avatar built for social media ads and short-form promos.',
    imageUrl: 'https://randomuser.me/api/portraits/women/68.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/women/68.jpg',
    category: 'marketing',
    gender: 'female',
    ageGroup: 'young_adult',
    tags: ['social-media', 'energetic', 'casual'],
    emotionDefault: 'excited',
    qualityScore: 92,
    isFavorite: true,
  },
  {
    name: 'David Kim',
    slug: 'david-kim',
    description: 'Trendy, relatable avatar for influencer-style product spotlights.',
    imageUrl: 'https://randomuser.me/api/portraits/men/75.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/men/75.jpg',
    category: 'marketing',
    gender: 'male',
    ageGroup: 'young_adult',
    tags: ['influencer', 'trendy', 'casual'],
    emotionDefault: 'friendly',
    qualityScore: 90,
    isFavorite: false,
  },
  {
    name: 'Emily Johnson',
    slug: 'emily-johnson',
    description: 'Warm, clear-spoken avatar suited for course intros and explainer videos.',
    imageUrl: 'https://randomuser.me/api/portraits/women/21.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/women/21.jpg',
    category: 'education',
    gender: 'female',
    ageGroup: 'adult',
    tags: ['teacher', 'friendly', 'clear'],
    emotionDefault: 'friendly',
    qualityScore: 95,
    isFavorite: false,
  },
  {
    name: 'Robert Turner',
    slug: 'robert-turner',
    description: 'Calm, authoritative avatar for lectures, training modules, and tutorials.',
    imageUrl: 'https://randomuser.me/api/portraits/men/54.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/men/54.jpg',
    category: 'education',
    gender: 'male',
    ageGroup: 'senior',
    tags: ['professor', 'calm', 'authoritative'],
    emotionDefault: 'calm',
    qualityScore: 93,
    isFavorite: false,
  },
  {
    name: 'Aisha Patel',
    slug: 'aisha-patel',
    description: 'Vibrant, creative avatar for brand storytelling and lifestyle content.',
    imageUrl: 'https://randomuser.me/api/portraits/women/50.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/women/50.jpg',
    category: 'custom',
    gender: 'female',
    ageGroup: 'young_adult',
    tags: ['creative', 'vibrant', 'lifestyle'],
    emotionDefault: 'happy',
    qualityScore: 91,
    isFavorite: false,
  },
  {
    name: 'Alex Rivera',
    slug: 'alex-rivera',
    description: 'Versatile, modern avatar that works across mixed-format content.',
    imageUrl: 'https://randomuser.me/api/portraits/men/85.jpg',
    thumbnailUrl: 'https://randomuser.me/api/portraits/thumb/men/85.jpg',
    category: 'custom',
    gender: 'non_binary',
    ageGroup: 'adult',
    tags: ['modern', 'versatile'],
    emotionDefault: 'neutral',
    qualityScore: 89,
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
        metadata: JSON.stringify({ seeded: true }),
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
