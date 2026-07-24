import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/onboarding_repository.dart';
import '../../profile/data/profile_repository.dart';

// ── Catalog categories ────────────────────────────────────────────
final catalogCategoriesProvider =
    FutureProvider<List<CatalogCategory>>((ref) async {
  return ref.read(onboardingRepositoryProvider).fetchCategories();
});

// ── Sub-services for a given category ────────────────────────────
final catalogServicesProvider =
    FutureProvider.family<List<CatalogService>, String?>((ref, categoryId) async {
  return ref
      .read(onboardingRepositoryProvider)
      .fetchServices(categoryId: categoryId);
});

// ── Service Areas ───────────────────────────────────────────────
final catalogServiceAreasProvider = FutureProvider<List<ServiceArea>>((ref) async {
  return ref.read(onboardingRepositoryProvider).fetchServiceAreas();
});

// ── Setup wizard state ────────────────────────────────────────────
class SetupWizardState {
  final int step; // 0, 1, 2
  final String? name;
  final String? email;
  final String? selectedCategoryId;
  final List<String> selectedSubServiceIds;
  final List<String> selectedAreaIds;
  final bool isSubmitting;
  final String? error;

  const SetupWizardState({
    this.step = 0,
    this.name,
    this.email,
    this.selectedCategoryId,
    this.selectedSubServiceIds = const [],
    this.selectedAreaIds = const [],
    this.isSubmitting = false,
    this.error,
  });

  SetupWizardState copyWith({
    int? step,
    String? name,
    String? email,
    String? selectedCategoryId,
    List<String>? selectedSubServiceIds,
    List<String>? selectedAreaIds,
    bool? isSubmitting,
    String? error,
  }) {
    return SetupWizardState(
      step: step ?? this.step,
      name: name ?? this.name,
      email: email ?? this.email,
      selectedCategoryId: selectedCategoryId ?? this.selectedCategoryId,
      selectedSubServiceIds:
          selectedSubServiceIds ?? this.selectedSubServiceIds,
      selectedAreaIds: selectedAreaIds ?? this.selectedAreaIds,
      isSubmitting: isSubmitting ?? this.isSubmitting,
      error: error,
    );
  }
}

final setupWizardProvider =
    NotifierProvider<SetupWizardNotifier, SetupWizardState>(
        SetupWizardNotifier.new);

class SetupWizardNotifier extends Notifier<SetupWizardState> {
  @override
  SetupWizardState build() => const SetupWizardState();

  void setName(String name) =>
      state = state.copyWith(name: name, error: null);

  void setEmail(String email) =>
      state = state.copyWith(email: email, error: null);

  void setCategory(String? categoryId) =>
      state = state.copyWith(
        selectedCategoryId: categoryId,
        selectedSubServiceIds: [], // reset on category change
        error: null,
      );

  void toggleSubService(String id) {
    final current = List<String>.from(state.selectedSubServiceIds);
    if (current.contains(id)) {
      current.remove(id);
    } else {
      current.add(id);
    }
    state = state.copyWith(selectedSubServiceIds: current, error: null);
  }

  void toggleArea(String id) {
    final current = List<String>.from(state.selectedAreaIds);
    if (current.contains(id)) {
      current.remove(id);
    } else {
      current.add(id);
    }
    state = state.copyWith(selectedAreaIds: current, error: null);
  }

  void nextStep() {
    if (state.step < 2) state = state.copyWith(step: state.step + 1);
  }

  void prevStep() {
    if (state.step > 0) state = state.copyWith(step: state.step - 1);
  }

  bool validateCurrentStep() {
    switch (state.step) {
      case 0:
        if (state.name == null || state.name!.trim().isEmpty) {
          state = state.copyWith(error: 'Please enter your full name');
          return false;
        }
        return true;
      case 1:
        if (state.selectedSubServiceIds.isEmpty) {
          state = state.copyWith(
              error: 'Please select at least one service you offer');
          return false;
        }
        return true;
      case 2:
        if (state.selectedAreaIds.isEmpty) {
          state = state.copyWith(
              error: 'Please select at least one service area');
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  /// Submit all 3 steps to the backend
  Future<void> submit() async {
    state = state.copyWith(isSubmitting: true, error: null);
    try {
      final repo = ref.read(profileRepositoryProvider);

      // Step 1: Update profile (name + email)
      await repo.updateProfile(
        name: state.name?.trim(),
        email: state.email?.trim().isEmpty == true ? null : state.email?.trim(),
      );

      // Step 2: Update specializations
      if (state.selectedSubServiceIds.isNotEmpty) {
        await repo.updateSpecializations(state.selectedSubServiceIds);
      }

      // Step 3: Update service areas
      if (state.selectedAreaIds.isNotEmpty) {
        await repo.updateServiceAreas(state.selectedAreaIds);
      }

      state = state.copyWith(isSubmitting: false);
    } catch (e) {
      state = state.copyWith(
        isSubmitting: false,
        error: 'Something went wrong. Please try again.',
      );
      rethrow;
    }
  }
}
