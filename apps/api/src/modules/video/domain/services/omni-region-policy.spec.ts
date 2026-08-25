import { ConversationalVideoCapabilities, VideoAspectRatio } from '../interfaces/conversational-video.port';
import {
  RegionNotSupportedError,
  assertUploadEditingAllowed,
  isUploadEditingAllowed,
} from './omni-region-policy';

const capabilities: ConversationalVideoCapabilities = {
  providerName: 'gemini-omni',
  modelId: 'gemini-omni-flash-preview',
  maxDurationSeconds: 10,
  supportsStatefulEditing: true,
  supportsVideoExtension: false,
  supportsSystemInstructions: false,
  supportsNegativePrompts: false,
  supportsProvisionedThroughput: false,
  maxInlinePayloadBytes: 4 * 1024 * 1024,
  aspectRatios: [VideoAspectRatio.LANDSCAPE, VideoAspectRatio.PORTRAIT],
  uploadEditingBlockedRegions: ['DE', 'GB', 'CH'],
};

describe('omni region policy', () => {
  it('allows tenants outside the blocked list', () => {
    expect(isUploadEditingAllowed(capabilities, 'IN')).toBe(true);
    expect(isUploadEditingAllowed(capabilities, 'US')).toBe(true);
  });

  it('blocks tenants inside the blocked list', () => {
    expect(isUploadEditingAllowed(capabilities, 'DE')).toBe(false);
    expect(isUploadEditingAllowed(capabilities, 'GB')).toBe(false);
  });

  it('is case-insensitive about the region code', () => {
    expect(isUploadEditingAllowed(capabilities, 'ch')).toBe(false);
  });

  it('throws a typed error rather than surfacing a vendor 400', () => {
    expect(() => assertUploadEditingAllowed(capabilities, 'DE')).toThrow(RegionNotSupportedError);
  });
});
