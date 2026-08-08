export class AvatarCreatedEvent {
  constructor(
    public readonly avatarId: string,
    public readonly workspaceId: string,
  ) {}
}

export class AvatarUsedEvent {
  constructor(
    public readonly avatarId: string,
    public readonly workspaceId: string,
  ) {}
}
