import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { FindAllOptions, PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { Organization } from '../../domain/entities/organization.entity';
import {
  IOrganizationsRepository,
  ORGANIZATIONS_REPOSITORY,
} from '../../domain/repositories/organization-repository.interface';
import {
  IOrganizationMembersRepository,
  ORGANIZATION_MEMBERS_REPOSITORY,
} from '../../domain/repositories/organization-member-repository.interface';
import { OrganizationMember } from '../../domain/entities/organization-member.entity';
import { CreateOrganizationDto } from '../dto/create-organization.dto';
import { UpdateOrganizationDto } from '../dto/update-organization.dto';
import { AddMemberDto } from '../dto/add-member.dto';
import { OrganizationCreatedEvent } from '../events/organization-created.event';

@Injectable()
export class OrganizationsService {
  constructor(
    @Inject(ORGANIZATIONS_REPOSITORY)
    private readonly organizationsRepository: IOrganizationsRepository,
    @Inject(ORGANIZATION_MEMBERS_REPOSITORY)
    private readonly membersRepository: IOrganizationMembersRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateOrganizationDto, ownerId: string): Promise<Organization> {
    const existing = await this.organizationsRepository.findBySlug(dto.slug);
    if (existing) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }

    const organization = await this.organizationsRepository.create(
      { name: dto.name, slug: dto.slug, description: dto.description ?? null, ownerId },
      ownerId,
    );

    this.eventEmitter.emit(
      'organization.created',
      new OrganizationCreatedEvent(organization.id, ownerId),
    );

    return organization;
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<Organization>> {
    return this.organizationsRepository.findAll(options);
  }

  async findById(id: string): Promise<Organization> {
    const organization = await this.organizationsRepository.findById(id);
    if (!organization) {
      throw new NotFoundException(`Organization with id "${id}" not found`);
    }
    return organization;
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId?: string): Promise<Organization> {
    await this.findById(id);
    return this.organizationsRepository.update(id, dto, actorId);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findById(id);
    await this.organizationsRepository.delete(id, actorId);
  }

  async addMember(
    organizationId: string,
    dto: AddMemberDto,
    actorId?: string,
  ): Promise<OrganizationMember> {
    await this.findById(organizationId);
    const existing = await this.membersRepository.findMembership(organizationId, dto.userId);
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }
    return this.membersRepository.create(
      { organizationId, userId: dto.userId, roleId: dto.roleId },
      actorId,
    );
  }

  async listMembers(organizationId: string): Promise<OrganizationMember[]> {
    await this.findById(organizationId);
    return this.membersRepository.listByOrganization(organizationId);
  }

  async removeMember(organizationId: string, userId: string, actorId?: string): Promise<void> {
    const membership = await this.membersRepository.findMembership(organizationId, userId);
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    await this.membersRepository.delete(membership.id, actorId);
  }
}
