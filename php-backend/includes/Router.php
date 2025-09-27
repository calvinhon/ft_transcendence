<?php
/**
 * Simple router for handling API endpoints
 */
class Router {
    private $routes = [];
    
    public function addRoute($method, $path, $handler) {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'handler' => $handler
        ];
    }
    
    public function get($path, $handler) {
        $this->addRoute('GET', $path, $handler);
    }
    
    public function post($path, $handler) {
        $this->addRoute('POST', $path, $handler);
    }
    
    public function put($path, $handler) {
        $this->addRoute('PUT', $path, $handler);
    }
    
    public function delete($path, $handler) {
        $this->addRoute('DELETE', $path, $handler);
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $this->getCurrentPath();
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method) {
                $pattern = $this->convertPathToRegex($route['path']);
                if (preg_match($pattern, $path, $matches)) {
                    $params = $this->extractParams($route['path'], $matches);
                    return $this->callHandler($route['handler'], $params);
                }
            }
        }
        
        ApiResponse::notFound('Endpoint not found');
    }
    
    private function getCurrentPath() {
        $path = $_SERVER['REQUEST_URI'];
        $path = parse_url($path, PHP_URL_PATH);
        return rtrim($path, '/') ?: '/';
    }
    
    private function convertPathToRegex($path) {
        $pattern = preg_replace('/\{([^}]+)\}/', '([^/]+)', $path);
        return '#^' . $pattern . '$#';
    }
    
    private function extractParams($routePath, $matches) {
        $params = [];
        preg_match_all('/\{([^}]+)\}/', $routePath, $paramNames);
        
        for ($i = 1; $i < count($matches); $i++) {
            if (isset($paramNames[1][$i - 1])) {
                $params[$paramNames[1][$i - 1]] = $matches[$i];
            }
        }
        
        return $params;
    }
    
    private function callHandler($handler, $params = []) {
        if (is_callable($handler)) {
            return $handler($params);
        } elseif (is_string($handler) && file_exists($handler)) {
            $_PARAMS = $params;
            include $handler;
            return;
        }
        
        ApiResponse::serverError('Invalid route handler');
    }
}
?>
