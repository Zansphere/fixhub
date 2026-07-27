import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/config/theme/app_colors.dart';
import '../../../../core/config/theme/app_spacing.dart';
import '../../../../core/config/theme/app_radius.dart';
import '../../../../core/widgets/fp_app_bar.dart';
import '../../../../core/widgets/fp_button.dart';
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
  List<Map<String, String>> _customAreas = [];
  bool _isSaving = false;
  bool _isInitialized = false;

  final _nameController = TextEditingController();
  final _pincodeController = TextEditingController();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_isInitialized) {
      _initSelections();
      _isInitialized = true;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _pincodeController.dispose();
    super.dispose();
  }

  void _initSelections() {
    final profileState = ref.read(profileProvider);
    final serviceAreas = profileState.value?.serviceAreas;
    if (serviceAreas != null) {
      final List<Map<String, String>> areas = [];
      for (var a in serviceAreas) {
        if (a is Map<String, dynamic>) {
          if (a['pincode'] != null && a['name'] != null) {
             areas.add({
               'name': a['name'] as String,
               'pincode': a['pincode'] as String,
             });
          }
        }
      }
      setState(() {
        _customAreas = areas;
      });
    }
  }

  void _addArea() {
    final name = _nameController.text.trim();
    final pincode = _pincodeController.text.trim();
    if (name.isNotEmpty && pincode.isNotEmpty) {
      if (!_customAreas.any((a) => a['pincode'] == pincode)) {
        setState(() {
          _customAreas.add({'name': name, 'pincode': pincode});
        });
      }
      _nameController.clear();
      _pincodeController.clear();
    }
  }

  void _removeArea(String pincode) {
    setState(() {
      _customAreas.removeWhere((a) => a['pincode'] == pincode);
    });
  }

  Future<void> _save() async {
    if (_customAreas.isEmpty) {
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
          .updateServiceAreas(customAreas: _customAreas);
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
    final autoDetectAsync = ref.watch(locationAutoDetectProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const FpSurfaceAppBar(title: 'Edit Service Areas'),
      body: Column(
        children: [
          // Auto-detect section
          Padding(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: autoDetectAsync.when(
              loading: () => const Row(
                children: [
                  SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                  SizedBox(width: 12),
                  Text('Detecting your location...'),
                ],
              ),
              error: (err, _) => const Text('Could not detect location. Please add manually.', style: TextStyle(color: AppColors.error)),
              data: (detected) {
                if (detected == null) return const Text('Could not detect location. Please add manually.', style: TextStyle(color: AppColors.error));
                
                // Automatically add if not present
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (!_customAreas.any((a) => a['pincode'] == detected['pincode'])) {
                    setState(() {
                      _customAreas.add({'name': detected['name']!, 'pincode': detected['pincode']!});
                    });
                  }
                });

                return Row(
                  children: [
                    const Icon(Icons.my_location_rounded, color: AppColors.success, size: 20),
                    const SizedBox(width: 8),
                    Text('Detected: ${detected['name']} (${detected['pincode']})', 
                      style: const TextStyle(color: AppColors.success, fontWeight: FontWeight.w600)),
                  ],
                );
              },
            ),
          ),

          // Custom Areas List
          Expanded(
            child: _customAreas.isEmpty
                ? const Center(child: Text('No areas added yet'))
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
                    itemCount: _customAreas.length,
                    separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
                    itemBuilder: (context, i) {
                      final area = _customAreas[i];
                      return Container(
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${area['name']} - ${area['pincode']}',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: AppColors.error),
                              onPressed: () => _removeArea(area['pincode']!),
                            )
                          ],
                        ),
                      );
                    },
                  ),
          ),

          // Add Manually Form
          Padding(
            padding: const EdgeInsets.all(AppSpacing.screenPadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Add another area manually:', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          hintText: 'City Name',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      flex: 1,
                      child: TextField(
                        controller: _pincodeController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: 'Pincode',
                          isDense: true,
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    IconButton(
                      style: IconButton.styleFrom(backgroundColor: AppColors.primaryContainer),
                      icon: const Icon(Icons.add, color: AppColors.primary),
                      onPressed: _addArea,
                    ),
                  ],
                ),
              ],
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
                if (_customAreas.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.base),
                    child: Text(
                      '${_customAreas.length} area${_customAreas.length == 1 ? '' : 's'} added',
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
