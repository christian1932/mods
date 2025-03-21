// References to UI elements
const departmentFilter = document.getElementById("filter-department");
const searchInput = document.getElementById("searchInput");
const moduleTableBody = document.getElementById("moduleTableBody");
const moduleForm = document.getElementById("moduleForm");
const moduleModal = document.getElementById("moduleModal");
const modalTitle = document.querySelector(".modal-title");
const semesterSelect = document.getElementById("semester");
const departmentSelect = document.getElementById("department");
const courseSelect = document.getElementById("course");
const moduleImageInput = document.getElementById("moduleImage");
const quantityInput = document.getElementById("quantity");
const moduleNameInput = document.getElementById("moduleName");

// Base URL for API endpoints
const API_BASE_URL = "http://localhost/Backend/API/ModulesApi";

let allModules = []; // Store all modules globally
let isEditMode = false;
let currentModuleId = null;

// Modal event listeners
document.getElementById("addModuleBtn").addEventListener("click", function () {
    openAddModal();
});

document.getElementById("closeModuleModal").addEventListener("click", function () {
    closeModal();
});

document.getElementById("cancelModuleBtn").addEventListener("click", function () {
    closeModal();
});



// Close modal when clicking outside
window.onclick = function (event) {
    if (event.target === moduleModal) {
        closeModal();
    }
};

// Load everything when page loads
document.addEventListener("DOMContentLoaded", function () {
    loadModules();
    loadDepartments();
});

// Handle department change to load related courses
departmentSelect.addEventListener("change", function () {
    const departmentId = this.value;
    if (departmentId) {
        loadCourses(departmentId);
    } else {
        courseSelect.innerHTML = '<option value="">Select Course</option>';
    }
});

// Fetch modules from the API
function loadModules() {
    fetch(`${API_BASE_URL}/fetch_module.php`)
        .then(response => response.json())
        .then(data => {
            allModules = data.modules;
            updateModuleTable(allModules);
        })
        .catch(error => console.error("Error fetching Modules:", error));
}

