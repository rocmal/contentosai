import { Injectable } from '@nestjs/common';
import { CharacterProviderFactory } from '@modules/character/infrastructure/character-provider.factory';
import {
  AvatarProviderCreateRequest,
  AvatarProviderRecord,
  AvatarProviderUpdateRequest,
  IAvatarProvider,
} from '../../domain/interfaces/avatar-provider.interface';
import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
} from '@modules/character/domain/interfaces/character-provider.interface';

@Injectable()
export class MockAvatarProvider implements IAvatarProvider {
  readonly name = 'mock';

  constructor(private readonly characterProviderFactory: CharacterProviderFactory) {}

  async createAvatar(request: AvatarProviderCreateRequest): Promise<AvatarProviderRecord> {
    return { provider: this.name, providerAvatarId: request.avatar.id };
  }

  async updateAvatar(request: AvatarProviderUpdateRequest): Promise<AvatarProviderRecord> {
    return { provider: this.name, providerAvatarId: request.avatar.providerAvatarId ?? request.avatar.id };
  }

  async deleteAvatar(): Promise<void> {
    return undefined;
  }

  async getAvatar(providerAvatarId: string): Promise<AvatarProviderRecord> {
    return { provider: this.name, providerAvatarId };
  }

  async listAvatars(): Promise<AvatarProviderRecord[]> {
    return [];
  }

  generateTalkingVideo(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    return this.characterProviderFactory.getProvider('sadtalker').submitJob(request);
  }
}
