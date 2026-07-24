import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/theme/app_colors.dart';
import '../../../core/config/theme/app_spacing.dart';
import '../../../core/config/theme/app_radius.dart';
import '../../../core/widgets/fp_button.dart';
import '../domain/job_models.dart';
import 'job_provider.dart';

/// Bottom sheet for proposing a price revision while a job is IN_PROGRESS.
/// Calls PATCH /technicians/jobs/:id/propose-revision
void showPriceRevisionSheet(BuildContext context, Job job) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _PriceRevisionSheet(job: job),
  );
}

class _PriceRevisionSheet extends ConsumerStatefulWidget {
  final Job job;

  const _PriceRevisionSheet({required this.job});

  @override
  ConsumerState<_PriceRevisionSheet> createState() =>
      _PriceRevisionSheetState();
}

class _PriceRevisionSheetState extends ConsumerState<_PriceRevisionSheet> {
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Pre-fill with current total
    _amountController.text =
        widget.job.totalAmount.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  bool get _canSubmit {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    return amount > 0 && _noteController.text.trim().isNotEmpty;
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim());
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Please enter a valid revised amount');
      return;
    }
    if (_noteController.text.trim().isEmpty) {
      setState(() => _error = 'Please explain the reason for revision');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await ref.read(activeJobProvider.notifier).proposeRevision(
            widget.job.id,
            amount,
            _noteController.text.trim(),
          );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              '💬 Price revision sent to customer for approval.',
            ),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _error = 'Failed to submit revision. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final originalAmount = widget.job.totalAmount;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Drag handle
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(4),
              ),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenPadding,
                AppSpacing.xl,
                AppSpacing.screenPadding,
                AppSpacing.bottomSafePad,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.warningLight,
                          borderRadius: BorderRadius.circular(AppRadius.sm),
                        ),
                        child: const Icon(
                          Icons.currency_rupee_rounded,
                          color: AppColors.warning,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Propose Price Revision',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            Text(
                              'Customer will be asked to approve.',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.xl),

                  // Original vs revised
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.base),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceVariant,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _AmountColumn(
                            label: 'Original Amount',
                            value: '₹${originalAmount.toStringAsFixed(0)}',
                            valueColor: AppColors.textSecondary,
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 36,
                          color: AppColors.border,
                        ),
                        Expanded(
                          child: ListenableBuilder(
                            listenable: _amountController,
                            builder: (context, _) {
                              final revised = double.tryParse(
                                    _amountController.text.trim(),
                                  ) ??
                                  originalAmount;
                              final diff = revised - originalAmount;
                              final isIncrease = diff > 0;
                              return _AmountColumn(
                                label: 'Revised Amount',
                                value: '₹${revised.toStringAsFixed(0)}',
                                valueColor: isIncrease
                                    ? AppColors.warning
                                    : AppColors.textPrimary,
                                badge: diff != 0
                                    ? '${isIncrease ? '+' : ''}${diff.toStringAsFixed(0)}'
                                    : null,
                                badgeColor: isIncrease
                                    ? AppColors.warning
                                    : AppColors.success,
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: AppSpacing.base),

                  // Amount input
                  TextFormField(
                    controller: _amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    inputFormatters: [
                      FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                    ],
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Revised Amount (₹)',
                      prefixIcon: Icon(Icons.currency_rupee_rounded),
                      hintText: '0',
                    ),
                  ),

                  const SizedBox(height: AppSpacing.md),

                  // Reason input
                  TextFormField(
                    controller: _noteController,
                    maxLines: 3,
                    maxLength: 300,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(
                      labelText: 'Reason for revision *',
                      hintText:
                          'e.g. Extra materials required, additional wiring discovered...',
                      alignLabelWithHint: true,
                    ),
                  ),

                  // Error
                  if (_error != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Text(
                      _error!,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.error,
                      ),
                    ),
                  ],

                  const SizedBox(height: AppSpacing.base),

                  Row(
                    children: [
                      Expanded(
                        child: FpButton(
                          label: 'Cancel',
                          variant: FpButtonVariant.secondary,
                          onPressed: () => Navigator.pop(context),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        flex: 2,
                        child: FpButton(
                          label: 'Send for Approval',
                          isLoading: _isSubmitting,
                          onPressed: _canSubmit ? _submit : null,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmountColumn extends StatelessWidget {
  final String label;
  final String value;
  final Color valueColor;
  final String? badge;
  final Color? badgeColor;

  const _AmountColumn({
    required this.label,
    required this.value,
    required this.valueColor,
    this.badge,
    this.badgeColor,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppColors.textSecondary,
              ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              value,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: valueColor,
                  ),
            ),
            if (badge != null) ...[
              const SizedBox(width: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: (badgeColor ?? AppColors.warning).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  badge!,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: badgeColor ?? AppColors.warning,
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
