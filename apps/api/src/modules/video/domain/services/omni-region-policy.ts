import { ConversationalVideoCapabilities } from '../interfaces/conversational-video.port';

export class RegionNotSupportedError extends Error {
  constructor(region: string, capability: string) {
    super(`"${capability}" is not available for tenants in region "${region}"`);
    this.name = 'RegionNotSupportedError';
  }
}

/**
 * Vendor availability is not uniform: uploading and editing user-supplied
 * media is blocked in several jurisdictions. Because Lumora is multi-tenant,
 * capability availability is a function of the tenant's region, so the check
 * lives in the domain rather than being discovered as a 400 from the vendor.
 */
export function isUploadEditingAllowed(
  capabilities: ConversationalVideoCapabilities,
  tenantRegion: string,
): boolean {
  return !capabilities.uploadEditingBlockedRegions.includes(tenantRegion.toUpperCase());
}

export function assertUploadEditingAllowed(
  capabilities: ConversationalVideoCapabilities,
  tenantRegion: string,
): void {
  if (!isUploadEditingAllowed(capabilities, tenantRegion)) {
    throw new RegionNotSupportedError(tenantRegion, 'editing uploaded media');
  }
}
