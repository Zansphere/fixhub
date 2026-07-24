import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../services/location_service.dart';
import '../../features/profile/data/profile_repository.dart';

/// Tracks technician location in the background while they are online.
///
/// Two modes:
/// - **Idle mode**: Pushes location every 60s when technician is available but
///   has no active job. This keeps the backend aware of technician positions
///   for assignment algorithms.
/// - **Active job mode**: Managed by [EnRouteNotifier] instead (10s interval).
///   When the en-route provider is active, this tracker should be stopped to
///   avoid duplicate pushes.
///
/// Automatically stops when the provider is disposed.
final locationTrackerProvider = Provider<LocationTracker>((ref) {
  final tracker = LocationTracker(
    locationService: ref.read(locationServiceProvider),
    profileRepository: ref.read(profileRepositoryProvider),
  );
  ref.onDispose(tracker.stop);
  return tracker;
});

class LocationTracker {
  LocationTracker({
    required LocationService locationService,
    required ProfileRepository profileRepository,
  })  : _locationService = locationService,
        _profileRepository = profileRepository;

  final LocationService _locationService;
  final ProfileRepository _profileRepository;

  StreamSubscription<Position>? _positionSub;
  DateTime? _lastPushed;

  /// Default idle interval: push every 60 seconds
  static const _idleInterval = Duration(seconds: 60);

  bool get isTracking => _positionSub != null;

  /// Start pushing location updates to the server (idle mode, 60s interval).
  Future<void> start() async {
    if (isTracking) return;

    final granted = await _locationService.requestPermission();
    if (!granted) return;

    _positionSub = _locationService.trackPosition(distanceFilterMeters: 50).listen(
      (position) => _onPosition(position),
      onError: (_) {}, // Silently handle GPS errors — don't crash the app
    );
  }

  void stop() {
    _positionSub?.cancel();
    _positionSub = null;
  }

  Future<void> _onPosition(Position position) async {
    final now = DateTime.now();
    if (_lastPushed != null && now.difference(_lastPushed!) < _idleInterval) {
      return; // Throttle — max once per 60s even if movement > 50m
    }
    _lastPushed = now;
    try {
      await _profileRepository.updateLocation(position.latitude, position.longitude);
    } catch (e) {
      debugPrint('[LocationTracker] Failed to push location: $e');
      // Non-fatal — location will be pushed on next movement event
    }
  }
}