// Load departments for the dropdown
async function loadDepartments() {
    try {
        const response = await fetch("http://localhost/Backend/API/fetch_department.php");
        const data = await response.json();

        if (data.departments) {
            departmentSelect.innerHTML = `<option value="">Select Department</option>`;
            data.departments.forEach((dept) => {
                let option = document.createElement("option");
                option.value = dept.DepartmentID;
                option.textContent = dept.Name;
                departmentSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching departments:", error);
    }
}

// Fetch courses based on the selected department
function loadCourses(departmentID) {
    return fetch(`http://localhost/Backend/API/fetch_course.php?departmentID=${departmentID}`)
        .then(response => response.json())
        .then(data => {
            courseSelect.innerHTML = `<option value="">Select Course</option>`;
            if (data.success && data.courses.length > 0) {
                data.courses.forEach(course => {
                    let option = document.createElement("option");
                    option.value = course.CourseID;
                    option.textContent = course.CourseName;
                    courseSelect.appendChild(option);
                });
            } else {
                courseSelect.innerHTML = `<option value="">No courses available</option>`;
            }
        })
        .catch(error => console.error("Error fetching courses:", error));
}


// Function to update the table based on filters
function updateModuleTable(modules) {
    moduleTableBody.innerHTML = "";
    if (modules.length === 0) {
        moduleTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center">No modules found</td></tr>`;
        return;
    }

    modules.forEach((module) => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${module.ID}</td>
            <td>${module.Preview ? `<img src="data:image/jpeg;base64,${module.Preview}" width="50" height="50">` : "No Image"}</td>
            <td>${module.Name}</td>
            <td>${module.Semester}</td>
            <td>${module.Department}</td>
            <td>${module.Course || "N/A"}</td>
            <td>${module.Stock}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${module.ID}">Edit</button>
                <button class="action-btn delete-btn" data-id="${module.ID}">Delete</button>
            </td>
        `;

        moduleTableBody.appendChild(row);

        row.querySelector(".edit-btn").addEventListener("click", function () {
            openEditModal(module.ID);
        });

        row.querySelector(".delete-btn").addEventListener("click", function () {
            if (confirm("Are you sure you want to delete this module?")) {
                deleteModule(module.ID);
            }
        });
    });
}

// Function to open the add modal
function openAddModal() {
    moduleForm.reset();
    modalTitle.textContent = "Add New Module";
    isEditMode = false;
    currentModuleId = null;
    
    // Enable all fields for adding a new module
    moduleNameInput.disabled = false;
    semesterSelect.disabled = false;
    departmentSelect.disabled = false;
    courseSelect.disabled = false;
    
    moduleModal.style.display = "block";
}

// Function to open the edit modal
function openEditModal(moduleId) {
    const module = allModules.find((u) => u.ID == moduleId);
    if (!module) {
        alert("Module not found");
        return;
    }

    // Set all fields but make non-editable ones disabled
    moduleNameInput.value = module.Name || "";
    moduleNameInput.disabled = true;
    
    departmentSelect.value = module.DepartmentID || "";
    departmentSelect.disabled = true;

    semesterSelect.value = module.Semester || "";
    semesterSelect.disabled = true;

    // Load courses dynamically before setting course value
    loadCourses(module.DepartmentID).then(() => {
        courseSelect.value = module.CourseID || "";
        courseSelect.disabled = true;
    });

    // Only enable stock quantity for editing
    quantityInput.value = module.Stock || 0;
    quantityInput.disabled = false;
    
    // Image is always editable
    moduleImageInput.disabled = false;

    modalTitle.textContent = "Edit Module";
    isEditMode = true;
    currentModuleId = moduleId;

    moduleModal.style.display = "block";
}

// Close modal function
function closeModal() {
    moduleModal.style.display = "none";
}

// Handle form submission for add/edit
moduleForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const formData = new FormData(this);

    if (isEditMode && currentModuleId) {
        // For edit mode, create a new FormData with only the allowed fields
        const editFormData = new FormData();
        
        // Add only the ID, image, and quantity to the form data
        editFormData.append("module_id", currentModuleId);
        
        // Add image if provided
        if (moduleImageInput.files[0]) {
            editFormData.append("moduleImage", moduleImageInput.files[0]);
        }
        
        // Add quantity
        editFormData.append("quantity", quantityInput.value);
        
        // Add the original values for other fields that shouldn't be changed
        const module = allModules.find((u) => u.ID == currentModuleId);
        editFormData.append("moduleName", module.Name);
        editFormData.append("semester", module.Semester);
        editFormData.append("department", module.DepartmentID);
        editFormData.append("course", module.CourseID || "");

        fetch(`${API_BASE_URL}/editModule.php`, {
            method: "POST",
            body: editFormData,
        })
        .then(response => response.json())
        .then((data) => {
            if (data.success) {
                alert("Module updated successfully!");
                closeModal();
                loadModules();
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch((error) => console.error("Error updating module:", error));

    } else {
        // Adding a new module - use all form data
        fetch(`${API_BASE_URL}/addModule.php`, {
            method: "POST",
            body: formData,
        })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                alert("Module added successfully!");
                closeModal();
                loadModules();
            } else {
                alert("Error: " + data.message);
            }
        })
        .catch((error) => console.error("Error adding module:", error));
    }
});

// Function to delete a module
function deleteModule(moduleId) {
    console.log("Deleting module ID:", moduleId); // Debugging line

    fetch(`${API_BASE_URL}/deleteModule.php`, {
        method: "POST",
        body: JSON.stringify({ id: moduleId }),
        headers: { "Content-Type": "application/json" }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Delete response:", data); // Debugging response
        if (data.success) {
            alert("Module deleted successfully");
            loadModules();
        } else {
            alert("Error: " + data.message);
        }
    })
    .catch(error => console.error("Error deleting module:", error));
}

// Event Listeners for filtering
departmentFilter.addEventListener("change", () => updateModuleTable(allModules));
searchInput.addEventListener("input", () => updateModuleTable(allModules));