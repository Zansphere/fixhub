import { ErrorCodes } from '@fixhub/shared';
import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { AdminNotificationService, AdminNotifType } from '../../admin/services/admin-notification.service';
import {
  CreateServiceAreaDto,
  RequestCoverageDto,
  ServiceAreaQueryDto,
  UpdateServiceAreaDto,
  ValidateServiceAreaDto,
} from '../dto';
import { ServiceAreaRepository } from '../repositories/service-area.repository';
import { ServiceAreaCacheService } from './service-area-cache.service';

@Injectable()
export class ServiceAreaService {
  constructor(
    private readonly serviceAreaRepository: ServiceAreaRepository,
    private readonly cacheService: ServiceAreaCacheService,
    @Optional() private readonly adminNotifService?: AdminNotificationService,
  ) {}

  async list(query: ServiceAreaQueryDto, publicOnly = true) {
    const cacheKey = this.cacheKey(`list:${publicOnly}`, query);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const result = await this.serviceAreaRepository.list(query, publicOnly);
    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async validate(dto: ValidateServiceAreaDto) {
    const cacheKey = dto.latitude && dto.longitude 
      ? `validate:${dto.pincode}:${dto.latitude}:${dto.longitude}`
      : `validate:${dto.pincode}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    let area = null;
    if (dto.latitude !== undefined && dto.longitude !== undefined) {
      area = await this.serviceAreaRepository.findByLocation(dto.latitude, dto.longitude, false);
    }
    
    if (!area) {
      area = await this.serviceAreaRepository.findByPincode(dto.pincode, false);
    }

    if (!area) {
      const result = {
        pincode: dto.pincode,
        isCovered: false,
        isServiceable: false,
        hasTechnicianCoverage: false,
        activeTechnicianCount: 0,
        reason: 'PINCODE_NOT_COVERED',
        serviceArea: null,
      };
      await this.cacheService.set(cacheKey, result);
      return result;
    }

    const activeTechnicianCount = await this.serviceAreaRepository.countActiveTechnicianCoverage(
      area.id,
    );
    const isCovered = area.isActive && !area.deletedAt;
    const hasTechnicianCoverage = activeTechnicianCount > 0;
    const result = {
      pincode: dto.pincode,
      isCovered,
      isServiceable: isCovered && hasTechnicianCoverage,
      hasTechnicianCoverage,
      activeTechnicianCount,
      reason: this.reason(isCovered, hasTechnicianCoverage),
      serviceArea: {
        id: area.id,
        name: area.name,
        pincode: area.pincode,
        city: area.city,
        state: area.state,
        isActive: area.isActive,
      },
    };

    await this.cacheService.set(cacheKey, result);
    return result;
  }

  async create(dto: CreateServiceAreaDto) {
    await this.ensurePincodeAvailable(dto.pincode);
    const area = await this.serviceAreaRepository.create(dto);
    await this.cacheService.invalidate();
    return area;
  }

  async update(id: string, dto: UpdateServiceAreaDto) {
    const existing = await this.serviceAreaRepository.findById(id, false);

    if (!existing) {
      throw new NotFoundException({
        message: 'Service area not found',
        errorCode: ErrorCodes.SERVICE_AREA_NOT_FOUND,
      });
    }

    if (dto.pincode && dto.pincode !== existing.pincode) {
      await this.ensurePincodeAvailable(dto.pincode);
    }

    const updated = await this.serviceAreaRepository.update(id, dto);
    await this.cacheService.invalidate();
    return updated;
  }

  async requestCoverage(dto: RequestCoverageDto) {
    const record = await this.serviceAreaRepository.createCoverageRequest(dto);

    // Notify admin in real-time
    if (this.adminNotifService) {
      await this.adminNotifService.createAndBroadcast(
        AdminNotifType.SERVICE_AREA_REQUEST,
        '📍 New Service Area Request',
        `Pincode ${dto.pincode} was requested by a customer${dto.name ? ` (${dto.name})` : ''}.`,
        { pincode: dto.pincode, requestId: record.id, phone: dto.phone, email: dto.email },
      );
    }

    return { success: true, id: record.id };
  }

  async listCoverageRequests(query: { page?: number; limit?: number }) {
    return this.serviceAreaRepository.listCoverageRequests(query);
  }

  async markCoverageRequestHandled(id: string) {
    return this.serviceAreaRepository.markCoverageRequestHandled(id);
  }

  async delete(id: string) {
    const existing = await this.serviceAreaRepository.findById(id, false);

    if (!existing) {
      throw new NotFoundException({
        message: 'Service area not found',
        errorCode: ErrorCodes.SERVICE_AREA_NOT_FOUND,
      });
    }

    await this.serviceAreaRepository.softDelete(id);
    await this.cacheService.invalidate();
    return { message: 'Service area deleted successfully' };
  }

  private async ensurePincodeAvailable(pincode: string) {
    const existing = await this.serviceAreaRepository.findByPincode(pincode, false);

    if (existing) {
      throw new ConflictException({
        message: 'Service area pincode already exists',
        errorCode: ErrorCodes.SERVICE_AREA_PINCODE_EXISTS,
      });
    }
  }

  private reason(isCovered: boolean, hasTechnicianCoverage: boolean) {
    if (!isCovered) {
      return 'AREA_INACTIVE';
    }

    if (!hasTechnicianCoverage) {
      return 'NO_ACTIVE_TECHNICIAN_COVERAGE';
    }

    return 'SERVICEABLE';
  }

  private cacheKey(prefix: string, query: ServiceAreaQueryDto) {
    return `${prefix}:${JSON.stringify({
      page: query.page ?? 1,
      limit: query.limit ?? 10,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      search: query.search,
      city: query.city,
      state: query.state,
      pincode: query.pincode,
      isActive: query.isActive,
    })}`;
  }
}
