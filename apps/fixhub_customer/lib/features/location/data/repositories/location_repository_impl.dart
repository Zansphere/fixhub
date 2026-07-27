import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart' as geo;
import '../../domain/repositories/location_repository.dart';
import '../datasources/location_remote_datasource.dart';
import '../models/service_area_validation_model.dart';

class LocationRepositoryImpl implements LocationRepository {
  final LocationRemoteDataSource _remoteDataSource;

  LocationRepositoryImpl(this._remoteDataSource);

  @override
  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return false;
    }
    return true;
  }

  @override
  Future<bool> requestPermission() async {
    LocationPermission permission = await Geolocator.requestPermission();
    return permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
  }

  @override
  Future<Position> getCurrentLocation() async {
    // Re-check permission here, but only after the caller has already
    // requested it. This avoids the race where checkPermission() still
    // reads "denied" right after the OS dialog is dismissed.
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      // One last attempt — the dialog may have just closed.
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw Exception('Location permission denied');
    }
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  @override
  Future<Map<String, String>?> getAddressFromPosition(Position position) async {
    try {
      final placemarks = await geo.Geocoding().placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );
      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final pincode = p.postalCode;
        if (pincode != null && pincode.isNotEmpty) {
          final city = [p.subLocality, p.locality, p.administrativeArea]
              .where((e) => e != null && e.isNotEmpty)
              .join(', ');
          return {
            'pincode': pincode,
            'city': city.isNotEmpty ? city : 'Unknown Location',
          };
        }
      }
    } catch (e) {
      print('[LocationRepository] Reverse geocoding failed: $e');
    }
    return null;
  }

  @override
  Future<ServiceAreaValidationModel> validateServiceArea(String pincode, {double? lat, double? lng}) async {
    final response = await _remoteDataSource.validateServiceArea(pincode, lat: lat, lng: lng);

    print('Response: $response');

    final data = response['data'] ?? response;

    print('Data: $data');

    return ServiceAreaValidationModel.fromJson(
      Map<String, dynamic>.from(data),
    );
  }

  @override
  Future<void> requestCoverage(String pincode, String name, String phone, String email) async {
    await _remoteDataSource.requestCoverage({
      'pincode': pincode,
      'name': name,
      'phone': phone,
      'email': email,
    });
  }
}
