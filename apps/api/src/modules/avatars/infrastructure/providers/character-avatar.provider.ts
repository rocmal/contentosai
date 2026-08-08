import { Injectable, ServiceUnavailableException } from '@nestjs/common';
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

export abstract class CharacterAvatarProvider implements IAvatarProvider {
  abstract readonly name: string;

  protected constructor(private readonly characterProviderFactory: CharacterProviderFactory) {}

  async createAvatar(request: AvatarProviderCreateRequest): Promise<AvatarProviderRecord> {
    return { provider: this.name, providerAvatarId: request.avatar.providerAvatarId ?? request.avatar.id };
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
    return this.characterProviderFactory.getProvider(this.name).submitJob(request);
  }

  protected unavailable(feature: string): never {
    throw new ServiceUnavailableException(`${this.name} avatar ${feature} is not configured yet`);
  }
}

@Injectable()
export class HeyGenAvatarProvider extends CharacterAvatarProvider {
  readonly name = 'heygen';
  constructor(characterProviderFactory: CharacterProviderFactory) {
    super(characterProviderFactory);
  }
}

@Injectable()
export class DidAvatarProvider extends CharacterAvatarProvider {
  readonly name = 'did';
  constructor(characterProviderFactory: CharacterProviderFactory) {
    super(characterProviderFactory);
  }
}

@Injectable()
export class SynthesiaAvatarProvider extends CharacterAvatarProvider {
  readonly name = 'synthesia';
  constructor(characterProviderFactory: CharacterProviderFactory) {
    super(characterProviderFactory);
  }
}

@Injectable()
export class LivePortraitAvatarProvider extends CharacterAvatarProvider {
  readonly name = 'liveportrait';
  constructor(characterProviderFactory: CharacterProviderFactory) {
    super(characterProviderFactory);
  }

  generateTalkingVideo(): Promise<CharacterGenerationResult> {
    this.unavailable('video generation');
  }
}

@Injectable()
export class SadTalkerAvatarProvider extends CharacterAvatarProvider {
  readonly name = 'sadtalker';
  constructor(characterProviderFactory: CharacterProviderFactory) {
    super(characterProviderFactory);
  }
}
