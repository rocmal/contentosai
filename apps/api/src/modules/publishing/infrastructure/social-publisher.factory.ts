import { BadRequestException, Injectable } from '@nestjs/common';
import { ISocialPublisher } from '../domain/interfaces/social-publisher.interface';
import { FacebookPublisherProvider } from './providers/facebook-publisher.provider';
import { InstagramPublisherProvider } from './providers/instagram-publisher.provider';
import { LinkedInPublisherProvider } from './providers/linkedin-publisher.provider';
import { YouTubePublisherProvider } from './providers/youtube-publisher.provider';

@Injectable()
export class SocialPublisherFactory {
  private readonly publishers: Map<string, ISocialPublisher>;

  constructor(
    facebookProvider: FacebookPublisherProvider,
    instagramProvider: InstagramPublisherProvider,
    linkedInProvider: LinkedInPublisherProvider,
    youTubeProvider: YouTubePublisherProvider,
  ) {
    this.publishers = new Map<string, ISocialPublisher>([
      [facebookProvider.name, facebookProvider],
      [instagramProvider.name, instagramProvider],
      [linkedInProvider.name, linkedInProvider],
      [youTubeProvider.name, youTubeProvider],
    ]);
  }

  getPublisher(platform: string): ISocialPublisher {
    const publisher = this.publishers.get(platform);
    if (!publisher) {
      throw new BadRequestException(
        `Unsupported publishing platform "${platform}". Available platforms: ${Array.from(this.publishers.keys()).join(', ')}`,
      );
    }
    return publisher;
  }

  listPlatforms(): string[] {
    return Array.from(this.publishers.keys());
  }
}
