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

/** inference.py's stderr on failure is a large Python traceback; the actual
 * exception is always the last non-empty line, so surface just that instead
 * of the whole dump. */
function summarizeError(message: string): string {
  const lines = message.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? message;
}

/**
 * Local, free alternative to D-ID - drives the standalone SadTalker install
 * under ai-services/SadTalker (a Python venv, not part of this Node app) as
 * a child process. Jobs are tracked in-memory rather than a real queue:
 * this is a single-instance dev backend, and a job this long-running
 * (minutes on CPU) doesn't fit the request/response cycle either way. A
 * backend restart mid-generation orphans the job - same limitation BullMQ
 * jobs have to a running ts-node-dev respawn, just without Redis to survive it.
 */
@Injectable()
export class SadTalkerProvider implements ICharacterProvider {
  readonly name = 'sadtalker';
  private readonly logger = new Logger(SadTalkerProvider.name);
  private readonly jobs = new Map<string, JobState>();

  constructor(
    private readonly configService: ConfigService,
    private readonly voiceProviderFactory: VoiceProviderFactory,
  ) {}

  private get pythonPath(): string {
    return this.configService.get<string>('ai.character.sadtalker.pythonPath') ?? '';
  }

  private get sadTalkerDir(): string {
    return this.configService.get<string>('ai.character.sadtalker.dir') ?? '';
  }

  async submitJob(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    if (!this.pythonPath || !this.sadTalkerDir) {
      throw new ServiceUnavailableException(
        'SadTalker is not configured (SADTALKER_PYTHON_PATH/SADTALKER_DIR)',
      );
    }

    const jobId = randomUUID();
    this.jobs.set(jobId, { status: 'processing' });

    // Fire-and-forget - the HTTP response returns immediately (job/poll
    // pattern, same as every other character/video provider here); this
    // promise's rejection is handled internally, never left dangling.
    this.runGeneration(jobId, request).catch((error) => {
      const message = error instanceof Error ? error.message : 'Unknown SadTalker error';
      this.logger.error(`SadTalker job ${jobId} failed: ${message}`);
      this.jobs.set(jobId, { status: 'failed', errorMessage: summarizeError(message) });
    });

    return { provider: this.name, jobId, status: 'processing' };
  }

  async getJobStatus(jobId: string): Promise<CharacterGenerationResult> {
    const job = this.jobs.get(jobId);
    if (!job) {
      // Almost certainly a backend restart mid-generation, not a bad id -
      // surface as failed rather than hang the frontend's poll loop forever.
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
    const workDir = join(tmpdir(), `sadtalker-${jobId}`);
    await mkdir(workDir, { recursive: true });

    const imagePath = join(workDir, 'source.png');
    const imageResponse = await fetch(request.sourceImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Could not download source image (${imageResponse.status})`);
    }
    await writeFile(imagePath, Buffer.from(await imageResponse.arrayBuffer()));

    // SadTalker needs an actual audio file to lip-sync to (unlike D-ID,
    // which does text-to-speech itself) - reuse Voice Studio's free "edge"
    // provider rather than adding a second TTS integration.
    const audioPath = join(workDir, 'driven_audio.mp3');
    const speech = await this.voiceProviderFactory
      .getProvider('edge')
      .generateSpeech({ text: request.script, voiceId: request.voiceId });
    await writeFile(audioPath, Buffer.from(speech.audioBase64, 'base64'));

    const resultDir = join(workDir, 'results');
    await mkdir(resultDir, { recursive: true });

    const outputPath = await this.runInference(imagePath, audioPath, resultDir);
    this.jobs.set(jobId, { status: 'completed', videoUrl: outputPath });
  }

  private runInference(imagePath: string, audioPath: string, resultDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        'inference.py',
        '--driven_audio',
        audioPath,
        '--source_image',
        imagePath,
        '--result_dir',
        resultDir,
        '--still',
        '--preprocess',
        'crop',
        '--size',
        '256',
        '--cpu',
      ];

      const child = spawn(this.pythonPath, args, { cwd: this.sadTalkerDir });

      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', reject);
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`SadTalker exited with code ${code}: ${stderr.slice(-2000)}`));
          return;
        }
        const match = stdout.match(/The generated video is named:\s*(.+\.mp4)/);
        if (!match) {
          reject(new Error('SadTalker finished but no output video path was found in its output'));
          return;
        }
        resolve(match[1].trim());
      });
    });
  }
}
