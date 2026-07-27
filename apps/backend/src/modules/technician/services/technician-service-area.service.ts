import { ErrorCodes } from '@fixhub/shared';
import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../common/database/prisma.service';
import { UpdateServiceAreasDto } from '../dto';
import { TechnicianServiceAreaRepository } from '../repositories/technician-service-area.repository';
import { TechnicianService } from './technician.service';

@Injectable()
export class TechnicianServiceAreaService {
  constructor(
    private readonly technicianService: TechnicianService,
    private readonly serviceAreaRepository: TechnicianServiceAreaRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listServiceAreas(userId: string) {
    const technicianId = await this.technicianService.resolveTechnicianId(userId);
    return this.serviceAreaRepository.findByTechnicianId(technicianId);
  }

  async updateServiceAreas(userId: string, dto: UpdateServiceAreasDto) {
    const technicianId = await this.technicianService.resolveTechnicianId(userId);

    const finalServiceAreaIds = new Set<string>(dto.serviceAreaIds || []);

    // Create or find custom areas based on pincode
    if (dto.customAreas && dto.customAreas.length > 0) {
      for (const customArea of dto.customAreas) {
        let area = await this.prisma.serviceArea.findUnique({
          where: { pincode: customArea.pincode },
        });

        if (!area) {
          // Create new service area dynamically if it doesn't exist
          area = await this.prisma.serviceArea.create({
            data: {
              name: customArea.name,
              pincode: customArea.pincode,
              city: customArea.name, // Fallback to name as city if unknown
              state: 'Unknown',
              isActive: true,
            },
          });
        }
        finalServiceAreaIds.add(area.id);
      }
    }

    const idsArray = Array.from(finalServiceAreaIds);

    // Validate all service areas exist and are active
    const validAreas = await this.prisma.serviceArea.findMany({
      where: {
        id: { in: idsArray },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });

    const validIds = new Set(validAreas.map((a) => a.id));
    const invalidIds = idsArray.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException({
        message: `Invalid or inactive service area IDs: ${invalidIds.join(', ')}`,
        errorCode: ErrorCodes.SERVICE_AREA_NOT_FOUND,
      });
    }

    return this.serviceAreaRepository.sync(technicianId, idsArray);
  }
}
