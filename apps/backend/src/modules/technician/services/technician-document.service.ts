import { ErrorCodes } from '@fixhub/shared';
import { ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';

import { StorageService } from '../../../common/storage/storage.service';
import { AdminNotificationService, AdminNotifType } from '../../admin/services/admin-notification.service';
import { CreateDocumentDto } from '../dto';
import { TechnicianDocumentRepository } from '../repositories/technician-document.repository';
import { TechnicianService } from './technician.service';

@Injectable()
export class TechnicianDocumentService {
  constructor(
    private readonly technicianService: TechnicianService,
    private readonly documentRepository: TechnicianDocumentRepository,
    private readonly storageService: StorageService,
    @Optional() private readonly adminNotifService?: AdminNotificationService,
  ) {}

  async listDocuments(userId: string) {
    const technicianId = await this.technicianService.resolveTechnicianId(userId);
    return this.documentRepository.findByTechnicianId(technicianId);
  }

  async uploadDocument(userId: string, dto: CreateDocumentDto) {
    const technicianId = await this.technicianService.resolveTechnicianId(userId);

    const s3Key = this.storageService.generateKey(
      `technicians/${technicianId}/documents`,
      dto.fileName,
    );

    const uploadUrl = await this.storageService.getUploadUrl({
      key: s3Key,
      contentType: dto.contentType,
    });

    // If URL is already provided (direct upload), persist immediately
    const url = dto.url ?? `https://cdn.fixhub.in/${s3Key}`;

    const document = await this.documentRepository.create(technicianId, {
      documentType: dto.documentType,
      url,
      s3Key,
    });

    const result = {
      document,
      uploadUrl,
      s3Key,
    };

    // Notify admin that a technician has submitted a document for verification
    this.adminNotifService?.createAndBroadcast(
      AdminNotifType.VERIFICATION_SUBMITTED,
      '📄 Verification Document Submitted',
      `A technician has uploaded a ${dto.documentType} document for verification.`,
      { technicianId, documentType: dto.documentType, documentId: document.id },
    ).catch(() => { /* silent */ });

    return result;
  }

  async deleteDocument(userId: string, documentId: string) {
    const technicianId = await this.technicianService.resolveTechnicianId(userId);

    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new NotFoundException({
        message: 'Document not found',
        errorCode: ErrorCodes.TECHNICIAN_DOCUMENT_NOT_FOUND,
      });
    }

    if (document.technicianId !== technicianId) {
      throw new ForbiddenException({
        message: 'You do not have access to this document',
        errorCode: ErrorCodes.AUTH_FORBIDDEN,
      });
    }

    // Delete from S3
    await this.storageService.deleteObject(document.s3Key);

    // Delete from DB
    await this.documentRepository.delete(documentId);

    return { deleted: true };
  }
}
