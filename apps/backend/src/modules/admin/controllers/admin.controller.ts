import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Request } from 'express';

import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AdminCancelBookingDto,
  AdminCreateBookingDto,
  CouponQueryDto,
  CreateCouponDto,
  CreateCustomerDto,
  CreatePricingRuleDto,
  CreateTechnicianDto,
  CustomerQueryDto,
  EligibleTechnicianQueryDto,
  ManageServiceAreaDto,
  ManageSpecializationDto,
  NotifyCustomerDto,
  PaymentQueryDto,
  TechnicianQueryDto,
  UpdateCouponDto,
  UpdateCustomerDetailsDto,
  UpdatePricingRuleDto,
  UpdateTechnicianDetailsDto,
  UpdateUserStatusDto,
  VerifyTechnicianDto,
} from '../dto/admin.dto';
import { AdminService } from '../services/admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ── Payments ─────────────────────────────────────────────

  @Get('payments')
  @ApiOperation({ summary: 'List all payments (paginated)' })
  async listPayments(@Query() query: PaymentQueryDto) {
    return this.adminService.listPayments(query);
  }

  // ── Customers ────────────────────────────────────────────

  @Get('customers')
  @ApiOperation({ summary: 'List all customers (paginated)' })
  async listCustomers(@Query() query: CustomerQueryDto) {
    return this.adminService.listCustomers(query);
  }

  @Post('customers')
  @ApiOperation({ summary: 'Create a new customer' })
  async createCustomer(@Body() dto: CreateCustomerDto) {
    return this.adminService.createCustomer(dto);
  }

  @Get('customers/:id')
  @ApiOperation({ summary: 'Get customer details' })
  @ApiParam({ name: 'id', description: 'Customer id' })
  async getCustomerDetails(@Param('id') id: string) {
    return this.adminService.getCustomerDetails(id);
  }

  @Patch('customers/:id/details')
  @ApiOperation({ summary: 'Update customer details' })
  @ApiParam({ name: 'id', description: 'Customer id' })
  async updateCustomerDetails(@Param('id') id: string, @Body() dto: UpdateCustomerDetailsDto) {
    return this.adminService.updateCustomerDetails(id, dto);
  }

  @Patch('customers/:userId/status')
  @ApiOperation({ summary: 'Activate/Block customer' })
  @ApiParam({ name: 'userId', description: 'User id of the customer' })
  async updateCustomerStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.isActive);
  }

  @Post('customers/:id/notify-profile')
  @ApiOperation({ summary: 'Send notification to customer to complete their profile' })
  @ApiParam({ name: 'id', description: 'Customer id' })
  async notifyCustomerProfile(@Param('id') id: string, @Body() dto: NotifyCustomerDto) {
    return this.adminService.notifyCustomerCompleteProfile(id, dto.message);
  }

  // ── Technicians ──────────────────────────────────────────

  @Get('technicians')
  @ApiOperation({ summary: 'List all technicians (paginated)' })
  async listTechnicians(@Query() query: TechnicianQueryDto) {
    return this.adminService.listTechnicians(query);
  }

  @Post('technicians')
  @ApiOperation({ summary: 'Create a new technician' })
  async createTechnician(@Body() dto: CreateTechnicianDto) {
    return this.adminService.createTechnician(dto);
  }

  @Post('technicians/:id/notify-profile')
  @ApiOperation({ summary: 'Send notification to technician to complete their profile' })
  @ApiParam({ name: 'id', description: 'Technician id' })
  async notifyTechnicianProfile(@Param('id') id: string, @Body() dto: NotifyCustomerDto) {
    return this.adminService.notifyTechnicianCompleteProfile(id, dto.message);
  }

  @Get('technicians/eligible')
  @ApiOperation({ summary: 'Get eligible technicians for a booking (by subService + pincode)' })
  async getEligibleTechnicians(@Query() query: EligibleTechnicianQueryDto) {
    return this.adminService.getEligibleTechnicians(query.subServiceId, query.pincode);
  }

  @Get('technicians/:id')
  @ApiOperation({ summary: 'Get technician details' })
  @ApiParam({ name: 'id', description: 'Technician id' })
  async getTechnicianDetails(@Param('id') id: string) {
    return this.adminService.getTechnicianDetails(id);
  }

  @Patch('technicians/:id/details')
  @ApiOperation({ summary: 'Update technician personal details' })
  @ApiParam({ name: 'id', description: 'Technician id' })
  async updateTechnicianDetails(@Param('id') id: string, @Body() dto: UpdateTechnicianDetailsDto) {
    return this.adminService.updateTechnicianDetails(id, dto);
  }

  @Patch('technicians/:userId/status')
  @ApiOperation({ summary: 'Activate/Suspend technician' })
  @ApiParam({ name: 'userId', description: 'User id of the technician' })
  async updateTechnicianStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.isActive);
  }

  @Patch('technicians/:id/verify')
  @ApiOperation({ summary: 'Verify or Reject a technician' })
  @ApiParam({ name: 'id', description: 'Technician id (not user id)' })
  async verifyTechnician(
    @Param('id') id: string,
    @Body() dto: VerifyTechnicianDto,
  ) {
    return this.adminService.verifyTechnician(id, dto.status, dto.rejectionNote);
  }

  @Post('technicians/:id/specializations')
  @ApiOperation({ summary: 'Add specialization to technician' })
  @ApiParam({ name: 'id', description: 'Technician id' })
  async addSpecialization(@Param('id') id: string, @Body() dto: ManageSpecializationDto) {
    return this.adminService.addSpecialization(id, dto.subServiceId);
  }

  @Delete('technicians/:id/specializations/:subServiceId')
  @ApiOperation({ summary: 'Remove specialization from technician' })
  async removeSpecialization(
    @Param('id') id: string,
    @Param('subServiceId') subServiceId: string,
  ) {
    return this.adminService.removeSpecialization(id, subServiceId);
  }

  @Post('technicians/:id/areas')
  @ApiOperation({ summary: 'Add service area to technician' })
  async addServiceArea(@Param('id') id: string, @Body() dto: ManageServiceAreaDto) {
    return this.adminService.addServiceArea(id, dto.serviceAreaId);
  }

  @Delete('technicians/:id/areas/:serviceAreaId')
  @ApiOperation({ summary: 'Remove service area from technician' })
  async removeServiceArea(
    @Param('id') id: string,
    @Param('serviceAreaId') serviceAreaId: string,
  ) {
    return this.adminService.removeServiceArea(id, serviceAreaId);
  }

  // ── Bookings ─────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings for admin' })
  async listBookings(@Query() query: any, @Req() req: any) {
    // We can delegate to AdminService or BookingQueryService.
    // Assuming adminService.listBookings is implemented.
    return this.adminService.listBookings(query);
  }

  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get booking details' })
  @ApiParam({ name: 'id', description: 'Booking id' })
  async getBookingDetails(@Param('id') id: string) {
    return this.adminService.getBookingDetails(id);
  }

  @Post('bookings')
  @ApiOperation({ summary: 'Admin creates a booking on behalf of a customer' })
  async createBooking(@Body() dto: AdminCreateBookingDto, @Req() req: any) {
    const adminUserId = req.user?.id ?? 'system';
    return this.adminService.createAdminBooking({ ...dto, adminUserId });
  }

  @Delete('bookings/:id')
  @ApiOperation({ summary: 'Soft delete (archive) a booking' })
  @ApiParam({ name: 'id', description: 'Booking id' })
  async deleteBooking(
    @Param('id') id: string,
    @Body() dto: AdminCancelBookingDto, // we can reuse or create a specific delete dto later
    @Req() req: any,
  ) {
    const adminUserId = req.user?.id ?? 'system';
    return this.adminService.softDeleteBooking(id, dto.reason, adminUserId);
  }

  @Patch('bookings/:id/cancel')
  @ApiOperation({ summary: 'Cancel a booking as admin' })
  @ApiParam({ name: 'id', description: 'Booking id' })
  async cancelBooking(
    @Param('id') id: string,
    @Body() dto: AdminCancelBookingDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.id ?? 'system';
    return this.adminService.cancelBooking(id, dto.reason, adminUserId);
  }

  // ── Pricing ──────────────────────────────────────────────

  @Get('pricing')
  @ApiOperation({ summary: 'List pricing rules' })
  async listPricingRules() {
    return this.adminService.listPricingRules();
  }

  @Post('pricing')
  @ApiOperation({ summary: 'Create pricing rule' })
  async createPricingRule(@Body() dto: CreatePricingRuleDto, @Req() req: any) {
    const adminUserId = req.user?.id ?? 'system';
    return this.adminService.createPricingRule(dto, adminUserId);
  }

  @Patch('pricing/:id')
  @ApiOperation({ summary: 'Update pricing rule' })
  @ApiParam({ name: 'id', description: 'Pricing rule id' })
  async updatePricingRule(
    @Param('id') id: string,
    @Body() dto: UpdatePricingRuleDto,
    @Req() req: any,
  ) {
    const adminUserId = req.user?.id ?? 'system';
    return this.adminService.updatePricingRule(id, dto, adminUserId);
  }

  @Delete('pricing/:id')
  @ApiOperation({ summary: 'Delete pricing rule' })
  @ApiParam({ name: 'id', description: 'Pricing rule id' })
  async deletePricingRule(@Param('id') id: string) {
    return this.adminService.deletePricingRule(id);
  }

  // ── Coupons ──────────────────────────────────────────────

  @Get('coupons')
  @ApiOperation({ summary: 'List coupons' })
  async listCoupons(@Query() query: CouponQueryDto) {
    return this.adminService.listCoupons(query);
  }

  @Post('coupons')
  @ApiOperation({ summary: 'Create coupon' })
  async createCoupon(@Body() dto: CreateCouponDto, @Req() req: any) {
    const adminUserId = req.user?.id ?? 'system';
    return this.adminService.createCoupon(dto, adminUserId);
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  async updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.adminService.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @ApiOperation({ summary: 'Delete coupon' })
  @ApiParam({ name: 'id', description: 'Coupon id' })
  async deleteCoupon(@Param('id') id: string) {
    return this.adminService.deleteCoupon(id);
  }
}
