import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import type { Readable } from 'stream';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
  VoiceInfo,
} from '../../domain/interfaces/voice-provider.interface';

const DEFAULT_VOICE = 'en-US-AriaNeural';

/**
 * Local-development voice provider: talks to the same free text-to-speech
 * service the Microsoft Edge "Read Aloud" feature uses, over a WebSocket -
 * no Azure account, no API key, no billing. Synthesis is streamed straight
 * into memory (`toStream`) rather than written to a temp file, since
 * msedge-tts supports that directly; nothing here ever touches disk.
 *
 * Deliberately implements the same `IVoiceProvider` port as the paid
 * providers so swapping the default back to Azure/ElevenLabs later is a
 * one-line change in `VoiceProviderFactory`/`VOICE_PROVIDER`, not a rewrite.
 */
@Injectable()
export class EdgeTTSProvider implements IVoiceProvider {
  readonly name = 'edge';
  private readonly logger = new Logger(EdgeTTSProvider.name);

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    const voiceName = request.voiceId ?? DEFAULT_VOICE;
    const tts = new MsEdgeTTS();

    try {
      await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
      const { audioStream } = tts.toStream(request.text);
      const audioBuffer = await this.collectStream(audioStream);

      return {
        provider: this.name,
        model: voiceName,
        mimeType: 'audio/mpeg',
        audioBase64: audioBuffer.toString('base64'),
      };
    } catch (error) {
      throw new ServiceUnavailableException(`Edge TTS request failed: ${(error as Error).message}`);
    } finally {
      tts.close();
    }
  }

  async listVoices(): Promise<VoiceInfo[]> {
    const tts = new MsEdgeTTS();
    try {
      const voices = await tts.getVoices();
      return voices.map((voice) => ({
        id: voice.ShortName,
        name: voice.FriendlyName,
        locale: voice.Locale,
        gender: voice.Gender,
      }));
    } catch (error) {
      this.logger.warn(`Edge TTS listVoices failed: ${(error as Error).message}`);
      return [];
    } finally {
      tts.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    const tts = new MsEdgeTTS();
    try {
      const voices = await tts.getVoices();
      return voices.length > 0;
    } catch {
      return false;
    } finally {
      tts.close();
    }
  }

  private collectStream(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
