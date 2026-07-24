import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme/app_colors.dart';
import '../../../../core/config/theme/app_spacing.dart';
import '../../../../core/config/theme/app_radius.dart';
import '../../../../core/widgets/fp_app_bar.dart';
import '../../../../core/widgets/fp_button.dart';
import '../../../../core/widgets/fp_skeleton.dart';
import '../../onboarding/presentation/onboarding_provider.dart';
import '../data/profile_repository.dart';
import 'profile_provider.dart';

class EditServiceAreasScreen extends ConsumerStatefulWidget {
  const EditServiceAreasScreen({super.key});

  @override
  ConsumerState<EditServiceAreasScreen> createState() =>
      _EditServiceAreasScreenState();
}

class _EditServiceAreasScreenState
    extends ConsumerState<EditServiceAreasScreen> {
  List<String> _selectedAreaIds = [];
  bool _isSaving = false;
  bool _isInitialized = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      _initSelections();
      _isInitialized = true;
    }
  }

  void _initSelections() {
    final profileState = ref.read(profileProvider);
    final serviceAreas = profileState.value?.serviceAreas;
    if (serviceAreas != null) {
      final ids = serviceAreas.map((a) {
        if (a is Map<String, dynamic>) {
          return a['id'] as String? ?? '';
        }
        return '';
      }).where((id) => id.isNotEmpty).toList();
      _selectedAreaIds = List.from(ids);
    }
  }

  void _toggleArea(String id) {
    setState(() {
      if (_selectedAreaIds.contains(id)) {
        _selectedAreaIds.remove(id);
      } else {
        _selectedAreaIds.add(id);
      }
    });
  }

  Future<void> _save() async {
    if (_selectedAreaIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select at least one service area'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      await ref
          .read(profileRepositoryProvider)
          .updateServiceAreas(_selectedAreaIds);
      ref.invalidate(profileProvider);
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Service areas updated successfully'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update service areas. Please try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final areasAsync = ref.watch(catalogServiceAreasProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FpSurfaceAppBar(title: 'Edit Service Areas'),
      body: Column(
        children: [
          Expanded(
            child: areasAsync.when(
              loading: () => ListView.separated(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenPadding,
                    vertical: AppSpacing.lg),
                itemCount: 8,
                separatorBuilder: (_, __) =>
                    const SizedBox(height: AppSpacing.sm),
                itemBuilder: (_, __) => const FpSkeleton(height: 52),
              ),
              error: (_, __) => const Center(
                child: Text('Could not load service areas'),
              ),
              data: (areas) {
                if (areas.isEmpty) {
                  return const Center(
                    child: Text('No service areas available'),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.screenPadding,
                      vertical: AppSpacing.lg),
                  itemCount: areas.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, i) {
                    final area = areas[i];
                    final isSelected = _selectedAreaIds.contains(area.id);
                    return _AreaTile(
                      name: area.name,
                      isSelected: isSelected,
                      onTap: () => _toggleArea(area.id),
                    );
                  },
                );
              },
            ),
          ),

          // Save Button
          Container(
            padding: const EdgeInsets.fromLTRB(
              AppSpacing.screenPadding,
              AppSpacing.base,
              AppSpacing.screenPadding,
              AppSpacing.bottomSafePad,
            ),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_selectedAreaIds.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.base),
                    child: Text(
                      '${_selectedAreaIds.length} area${_selectedAreaIds.length == 1 ? '' : 's'} selected',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                FpButton(
                  label: 'Save Changes',
                  isLoading: _isSaving,
                  onPressed: _save,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AreaTile extends StatelessWidget {
  final String name;
  final bool isSelected;
  final VoidCallback onTap;

  const _AreaTile({
    required this.name,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(
            color: isSelected ? AppColors.info : AppColors.border,
            width: 1.5,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: AppColors.info.withValues(alpha: 0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ]
              : null,
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                name,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      fontWeight:
                          isSelected ? FontWeight.w600 : FontWeight.w500,
                      color: isSelected
                          ? AppColors.info
                          : AppColors.textPrimary,
                    ),
              ),
            ),
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isSelected ? AppColors.info : Colors.transparent,
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppColors.info : AppColors.border,
                  width: 2,
                ),
              ),
              child: isSelected
                  ? const Icon(Icons.check, size: 16, color: Colors.white)
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}
