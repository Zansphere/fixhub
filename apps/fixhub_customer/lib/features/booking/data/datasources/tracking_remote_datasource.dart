import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

class TrackingRemoteDataSource {
  TrackingRemoteDataSource(this._baseUrl);

  final String _baseUrl;
  io.Socket? _socket;

  // Stream controllers to broadcast incoming events
  final _locationController = StreamController<Map<String, dynamic>>.broadcast();
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get locationUpdates => _locationController.stream;
  Stream<Map<String, dynamic>> get statusUpdates => _statusController.stream;

  /// Connects to the tracking WebSocket namespace using the provided JWT auth token.
  /// [onConnected] is called once the socket handshake completes — safe to join rooms here.
  void connect(String token, {VoidCallback? onConnected}) {
    if (_socket != null && _socket!.connected) {
      // Already connected — fire callback immediately
      onConnected?.call();
      return;
    }

    final url = _baseUrl.endsWith('/api/v1')
        ? _baseUrl.replaceFirst('/api/v1', '/tracking')
        : '$_baseUrl/tracking';

    _socket = io.io(
      url,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .setAuth({'token': token})
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[Tracking WS] Connected to $url');
      onConnected?.call();
    });

    _socket!.onConnectError((data) {
      debugPrint('[Tracking WS] Connection Error: $data');
    });

    _socket!.onError((data) {
      debugPrint('[Tracking WS] Error: $data');
    });

    _socket!.onDisconnect((_) {
      debugPrint('[Tracking WS] Disconnected');
    });

    // Listen to specific tracking events broadcasted by TrackingGateway
    _socket!.on('location:update', (data) {
      debugPrint('[Tracking WS] Location Update: $data');
      if (data != null && data is Map<String, dynamic>) {
        _locationController.add(data);
      }
    });

    _socket!.on('status:update', (data) {
      debugPrint('[Tracking WS] Status Update: $data');
      if (data != null && data is Map<String, dynamic>) {
        _statusController.add(data);
      }
    });

    _socket!.connect();
  }

  /// Joins the specific room for a booking to start receiving its updates.
  void joinBooking(String bookingId) {
    if (_socket == null || !_socket!.connected) {
      debugPrint('[Tracking WS] Cannot join booking $bookingId, socket not connected');
      return;
    }
    _socket!.emit('join_booking', {'bookingId': bookingId});
    debugPrint('[Tracking WS] Emitted join_booking for $bookingId');
  }

  /// Leaves the room for a booking.
  void leaveBooking(String bookingId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('leave_booking', {'bookingId': bookingId});
    debugPrint('[Tracking WS] Emitted leave_booking for $bookingId');
  }

  /// Disconnects and cleans up resources.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _locationController.close();
    _statusController.close();
  }
}
