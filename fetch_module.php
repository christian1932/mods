<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, PUT, GET, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

require "../../dbcon.php";

$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database connection failed"]);
    exit;
}

// Handle different request types
$request_method = $_SERVER['REQUEST_METHOD'];

// For preflight requests
if ($request_method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Fetch modules
if ($request_method === 'GET') {
    $sql = "SELECT 
            m.ModuleID AS ID,
            m.Preview,   
            m.Title, 
            m.Semester,
            d.Name AS Department, 
            c.CourseName AS Course,  
            m.Quantity AS Stock,
            m.DepartmentID,
            m.CourseID
        FROM modules m
        LEFT JOIN department d ON m.DepartmentID = d.DepartmentID
        LEFT JOIN course c ON m.CourseID = c.CourseID AND c.DepartmentID = d.DepartmentID";

    $result = $conn->query($sql);

    $modules = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            // Convert BLOB image to Base64
            if (!empty($row['Preview'])) {
                $row['Preview'] = base64_encode($row['Preview']);
            } else {
                $row['Preview'] = null; // If no image, return null
            }

            $modules[] = $row;
        }
    }

    // Send JSON response
    echo json_encode(["success" => true, "modules" => $modules]);
    exit;
}

// Add or update modules
if ($request_method === 'POST') {
    // Get mode safely
    $mode = isset($_POST['mode']) ? $_POST['mode'] : null;

    if (!$mode) {
        echo json_encode(["success" => false, "message" => "Mode is required"]);
        exit;
    }

    // Validate required fields
    if (empty($_POST['moduleName']) || empty($_POST['department']) || empty($_POST['quantity'])) {
        echo json_encode(["success" => false, "message" => "Required fields are missing"]);
        exit;
    }

    $moduleName = trim($_POST['moduleName']);
    $semester = trim($_POST['semester']);
    $departmentId = intval($_POST['department']);
    $quantity = intval($_POST['quantity']);
    $courseId = !empty($_POST['course']) ? intval($_POST['course']) : null;

    // Start transaction
    $conn->begin_transaction();

    try {
        if ($mode === 'add') {
            // Check for image upload
            if (!isset($_FILES['moduleImage']) || $_FILES['moduleImage']['error'] != 0) {
                throw new Exception("Image upload is required for new modules");
            }

            // Process image
            $imageData = file_get_contents($_FILES['moduleImage']['tmp_name']);

            // Insert new module
            $sql = "INSERT INTO modules (Preview, Title, Semester, Quantity, DepartmentID, CourseID) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param("siiib", $imageData, $moduleName, $semester, $quantity, $departmentId, $courseId);
            $stmt->send_long_data(4, $imageData);

        } elseif ($mode === 'edit') {
            if (empty($_POST['id'])) {
                throw new Exception("Module ID is required for editing");
            }

            $moduleId = intval($_POST['id']);

            // Check if image was uploaded for update
            if (isset($_FILES['moduleImage']) && $_FILES['moduleImage']['error'] == 0) {
                $imageData = file_get_contents($_FILES['moduleImage']['tmp_name']);
                $sql = "UPDATE modules SET 
                        Preview = ?,
                        Title = ?,
                        Semester = ?,  
                        Quantity = ?, 
                        DepartmentID = ?, 
                        CourseID = ? 
                        WHERE ModuleID = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("siibi", $imageData, $moduleName, $semester, $quantity, $departmentId, $courseId, $moduleId);
                $stmt->send_long_data(4, $imageData);
            } else {
                $sql = "UPDATE modules SET 
                        Title = ?,
                        Semester = ?, 
                        Quantity = ?, 
                        DepartmentID = ?, 
                        CourseID = ? 
                        WHERE ModuleID = ?";
                $stmt = $conn->prepare($sql);
                $stmt->bind_param("siiii", $moduleName, $semester, $quantity, $departmentId, $courseId, $moduleId);
            }
        } else {
            throw new Exception("Invalid mode specified");
        }

        if (!$stmt->execute()) {
            throw new Exception("Database error: " . $stmt->error);
        }

        $conn->commit();

        echo json_encode([
            "success" => true, 
            "message" => ($mode === 'add') ? "Module added successfully" : "Module updated successfully"
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        echo json_encode(["success" => false, "message" => $e->getMessage()]);
    }
}

$conn->close();
?>