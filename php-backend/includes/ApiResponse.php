<?php
/**
 * API Response helper class
 */
class ApiResponse {
    
    public static function success($data = null, $message = 'Success', $statusCode = 200) {
        http_response_code($statusCode);
        $response = ['status' => 'success', 'message' => $message];
        if ($data !== null) {
            $response['data'] = $data;
        }
        echo json_encode($response);
        exit;
    }
    
    public static function error($message = 'Error', $statusCode = 400, $details = null) {
        http_response_code($statusCode);
        $response = ['status' => 'error', 'message' => $message];
        if ($details !== null) {
            $response['details'] = $details;
        }
        echo json_encode($response);
        exit;
    }
    
    public static function notFound($message = 'Resource not found') {
        self::error($message, 404);
    }
    
    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401);
    }
    
    public static function forbidden($message = 'Forbidden') {
        self::error($message, 403);
    }
    
    public static function badRequest($message = 'Bad request') {
        self::error($message, 400);
    }
    
    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
    
    public static function getJsonInput() {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?? [];
    }
    
    public static function validateRequired($data, $fields) {
        $missing = [];
        foreach ($fields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                $missing[] = $field;
            }
        }
        
        if (!empty($missing)) {
            self::badRequest('Missing required fields: ' . implode(', ', $missing));
        }
    }
}
?>
