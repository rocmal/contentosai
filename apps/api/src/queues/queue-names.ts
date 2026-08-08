export enum QueueName {
  AI = 'ai',
  VIDEO = 'video',
  ANALYTICS = 'analytics',
  EMAIL = 'email',
  SOCIAL_PUBLISH = 'social-publish',
  CREDITS_RENEWAL = 'credits-renewal',
}

export enum EmailJobName {
  VERIFICATION = 'send-verification-email',
  PASSWORD_RESET = 'send-password-reset-email',
}

export enum SocialPublishJobName {
  PUBLISH = 'publish-scheduled-post',
}

export enum CreditsRenewalJobName {
  CHECK = 'check-subscription-renewals',
}
