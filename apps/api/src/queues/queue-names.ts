export enum QueueName {
  AI = 'ai',
  VIDEO = 'video',
  ANALYTICS = 'analytics',
  EMAIL = 'email',
  SOCIAL_PUBLISH = 'social-publish',
  CREDITS_RENEWAL = 'credits-renewal',
}

export enum VideoJobName {
  POLL = 'poll-video-job',
}

export enum EmailJobName {
  VERIFICATION = 'send-verification-email',
  PASSWORD_RESET = 'send-password-reset-email',
}

export enum SocialPublishJobName {
  PUBLISH = 'publish-scheduled-post',
  /** Daily: remind people whose LinkedIn connection runs out soon. */
  CHECK_CONNECTIONS = 'check-connection-expiry',
}

export enum CreditsRenewalJobName {
  CHECK = 'check-subscription-renewals',
}
