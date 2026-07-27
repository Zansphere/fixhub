import { Injectable } from '@nestjs/common';
import { Prisma, VerificationStatus } from '@prisma/client';

import { PrismaService } from '../../../common/database/prisma.service';
import {
  CreateServiceAreaDto,
  RequestCoverageDto,
  ServiceAreaQueryDto,
  UpdateServiceAreaDto,
} from '../dto';

@Injectable()
export class ServiceAreaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ServiceAreaQueryDto, publicOnly = true) {
    const where: Prisma.ServiceAreaWhereInput = {
      deletedAt: null,
      ...(publicOnly ? { isActive: true } : {}),
      ...(!publicOnly && query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.city && { city: { equals: query.city, mode: 'insensitive' } }),
      ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }),
      ...(query.pincode && { pincode: query.pincode }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { city: { contains: query.search, mode: 'insensitive' } },
          { state: { contains: query.search, mode: 'insensitive' } },
          { pincode: { contains: query.search } },
        ],
      }),
    };

    const sortBy = this.sortField(query.sortBy);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceArea.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { [sortBy]: query.sortOrder ?? 'asc' },
        include: {
          _count: {
            select: { technicians: true },
          },
        },
      }),
      this.prisma.serviceArea.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        total,
        totalPages: Math.ceil(total / (query.limit ?? 10)),
        hasNextPage: (query.page ?? 1) * (query.limit ?? 10) < total,
        hasPreviousPage: (query.page ?? 1) > 1,
      },
    };
  }

  findById(id: string, publicOnly = false) {
    return this.prisma.serviceArea.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(publicOnly ? { isActive: true } : {}),
      },
      include: {
        _count: {
          select: { technicians: true },
        },
        subServiceAreas: {
          include: { subService: true }
        }
      },
    });
  }

  findByPincode(pincode: string, publicOnly = false) {
    return this.prisma.serviceArea.findFirst({
      where: {
        pincode,
        deletedAt: null,
        ...(publicOnly ? { isActive: true } : {}),
      },
      include: {
        _count: {
          select: { technicians: true },
        },
      },
    });
  }

  async findByLocation(latitude: number, longitude: number, publicOnly = false) {
    const rawAreas = await this.prisma.$queryRaw<any[]>`
      SELECT id 
      FROM service_areas 
      WHERE deleted_at IS NULL
        ${publicOnly ? Prisma.sql`AND is_active = true` : Prisma.empty}
        AND ST_Contains(boundary, ST_SetSRID(ST_MakePoint(${longitude}::float, ${latitude}::float), 4326))
      LIMIT 1
    `;

    if (rawAreas.length === 0) {
      return null;
    }

    return this.prisma.serviceArea.findUnique({
      where: { id: rawAreas[0].id },
      include: {
        _count: {
          select: { technicians: true },
        },
      },
    });
  }

  create(dto: CreateServiceAreaDto) {
    return this.prisma.serviceArea.create({
      data: {
        name: dto.name,
        pincode: dto.pincode,
        city: dto.city,
        state: dto.state,
        isActive: dto.isActive ?? true,
        ...(dto.subServiceIds && dto.subServiceIds.length > 0 ? {
          subServiceAreas: {
            create: dto.subServiceIds.map(id => ({ subServiceId: id }))
          }
        } : {})
      },
    });
  }

  update(id: string, dto: UpdateServiceAreaDto) {
    return this.prisma.serviceArea.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.pincode !== undefined && { pincode: dto.pincode }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.state !== undefined && { state: dto.state }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.subServiceIds !== undefined ? {
          subServiceAreas: {
            deleteMany: {},
            create: dto.subServiceIds.map(subServiceId => ({ subServiceId }))
          }
        } : {})
      },
    });
  }

  softDelete(id: string) {
    return this.prisma.serviceArea.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  countActiveTechnicianCoverage(serviceAreaId: string) {
    return this.prisma.technicianServiceArea.count({
      where: {
        serviceAreaId,
        technician: {
          deletedAt: null,
          isAvailable: true,
          verificationStatus: VerificationStatus.VERIFIED,
          user: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
    });
  }

  createCoverageRequest(dto: RequestCoverageDto) {
    return this.prisma.serviceAreaRequest.create({
      data: {
        pincode: dto.pincode,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
      },
    });
  }

  async listCoverageRequests(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.serviceAreaRequest.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceAreaRequest.count(),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  markCoverageRequestHandled(id: string) {
    return this.prisma.serviceAreaRequest.update({
      where: { id },
      data: { status: 'ACKNOWLEDGED' },
    });
  }

  private sortField(sortBy?: string) {
    const allowed = new Set(['name', 'pincode', 'city', 'state', 'isActive', 'createdAt', 'updatedAt']);
    return allowed.has(sortBy ?? '') ? sortBy! : 'name';
  }
}

