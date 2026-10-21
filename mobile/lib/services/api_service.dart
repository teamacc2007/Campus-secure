import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static String defaultBaseUrl = 'http://10.11.48.236:8000/api/v1';
  static String _token = '';

  static Future<String> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('api_base_url') ?? defaultBaseUrl;
  }

  static Future<void> setBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_base_url', url);
  }

  static Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('jwt_token', token);
  }

  static Future<String?> getToken() async {
    if (_token.isNotEmpty) return _token;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('jwt_token') ?? '';
    return _token.isNotEmpty ? _token : null;
  }

  static Future<Map<String, String>> _headers() async {
    final token = await getToken();
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // 1. Authentication
  static Future<Map<String, dynamic>> login(String username, String password) async {
    final baseUrl = await getBaseUrl();
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'username': username, 'password': password}),
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      await saveToken(data['access_token']);
      return data;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['detail'] ?? 'Login failed');
    }
  }

  static Future<Map<String, dynamic>> getCurrentUser() async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.get(Uri.parse('$baseUrl/auth/me'), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load user profile');
  }

  // 2. Access Logs
  static Future<List<dynamic>> getAccessLogs({
    String? personType,
    String? reviewStatus,
    String? query,
  }) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final uri = Uri.parse('$baseUrl/access-logs/').replace(queryParameters: {
      if (personType != null && personType != 'All') 'person_type': personType,
      if (reviewStatus != null && reviewStatus != 'All') 'review_status': reviewStatus,
      if (query != null && query.isNotEmpty) 'query': query,
    });
    final response = await http.get(uri, headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load access logs');
  }

  static Future<Map<String, dynamic>> logAccessEvent(Map<String, dynamic> logData) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/access-logs/'),
      headers: headers,
      body: jsonEncode(logData),
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to record access log');
  }

  static Future<Map<String, dynamic>> reviewAccessLog(int logId, String actionType, String reason) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/access-logs/$logId/review'),
      headers: headers,
      body: jsonEncode({'action_type': actionType, 'reason': reason}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to submit review');
  }

  // 3. Visitor Passes
  static Future<List<dynamic>> getVisitorPasses({String? query, String? status}) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final uri = Uri.parse('$baseUrl/visitor-passes/').replace(queryParameters: {
      if (query != null && query.isNotEmpty) 'query': query,
      if (status != null && status != 'All') 'status': status,
    });
    final response = await http.get(uri, headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load visitor passes');
  }

  static Future<Map<String, dynamic>> createVisitorPass(Map<String, dynamic> passDraft) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/visitor-passes/'),
      headers: headers,
      body: jsonEncode(passDraft),
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to issue visitor pass');
  }

  static Future<Map<String, dynamic>> cancelVisitorPass(int passId, String reason) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/visitor-passes/$passId/cancel'),
      headers: headers,
      body: jsonEncode({'reason': reason}),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to cancel pass');
  }

  // 4. Face & Biometric Verification
  static Future<Map<String, dynamic>> verifyFace({
    String? imageBase64,
    String? registerNumber,
    String locationBlock = 'Gate 1 Main Entrance',
    String guardName = 'G. Selvam',
  }) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/ai/verify-face'),
      headers: headers,
      body: jsonEncode({
        if (imageBase64 != null) 'image_base64': imageBase64,
        if (registerNumber != null) 'register_number': registerNumber,
        'location_block': locationBlock,
        'guard_name': guardName,
      }),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Face verification failed');
  }

  // 5. Guards & Supervisors
  static Future<List<dynamic>> getGuards() async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.get(Uri.parse('$baseUrl/guards/'), headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load guards');
  }

  static Future<Map<String, dynamic>> createGuard(Map<String, dynamic> guardData) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/guards/'),
      headers: headers,
      body: jsonEncode(guardData),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to create guard');
  }

  // 6. Bulk Import
  static Future<Map<String, dynamic>> previewBulkExcel(Uint8List bytes, String filename) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    headers.remove('Content-Type'); // Let multipart set the boundary

    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/bulk-import/preview'));
    request.headers.addAll(headers);
    request.files.add(http.MultipartFile.fromBytes('file', bytes, filename: filename));

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to preview bulk file');
  }

  static Future<Map<String, dynamic>> confirmBulkImport(Map<String, dynamic> requestBody) async {
    final baseUrl = await getBaseUrl();
    final headers = await _headers();
    final response = await http.post(
      Uri.parse('$baseUrl/bulk-import/confirm'),
      headers: headers,
      body: jsonEncode(requestBody),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to issue bulk passes');
  }
}
