import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../../core/config/app_config.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/tracking_socket_service.dart';
import '../../../core/storage/local_storage.dart';
import '../../profile/data/profile_repository.dart';
import 'job_provider.dart';

part 'enroute_provider.g.dart';

// ── TrackingSocketService provider ───────────────────────────────
final trackingSocketServiceProvider = Provider<TrackingSocketService>((ref) {
  final service = TrackingSocketService(AppConfig.apiBaseUrl);
  ref.onDispose(() => service.dispose());
  return service;
});

// ── En-Route state ──────────────────────────────────────────────
class EnRouteState {
  final bool isSocketConnected;
  final bool isTrackingLocation;
  final String? currentStatus;
  final Position? lastKnownPosition;
  final String? errorMessage;

  const EnRouteState({
    this.isSocketConnected = false,
    this.isTrackingLocation = false,
    this.currentStatus,
    this.lastKnownPosition,
    this.errorMessage,
  });

  EnRouteState copyWith({
    bool? isSocketConnected,
    bool? isTrackingLocation,
    String? currentStatus,
    Position? lastKnownPosition,
    String? errorMessage,
  }) {
    return EnRouteState(
      isSocketConnected: isSocketConnected ?? this.isSocketConnected,
      isTrackingLocation: isTrackingLocation ?? this.isTrackingLocation,
      currentStatus: currentStatus ?? this.currentStatus,
      lastKnownPosition: lastKnownPosition ?? this.lastKnownPosition,
      errorMessage: errorMessage,
    );
  }
}

// ── En-Route Provider (AutoDispose Family via code-gen) ─────────
@riverpod
class EnRoute extends _$EnRoute {
  StreamSubscription<Position>? _positionSub;
  StreamSubscription<Map<String, dynamic>>? _statusSub;
  Timer? _pushTimer;

  @override
  EnRouteState build(String bookingId) {
    _initTracking();
    ref.onDispose(cleanup);
    return const EnRouteState();
  }

  Future<void> _initTracking() async {
    // 1. Connect to WebSocket
    await _connectSocket();
    // 2. Start GPS tracking and push location to backend
    await _startLocationTracking();
  }

  Future<void> _connectSocket() async {
    try {
      final token = await ref.read(localStorageProvider).getAccessToken();
      if (token == null || token.isEmpty) {
        debugPrint('[EnRoute] No token — cannot connect WebSocket');
        return;
      }

      final socketService = ref.read(trackingSocketServiceProvider);
      socketService.connect(token, onConnected: () {
        socketService.joinBooking(bookingId);
        state = state.copyWith(isSocketConnected: true);
      });

      // Listen for status updates from the backend
      _statusSub = socketService.statusUpdates.listen((data) {
        if (data['bookingId'] == bookingId) {
          final newStatus = data['status'] as String?;
          state = state.copyWith(currentStatus: newStatus);
          // Invalidate job providers so UI reflects the new status
          ref.invalidate(jobDetailsProvider(bookingId));
          ref.invalidate(currentJobProvider);
        }
      });
    } catch (e) {
      debugPrint('[EnRoute] WebSocket connection error: $e');
      state = state.copyWith(errorMessage: 'Could not connect to tracking');
    }
  }

  /// Start pushing GPS location to the backend via REST.
  Future<void> _startLocationTracking() async {
    final locationService = ref.read(locationServiceProvider);
    final granted = await locationService.requestPermission();

    if (!granted) {
      state = state.copyWith(
        errorMessage: 'Location permission required for en-route tracking',
      );
      return;
    }

    state = state.copyWith(isTrackingLocation: true);

    // Stream GPS updates with a 10m movement filter for smooth tracking
    _positionSub = locationService.trackPosition(distanceFilterMeters: 10).listen(
      (position) {
        state = state.copyWith(lastKnownPosition: position);
      },
      onError: (e) {
        debugPrint('[EnRoute] GPS error: $e');
      },
    );

    // Push location to backend every 10 seconds
    _pushTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _pushLocationToServer();
    });

    // Push initial location immediately
    _pushLocationToServer();
  }

  Future<void> _pushLocationToServer() async {
    final position = state.lastKnownPosition;
    if (position == null) {
      // Try getting current position if stream hasn't fired yet
      try {
        final pos = await ref.read(locationServiceProvider).getCurrentPosition();
        if (pos != null) {
          state = state.copyWith(lastKnownPosition: pos);
          await _sendLocation(pos.latitude, pos.longitude);
        }
      } catch (_) {}
      return;
    }

    await _sendLocation(position.latitude, position.longitude);
  }

  Future<void> _sendLocation(double lat, double lng) async {
    try {
      await ref.read(profileRepositoryProvider).updateLocation(lat, lng);
    } catch (e) {
      debugPrint('[EnRoute] Failed to push location: $e');
      // Non-fatal — next tick will retry
    }
  }

  /// Stop all tracking. Called when leaving EN_ROUTE state or screen.
  void stopTracking() {
    cleanup();
    state = const EnRouteState();
  }

  void cleanup() {
    _positionSub?.cancel();
    _positionSub = null;
    _statusSub?.cancel();
    _statusSub = null;
    _pushTimer?.cancel();
    _pushTimer = null;

    try {
      final socketService = ref.read(trackingSocketServiceProvider);
      socketService.leaveBooking(bookingId);
    } catch (_) {}
  }
}
