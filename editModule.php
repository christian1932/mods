<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

require "../../dbcon.php";

// Ensure request is POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Invalid request method"]);
    exit;
}

// Validate required fields
if (!isset($_POST["module_id"], $_POST["quantity"])) {
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$module_id = $_POST["module_id"];
$stock = $_POST["quantity"];

// Check if image was uploaded
$image_updated = false;
$image_data = null;

if (isset($_FILES["moduleImage"]) && $_FILES["moduleImage"]["error"] == 0) {
    $image_file = $_FILES["moduleImage"];
    
    // Check if file is an image
    $allowed_types = ["image/jpeg", "image/png", "image/gif"];
    if (in_array($image_file["type"], $allowed_types)) {
        // Read the image file
        $image_data = file_get_contents($image_file["tmp_name"]);
        $image_updated = true;
    } else {
        echo json_encode(["success" => false, "message" => "Invalid image format"]);
        exit;
    }
}

// Prepare the SQL statement based on whether an image was uploaded
if ($image_updated) {
    $sql = "UPDATE modules SET Preview=?, Quantity=? WHERE ModuleID=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sii", $image_data, $stock, $module_id);
} else {
    $sql = "UPDATE modules SET Stock=? WHERE ModuleID=?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $stock, $module_id);
}

// Execute the query and check for success
if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Module updated successfully"]);
} else {
    echo json_encode(["success" => false, "message" => "Failed to update module: " . $conn->error]);
}

$stmt->close();
$conn->close();
?>