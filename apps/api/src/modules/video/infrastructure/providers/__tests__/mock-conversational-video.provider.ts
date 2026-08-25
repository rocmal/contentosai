import {
  ConversationalVideoCapabilities,
  ConversationalVideoRequest,
  IConversationalVideoProvider,
  RefineOptions,
  VideoAspectRatio,
  VideoDelivery,
  VideoTurnResult,
  VideoTurnStatus,
} from '../../../domain/interfaces/conversational-video.port';

/**
 * In-memory stand-in for the vendor. Records the last request so tests can
 * assert on the compiled prompt without a network call.
 */
export class MockConversationalVideoProvider implements IConversationalVideoProvider {
  readonly name = 'mock-conversational';

  lastStartRequest: ConversationalVideoRequest | null = null;
  lastRefineInstruction: string | null = null;
  lastRefineParentId: string | null = null;

  private nextStatus: VideoTurnStatus = VideoTurnStatus.COMPLETED;
  private turnCounter = 0;

  respondWith(status: VideoTurnStatus): void {
    this.nextStatus = status;
  }

  capabilities(): ConversationalVideoCapabilities {
    return {
      providerName: this.name,
      modelId: 'mock-model',
      maxDurationSeconds: 10,
      supportsStatefulEditing: true,
      supportsVideoExtension: false,
      supportsSystemInstructions: false,
      supportsNegativePrompts: false,
      supportsProvisionedThroughput: false,
      maxInlinePayloadBytes: 4 * 1024 * 1024,
      aspectRatios: [VideoAspectRatio.LANDSCAPE, VideoAspectRatio.PORTRAIT],
      uploadEditingBlockedRegions: [],
    };
  }

  async start(request: ConversationalVideoRequest): Promise<VideoTurnResult> {
    this.lastStartRequest = request;
    return this.buildResult(null);
  }

  async refine(
    previousProviderTurnId: string,
    instruction: string,
    _options: RefineOptions,
  ): Promise<VideoTurnResult> {
    this.lastRefineParentId = previousProviderTurnId;
    this.lastRefineInstruction = instruction;
    return this.buildResult(previousProviderTurnId);
  }

  async getTurn(providerTurnId: string): Promise<VideoTurnResult> {
    return {
      providerTurnId,
      parentProviderTurnId: null,
      status: this.nextStatus,
      payload:
        this.nextStatus === VideoTurnStatus.COMPLETED
          ? { kind: VideoDelivery.URI, uri: 'https://vendor.test/video.mp4', mimeType: 'video/mp4' }
          : null,
      editable: this.nextStatus === VideoTurnStatus.COMPLETED,
      failureReason: this.nextStatus === VideoTurnStatus.FAILED ? 'mock failure' : null,
    };
  }

  private buildResult(parentProviderTurnId: string | null): VideoTurnResult {
    this.turnCounter += 1;
    return {
      providerTurnId: `v1_mock_${this.turnCounter}`,
      parentProviderTurnId,
      status: this.nextStatus,
      payload:
        this.nextStatus === VideoTurnStatus.COMPLETED
          ? { kind: VideoDelivery.URI, uri: 'https://vendor.test/video.mp4', mimeType: 'video/mp4' }
          : null,
      editable: this.nextStatus === VideoTurnStatus.COMPLETED,
      failureReason: this.nextStatus === VideoTurnStatus.FAILED ? 'mock failure' : null,
    };
  }
}
