import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

/// Socket.IO client for the partner app's real-time tracking.
///
/// Connects to the backend's `/tracking` WebSocket namespace.
/// The technician joins the booking room to:
///   - **Receive** `status:update` events (e.g., customer cancels, revision approved)
///   - **Receive** `location:update` events (for debugging / co-worker awareness)
///
/// Location data is still pushed via REST (PATCH /technicians/location) because
/// the backend's TrackingGateway broadcasts server-side via `broadcastLocationUpdate`.
/// The client doesn't emit location directly over the socket.
class TrackingSocketService {
  TrackingSocketService(this._baseUrl);

  final String _baseUrl;
  io.Socket? _socket;

  // Stream controllers to broadcast incoming events
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();
  final _locationController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get statusUpdates => _statusController.stream;
  Stream<Map<String, dynamic>> get locationUpdates => _locationController.stream;

  bool get isConnected => _socket?.connected ?? false;

  /// Connects to the tracking WebSocket namespace using the provided JWT token.
  /// [onConnected] is called once the socket handshake completes.
  void connect(String token, {VoidCallback? onConnected}) {
    if (_socket != null && _socket!.connected) {
      onConnected?.call();
      return;
    }

    // Derive the WebSocket URL from the REST API base URL
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

    // Listen for status changes broadcasted by the backend
    _socket!.on('status:update', (data) {
      debugPrint('[Tracking WS] Status Update: $data');
      if (data != null && data is Map<String, dynamic>) {
        _statusController.add(data);
      }
    });

    // Listen for location updates (in case other technicians or admin need it)
    _socket!.on('location:update', (data) {
      debugPrint('[Tracking WS] Location Update: $data');
      if (data != null && data is Map<String, dynamic>) {
        _locationController.add(data);
      }
    });

    _socket!.connect();
  }

  /// Joins a specific booking room to receive real-time updates.
  void joinBooking(String bookingId) {
    if (_socket == null || !_socket!.connected) {
      debugPrint('[Tracking WS] Cannot join booking $bookingId — socket not connected');
      return;
    }
    _socket!.emit('join_booking', {'bookingId': bookingId});
    debugPrint('[Tracking WS] Emitted join_booking for $bookingId');
  }

  /// Leaves a booking room.
  void leaveBooking(String bookingId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('leave_booking', {'bookingId': bookingId});
    debugPrint('[Tracking WS] Emitted leave_booking for $bookingId');
  }

  /// Disconnects and cleans up the socket.
  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _statusController.close();
    _locationController.close();
  }
}
