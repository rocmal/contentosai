import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { readdir, readFile, rm, stat } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import {
  IVoiceProvider,
  VoiceGenerationRequest,
  VoiceGenerationResult,
  VoiceInfo,
} from '../../domain/interfaces/voice-provider.interface';

/**
 * Fully offline TTS fallback - piper.exe is a small self-contained native
 * binary (onnxruntime bundled, no Python/numba/torch), used specifically
 * because that heavier ML stack is what triggered Smart App Control to
 * block SadTalker on this machine.
 *
 * Piper has exactly one voice/language per .onnx model file, so multiple
 * languages means multiple downloaded models sitting side by side in
 * PIPER_VOICES_DIR (e.g. en_US-lessac-medium.onnx, hi_IN-priyamvada-medium.onnx)
 * rather than one model handling several `voiceId`s the way cloud TTS does.
 * `request.voiceId` selects the file by its basename; PIPER_DEFAULT_VOICE is
 * used when omitted.
 */
@Injectable()
export class PiperProvider implements IVoiceProvider {
  readonly name = 'piper';
  private readonly logger = new Logger(PiperProvider.name);

  constructor(private readonly configService: ConfigService) {}

  private get binaryPath(): string {
    return this.configService.get<string>('ai.voice.piper.binaryPath') ?? '';
  }

  private get voicesDir(): string {
    return this.configService.get<string>('ai.voice.piper.voicesDir') ?? '';
  }

  private get defaultVoiceId(): string {
    return this.configService.get<string>('ai.voice.piper.defaultVoiceId') ?? '';
  }

  private modelPathFor(voiceId: string): string {
    return join(this.voicesDir, `${voiceId}.onnx`);
  }

  async generateSpeech(request: VoiceGenerationRequest): Promise<VoiceGenerationResult> {
    if (!this.binaryPath || !this.voicesDir) {
      throw new ServiceUnavailableException('Piper is not configured (PIPER_BINARY_PATH/PIPER_VOICES_DIR)');
    }
    const voiceId = request.voiceId ?? this.defaultVoiceId;
    const modelPath = this.modelPathFor(voiceId);
    try {
      await stat(modelPath);
    } catch {
      throw new ServiceUnavailableException(
        `Piper voice "${voiceId}" is not installed in ${this.voicesDir}`,
      );
    }

    const outputPath = join(tmpdir(), `piper-${randomUUID()}.wav`);
    try {
      await this.runPiper(modelPath, request.text, outputPath);
      const audio = await readFile(outputPath);
      return {
        provider: this.name,
        model: voiceId,
        mimeType: 'audio/wav',
        audioBase64: audio.toString('base64'),
      };
    } finally {
      await rm(outputPath, { force: true });
    }
  }

  async listVoices(): Promise<VoiceInfo[]> {
    if (!this.voicesDir) return [];
    let files: string[];
    try {
      files = await readdir(this.voicesDir);
    } catch {
      return [];
    }
    return files
      .filter((file) => file.endsWith('.onnx'))
      .map((file) => {
        const id = basename(file, '.onnx');
        // Piper voice ids follow "{lang}_{REGION}-{speaker}-{quality}", e.g.
        // "hi_IN-priyamvada-medium" - the locale is just the first segment.
        const locale = id.split('-')[0];
        return { id, name: id, locale };
      });
  }

  async healthCheck(): Promise<boolean> {
    if (!this.binaryPath || !this.voicesDir || !this.defaultVoiceId) return false;
    try {
      await stat(this.binaryPath);
      await stat(this.modelPathFor(this.defaultVoiceId));
      return true;
    } catch {
      return false;
    }
  }

  private runPiper(modelPath: string, text: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // --json-input, not plain stdin text: a spawned child on Windows has
      // no real console, so raw stdin gets decoded using the system's ANSI
      // codepage rather than UTF-8 - silently mangling non-ASCII scripts
      // (Devanagari, etc.) into near-empty output. JSON string parsing is
      // UTF-8 by spec regardless of console codepage, so this sidesteps it.
      const child = spawn(this.binaryPath, [
        '--json-input',
        '--model',
        modelPath,
        '--output_file',
        outputPath,
      ]);

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`Piper exited with code ${code}: ${stderr.slice(-1000)}`);
          reject(new Error(`Piper exited with code ${code}`));
          return;
        }
        resolve();
      });

      // --json-input reads "lines of JSON" - the trailing newline is what
      // marks the line complete, not just closing stdin.
      child.stdin.write(Buffer.from(`${JSON.stringify({ text })}\n`, 'utf-8'));
      child.stdin.end();
    });
  }
}
