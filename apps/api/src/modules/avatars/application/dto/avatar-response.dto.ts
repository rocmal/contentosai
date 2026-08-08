import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Avatar, AvatarAgeGroup, AvatarCategory, AvatarGender } from '../../domain/entities/avatar.entity';

export class AvatarResponseDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  organizationId: string;
  @ApiProperty()
  workspaceId: string;
  @ApiProperty()
  userId: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  slug: string;
  @ApiPropertyOptional()
  description: string | null;
  @ApiProperty()
  imageUrl: string;
  @ApiPropertyOptional()
  thumbnailUrl: string | null;
  @ApiProperty({ enum: AvatarCategory })
  category: AvatarCategory;
  @ApiProperty({ enum: AvatarGender })
  gender: AvatarGender;
  @ApiPropertyOptional()
  language: string | null;
  @ApiProperty({ type: [String] })
  tags: string[];
  @ApiPropertyOptional()
  voiceId: string | null;
  @ApiPropertyOptional()
  emotionDefault: string | null;
  @ApiProperty({ enum: AvatarAgeGroup })
  ageGroup: AvatarAgeGroup;
  @ApiProperty()
  isFavorite: boolean;
  @ApiProperty()
  isPublic: boolean;
  @ApiProperty()
  isArchived: boolean;
  @ApiPropertyOptional()
  qualityScore: number | null;
  @ApiProperty()
  provider: string;
  @ApiPropertyOptional()
  providerAvatarId: string | null;
  @ApiProperty()
  metadata: Record<string, unknown>;
  @ApiProperty()
  createdAt: Date;
  @ApiProperty()
  updatedAt: Date;

  constructor(avatar: Avatar) {
    this.id = avatar.id;
    this.organizationId = avatar.organizationId;
    this.workspaceId = avatar.workspaceId;
    this.userId = avatar.userId;
    this.name = avatar.name;
    this.slug = avatar.slug;
    this.description = avatar.description;
    this.imageUrl = avatar.imageUrl;
    this.thumbnailUrl = avatar.thumbnailUrl;
    this.category = avatar.category;
    this.gender = avatar.gender;
    this.language = avatar.language;
    this.tags = avatar.tags;
    this.voiceId = avatar.voiceId;
    this.emotionDefault = avatar.emotionDefault;
    this.ageGroup = avatar.ageGroup;
    this.isFavorite = avatar.isFavorite;
    this.isPublic = avatar.isPublic;
    this.isArchived = avatar.isArchived;
    this.qualityScore = avatar.qualityScore;
    this.provider = avatar.provider;
    this.providerAvatarId = avatar.providerAvatarId;
    this.metadata = avatar.metadata;
    this.createdAt = avatar.createdAt;
    this.updatedAt = avatar.updatedAt;
  }
}
