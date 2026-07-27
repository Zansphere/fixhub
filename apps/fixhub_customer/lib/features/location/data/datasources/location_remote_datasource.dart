import 'package:dio/dio.dart';
import '../../../../core/network/api_endpoints.dart';

class LocationRemoteDataSource {
  final Dio _dio;

  LocationRemoteDataSource(this._dio);

  Future<Map<String, dynamic>> validateServiceArea(String pincode, {double? lat, double? lng}) async {
    final data = <String, dynamic>{'pincode': pincode};
    if (lat != null) data['latitude'] = lat;
    if (lng != null) data['longitude'] = lng;

    final response = await _dio.post(
      ApiEndpoints.validateServiceArea,
      data: data,
    );
    return response.data;
  }

  Future<Map<String, dynamic>> requestCoverage(Map<String, dynamic> data) async {
    final response = await _dio.post(
      ApiEndpoints.requestCoverage,
      data: data,
    );
    return response.data;
  }
}
