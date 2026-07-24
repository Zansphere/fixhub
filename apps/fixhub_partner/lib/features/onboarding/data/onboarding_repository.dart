import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_endpoints.dart';
import '../../../core/network/dio_client.dart';

final onboardingRepositoryProvider = Provider<OnboardingRepository>((ref) {
  return OnboardingRepository(ref.read(dioProvider));
});

/// A catalog category (e.g. Electrical, Plumbing)
class CatalogCategory {
  final String id;
  final String name;
  final String? slug;
  final String? iconUrl;

  const CatalogCategory({
    required this.id,
    required this.name,
    this.slug,
    this.iconUrl,
  });

  factory CatalogCategory.fromJson(Map<String, dynamic> json) =>
      CatalogCategory(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String?,
        iconUrl: json['iconUrl'] as String?,
      );
}

/// A sub-service within a category (e.g. "Switch Repair")
class CatalogService {
  final String id;
  final String name;
  final String? categoryId;
  final String? categoryName;

  const CatalogService({
    required this.id,
    required this.name,
    this.categoryId,
    this.categoryName,
  });

  factory CatalogService.fromJson(Map<String, dynamic> json) {
    final category = json['category'] as Map<String, dynamic>?;
    return CatalogService(
      id: json['id'] as String,
      name: json['name'] as String,
      categoryId: category?['id'] as String? ?? json['categoryId'] as String?,
      categoryName:
          category?['name'] as String? ?? json['categoryName'] as String?,
    );
  }
}

/// A service area (city/zone)
class ServiceArea {
  final String id;
  final String name;
  final String? city;
  final String? state;

  const ServiceArea({
    required this.id,
    required this.name,
    this.city,
    this.state,
  });

  factory ServiceArea.fromJson(Map<String, dynamic> json) => ServiceArea(
        id: json['id'] as String,
        name: json['name'] as String? ?? json['city'] as String? ?? '',
        city: json['city'] as String?,
        state: json['state'] as String?,
      );
}

class OnboardingRepository {
  final Dio _dio;

  OnboardingRepository(this._dio);

  Future<List<CatalogCategory>> fetchCategories() async {
    final response = await _dio.get(ApiEndpoints.catalogCategories);
    final raw = _unwrapList(response.data);
    return raw
        .map((e) => CatalogCategory.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<CatalogService>> fetchServices({String? categoryId}) async {
    final response = await _dio.get(
      ApiEndpoints.catalogServices,
      queryParameters: {
        if (categoryId != null) 'categoryId': categoryId,
        'limit': 100,
      },
    );
    final raw = _unwrapItems(response.data);
    return raw
        .map((e) => CatalogService.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<ServiceArea>> fetchServiceAreas() async {
    try {
      final response =
          await _dio.get(ApiEndpoints.serviceAreas);
      final raw = _unwrapList(response.data);
      return raw
          .map((e) => ServiceArea.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (_) {
      // Service areas endpoint may return empty for new technicians — that's OK
      return [];
    }
  }

  List<dynamic> _unwrapList(dynamic data) {
    if (data is Map<String, dynamic>) {
      final inner = data['data'] ?? data;
      if (inner is List) return inner;
      if (inner is Map && inner.containsKey('items')) {
        return inner['items'] as List<dynamic>;
      }
    }
    if (data is List) return data;
    return [];
  }

  List<dynamic> _unwrapItems(dynamic data) {
    if (data is Map<String, dynamic>) {
      final inner = (data['data'] ?? data) as dynamic;
      if (inner is List) return inner;
      if (inner is Map<String, dynamic> && inner.containsKey('items')) {
        return inner['items'] as List<dynamic>;
      }
    }
    if (data is List) return data;
    return [];
  }
}
