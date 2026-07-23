import 'package:flutter/material.dart';
import '../../../../core/config/theme/app_colors.dart';
import '../../../../core/config/theme/app_spacing.dart';
import '../../../../core/widgets/fixhub_status_chip.dart';
import '../../data/models/booking_timeline_model.dart';
import '../../data/models/booking_model.dart';
import 'package:intl/intl.dart';

class JobProgressTimeline extends StatelessWidget {
  const JobProgressTimeline({
    super.key,
    required this.booking,
  });

  final BookingModel booking;

  @override
  Widget build(BuildContext context) {
    final currentStatus = booking.statusType;

    // Ordered list of states representing the full lifecycle
    final states = [
      _TimelineState('Pending', BookingStatusType.pending, ['PENDING_PAYMENT', 'PENDING']),
      _TimelineState('Confirmed', BookingStatusType.confirmed, ['CONFIRMED']),
      _TimelineState('Assigned', BookingStatusType.assigned, ['ASSIGNED', 'ACCEPTED']),
      _TimelineState('En Route', BookingStatusType.enRoute, ['EN_ROUTE']),
      _TimelineState('Arrived', BookingStatusType.arrived, ['ARRIVED']),
      _TimelineState('In Progress', BookingStatusType.inProgress, ['IN_PROGRESS', 'PRICE_REVISION_PENDING']),
      _TimelineState('Completed', BookingStatusType.completed, ['COMPLETED']),
    ];

    // Find the highest reached state index based on the timeline records
    int highestReachedIdx = -1;
    for (int i = 0; i < states.length; i++) {
      if (_hasEvent(states[i].rawStatuses)) {
        highestReachedIdx = i;
      }
    }
    
    // Fallback if timeline array is somehow empty: use current statusType
    if (highestReachedIdx == -1) {
      for (int i = 0; i < states.length; i++) {
        if (states[i].type == currentStatus) {
          highestReachedIdx = i;
          break;
        }
      }
    }
    
    // If cancelled or failed, we just show up to the point it got to, plus the failure state at the end.
    final isFailedOrCancelled = currentStatus == BookingStatusType.failed || currentStatus == BookingStatusType.cancelled;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Job Progress',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
        ),
        const SizedBox(height: AppSpacing.md),
        
        ...List.generate(states.length, (index) {
          final state = states[index];
          final isCompleted = index <= highestReachedIdx;
          final isActive = index == highestReachedIdx && !isFailedOrCancelled;
          final time = _getEventTime(state.rawStatuses);
          
          return _buildTimelineNode(
            context,
            title: state.title,
            isCompleted: isCompleted,
            isActive: isActive,
            time: time,
            isLast: index == states.length - 1 && !isFailedOrCancelled,
            isFuture: index > highestReachedIdx,
          );
        }),
        
        if (isFailedOrCancelled)
          _buildTimelineNode(
            context,
            title: currentStatus == BookingStatusType.cancelled ? 'Cancelled' : 'Failed',
            isCompleted: false,
            isActive: true, // Mark the failed state as active/red
            time: _getLastEventTime(),
            isLast: true,
            isFuture: false,
            isError: true,
          ),
      ],
    );
  }

  bool _hasEvent(List<String> rawStatuses) {
    return booking.timeline.any((e) => rawStatuses.contains(e.status));
  }

  String? _getEventTime(List<String> rawStatuses) {
    final event = booking.timeline.where((e) => rawStatuses.contains(e.status)).firstOrNull;
    if (event != null) {
      return DateFormat('hh:mm a').format(event.createdAt);
    }
    return null;
  }
  
  String? _getLastEventTime() {
    if (booking.timeline.isNotEmpty) {
      return DateFormat('hh:mm a').format(booking.timeline.last.createdAt);
    }
    return null;
  }

  Widget _buildTimelineNode(
    BuildContext context, {
    required String title,
    required bool isCompleted,
    required bool isActive,
    required bool isFuture,
    required String? time,
    required bool isLast,
    bool isError = false,
  }) {
    final primaryColor = isError ? AppColors.error : AppColors.success;
    final inactiveColor = AppColors.textSecondary.withOpacity(0.3);
    final dotColor = isCompleted ? primaryColor : (isActive ? (isError ? AppColors.error : AppColors.buttonPrimary) : AppColors.surface);

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Node icon + line
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isCompleted || isActive ? dotColor : inactiveColor,
                      width: 2,
                    ),
                  ),
                  child: isCompleted
                      ? const Icon(Icons.check, color: AppColors.surface, size: 16)
                      : (isActive
                          ? Center(
                              child: Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: isError ? AppColors.error : AppColors.surface,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            )
                          : const SizedBox()),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: isCompleted ? primaryColor : inactiveColor,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          // Content
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: AppSpacing.xl),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: isActive || isCompleted ? FontWeight.bold : FontWeight.normal,
                          color: isError 
                              ? AppColors.error 
                              : (isCompleted || isActive ? AppColors.textPrimary : AppColors.textSecondary),
                        ),
                  ),
                  Text(
                    time ?? (isFuture ? '' : (isActive ? 'Now' : '')),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textSecondary,
                        ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TimelineState {
  final String title;
  final BookingStatusType type;
  final List<String> rawStatuses;

  _TimelineState(this.title, this.type, this.rawStatuses);
}
