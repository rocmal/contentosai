import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
} from '@modules/character/domain/interfaces/character-provider.interface';
import { Avatar } from '../entities/avatar.entity';

export interface AvatarProviderCreateRequest {
  avatar: Avatar;
}

export interface AvatarProviderUpdateRequest {
  avatar: Avatar;
}

export interface AvatarProviderRecord {
  provider: string;
  providerAvatarId: string;
}

export interface IAvatarProvider {
  readonly name: string;
  createAvatar(request: AvatarProviderCreateRequest): Promise<AvatarProviderRecord>;
  updateAvatar(request: AvatarProviderUpdateRequest): Promise<AvatarProviderRecord>;
  deleteAvatar(providerAvatarId: string): Promise<void>;
  getAvatar(providerAvatarId: string): Promise<AvatarProviderRecord>;
  listAvatars(): Promise<AvatarProviderRecord[]>;
  generateTalkingVideo(request: CharacterGenerationRequest): Promise<CharacterGenerationResult>;
}
