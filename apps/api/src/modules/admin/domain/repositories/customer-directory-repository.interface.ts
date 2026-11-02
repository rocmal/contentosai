import { PaginatedResult } from '@shared/interfaces/base-repository.interface';
import { CustomerDetail, CustomerSummary } from '../customer-directory';

export const CUSTOMER_DIRECTORY_REPOSITORY = Symbol('CUSTOMER_DIRECTORY_REPOSITORY');

export interface SearchCustomersOptions {
  /** Part of an organization name, a person's email or name, or an exact organization/workspace/user id. */
  search?: string;
  page: number;
  limit: number;
}

/** Reads across every customer, for the platform admins' Admin page. */
export interface ICustomerDirectoryRepository {
  searchCustomers(options: SearchCustomersOptions): Promise<PaginatedResult<CustomerSummary>>;
  findCustomer(organizationId: string): Promise<CustomerDetail | null>;
  /** The organization a user belongs to (their first membership), so a person can be found from a user id. */
  findOrganizationOfUser(userId: string): Promise<string | null>;
  /** Organization names by id (missing ids are left out), to label activity across customers. */
  organizationNames(organizationIds: string[]): Promise<Map<string, string>>;
}
