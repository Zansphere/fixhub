import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/data/auth_repository.dart';

final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(ref);
});

class FcmService {
  final Ref _ref;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  FcmService(this._ref);

  Future<void> initialize() async {
    // Request permission
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      debugPrint('FCM: User granted permission');

      // Get token and sync to backend
      try {
        final token = await _messaging.getToken();
        if (token != null) {
          await syncToken(token);
        }
      } catch (e) {
        debugPrint('FCM: Failed to get token: $e');
      }

      // Listen for token refresh
      _messaging.onTokenRefresh.listen(syncToken);

      // Foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('FCM: Foreground message received: ${message.messageId}');
      });
    } else {
      debugPrint('FCM: User declined or has not accepted permission');
    }
  }

  /// Sync FCM token via the auth device registration endpoint.
  /// Uses /auth/device which matches the backend's RegisterDeviceDto.
  Future<void> syncToken(String token) async {
    try {
      final platform = Platform.isIOS ? 'IOS' : 'ANDROID';
      await _ref.read(authRepositoryProvider).registerDevice(token, platform);
      debugPrint('FCM: Token synced successfully');
    } catch (e) {
      debugPrint('FCM: Failed to sync token: $e');
    }
  }
}
