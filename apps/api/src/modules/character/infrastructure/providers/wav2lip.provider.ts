import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { VoiceProviderFactory } from '@modules/voice/infrastructure/voice-provider.factory';
import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
  CharacterJobStatus,
  ICharacterProvider,
} from '../../domain/interfaces/character-provider.interface';

interface JobState {
  status: CharacterJobStatus;
  videoUrl?: string;
  errorMessage?: string;
}

/** inference.py's stderr on failure is a ~2000-char Python traceback; the
 * actual exception (e.g. "ValueError: Face not detected!...") is always the
 * last non-empty line, so surface just that instead of the whole dump. */
function summarizeError(message: string): string {
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? message;
}

/**
 * Local, free alternative alongside SadTalker - lip-sync only (no head/pose
 * animation), which makes it noticeably lighter and faster than SadTalker
 * for the same reason it's less expressive. Same architecture as
 * SadTalkerProvider: in-memory job tracking, edge-TTS for the driven audio,
 * spawns the Python venv as a child process.
 */
@Injectable()
export class Wav2LipProvider implements ICharacterProvider {
  readonly name = 'wav2lip';
  private readonly logger = new Logger(Wav2LipProvider.name);
  private readonly jobs = new Map<string, JobState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly voiceProviderFactory: VoiceProviderFactory,
  ) {}

  private get pythonPath(): string {
    return this.configService.get<string>('ai.character.wav2lip.pythonPath') ?? '';
  }

  private get wav2lipDir(): string {
    return this.configService.get<string>('ai.character.wav2lip.dir') ?? '';
  }

  private get checkpointPath(): string {
    return this.configService.get<string>('ai.character.wav2lip.checkpointPath') ?? '';
  }

  async submitJob(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    if (!this.pythonPath || !this.wav2lipDir || !this.checkpointPath) {
      throw new ServiceUnavailableException(
        'Wav2Lip is not configured (WAV2LIP_PYTHON_PATH/WAV2LIP_DIR/WAV2LIP_CHECKPOINT_PATH)',
      );
    }

    const jobId = randomUUID();
    this.jobs.set(jobId, { status: 'processing' });

    this.runGeneration(jobId, request).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown Wav2Lip error';
      this.logger.error(`Wav2Lip job ${jobId} failed: ${message}`);
      this.jobs.set(jobId, { status: 'failed', errorMessage: summarizeError(message) });
    });

    return { provider: this.name, jobId, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<CharacterGenerationResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return {
        provider: this.name,
        jobId,
        status: 'failed',
        errorMessage: 'Job not found - the server may have restarted mid-generation.',
      };
    }
    return { provider: this.name, jobId, status: job.status, videoUrl: job.videoUrl, errorMessage: job.errorMessage };
  }

  private async runGeneration(jobId: string, request: CharacterGenerationRequest): Promise<void> {
    const workDir = join(tmpdir(), `wav2lip-${jobId}`);
    await mkdir(workDir, { recursive: true });

    const imagePath = join(workDir, 'source.png');
    const imageResponse = await fetch(request.sourceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Could not download source image (${imageResponse.status})`);
    }
    await writeFile(imagePath, Buffer.from(await imageResponse.arrayBuffer()));

    const audioPath = join(workDir, 'driven_audio.mp3');
    const speech = await this.voiceProviderFactory
      .getProvider('edge')
      .generateSpeech({ text: request.script, voiceId: request.voiceId });
    await writeFile(audioPath, Buffer.from(speech.audioBase64, 'base64'));

    const outputPath = join(workDir, 'output.mp4');
    await this.runInference(imagePath, audioPath, outputPath);
    this.jobs.set(jobId, { status: 'completed', videoUrl: outputPath });
  }

  private runInference(imagePath: string, audioPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        'inference.py',
        '--checkpoint_path',
        this.checkpointPath,
        '--face',
        imagePath,
        '--audio',
        audioPath,
        '--outfile',
        outputPath,
      ];

      const child = spawn(this.pythonPath, args, { cwd: this.wav2lipDir });

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Wav2Lip exited with code ${code}: ${stderr.slice(-2000)}`));
          return;
        }
        resolve();
      });
    });
  }
}
