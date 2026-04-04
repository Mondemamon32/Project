document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 🚀 INITIALIZE SUPABASE
    // ==========================================
    const SUPABASE_URL = 'https://pselhaneizlyxrjlwrdi.supabase.co'; // <-- PASTE YOUR URL
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZWxoYW5laXpseXhyamx3cmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDIzMzQsImV4cCI6MjA5MDg3ODMzNH0.fY09eWmTfVDboPXWVhyMTxk4PbREAafognPfDjybsMA'; // <-- PASTE YOUR KEY
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 1. LOGIN / REGISTER LOGIC (NOW USING SUPABASE AUTH) ---
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm && registerForm) {
        
        // Toggle between Login and Register views
        document.getElementById("showRegister").addEventListener("click", (e) => {
            e.preventDefault();
            loginForm.classList.add("d-none");
            registerForm.classList.remove("d-none");
        });
        
        document.getElementById("showLogin").addEventListener("click", (e) => {
            e.preventDefault();
            registerForm.classList.add("d-none");
            loginForm.classList.remove("d-none");
        });

        // Handle REAL Registration
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;
            const fullName = document.getElementById("regName").value;
            
            const regBtn = document.getElementById("regBtn");
            regBtn.disabled = true;
            regBtn.innerText = "Creating account...";

            // Send data to Supabase Database
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (error) {
                alert("Registration failed: " + error.message);
                regBtn.disabled = false;
                regBtn.innerText = "Register";
            } else {
                alert("Account created successfully!");
                window.location.href = "dashboard.html";
            }
        });

        // Handle REAL Login
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;
            
            const loginBtn = document.getElementById("loginBtn");
            loginBtn.disabled = true;
            loginBtn.innerText = "Signing in...";

            // Verify with Supabase Database
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert("Login failed: " + error.message);
                loginBtn.disabled = false;
                loginBtn.innerText = "Login";
            } else {
                window.location.href = "dashboard.html";
            }
        });
    }

    // --- 2. TASK MANAGER LOGIC (CRUD, Courses, Sorting, Supabase Upload) ---
    if (document.getElementById("taskContainer")) {
        
        // Data State
        let courses = ["LBYCPG3", "MATH101"];
        
        let tasks = [
            { id: 1, title: "Finish HTML Lab", course: "LBYCPG3", desc: "Complete 5 HTML pages and CSS styling.", priority: "High", status: "Pending", date: "2026-04-10", time: "23:59", image: "https://images.unsplash.com/photo-1618477247222-ac60ceb3a5a4?auto=format&fit=crop&w=400&q=80" },
            { id: 2, title: "Calculus Homework", course: "MATH101", desc: "Derivatives chapter 4 review sheet.", priority: "Medium", status: "Pending", date: "2026-04-06", time: "14:00", image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=400&q=80" }
        ];

        // DOM Elements
        const taskContainer = document.getElementById("taskContainer");
        const filterContainer = document.getElementById("courseFilters");
        const selectContainer = document.getElementById("taskCourseInput");
        
        const detailsModal = new bootstrap.Modal(document.getElementById('taskModal'));
        const formModal = new bootstrap.Modal(document.getElementById('taskFormModal'));
        let currentEditingId = null; 

        // -- Render Dynamic Courses --
        function renderCourseUI() {
            const checkedCb = document.querySelector('.filter-cb:checked');
            const currentChecked = checkedCb ? checkedCb.value : "All";
            
            filterContainer.innerHTML = `
                <li class="list-group-item">
                    <input class="form-check-input filter-cb" type="checkbox" value="All" ${currentChecked === "All" ? "checked" : ""}> All
                </li>`;
            
            courses.forEach(course => {
                const isChecked = currentChecked === course ? "checked" : "";
                filterContainer.innerHTML += `
                    <li class="list-group-item">
                        <input class="form-check-input filter-cb" type="checkbox" value="${course}" ${isChecked}> ${course}
                    </li>`;
            });

            const checkboxes = document.querySelectorAll('.filter-cb');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', (e) => {
                    checkboxes.forEach(box => box.checked = false); 
                    e.target.checked = true;
                    renderTasks(e.target.value);
                });
            });

            selectContainer.innerHTML = "";
            courses.forEach(course => {
                selectContainer.innerHTML += `<option value="${course}">${course}</option>`;
            });
        }

        // -- Add New Course --
        document.getElementById("addCourseForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const inputField = document.getElementById("newCourseInput");
            const newCourse = inputField.value.trim().toUpperCase();

            if (newCourse && !courses.includes(newCourse)) {
                courses.push(newCourse);
                renderCourseUI(); 
                inputField.value = ""; 
            } else if (courses.includes(newCourse)) {
                alert("Course already exists!");
            }
        });

        // -- Render Tasks --
        function renderTasks(filter = "All") {
            taskContainer.innerHTML = "";
            let filteredTasks = filter === "All" ? tasks : tasks.filter(t => t.course === filter);
            
            // Sort by Date and Time (Closest deadline first)
            filteredTasks.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            });
            
            filteredTasks.forEach(task => {
                const statusColor = task.status === "Pending" ? "warning" : "success";
                const priorityColor = task.priority === "High" ? "danger" : task.priority === "Medium" ? "primary" : "info";
                
                const dateTimeDisplay = new Date(`${task.date}T${task.time}`).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
                const imgHtml = task.image ? `<img src="${task.image}" class="task-img" alt="Task Image">` : '';

                const cardHtml = `
                    <div class="col-md-6 col-lg-4">
                        <div class="card custom-card hover-anim h-100" onclick="openTaskModal(${task.id})">
                            ${imgHtml}
                            <div class="card-body task-card-body">
                                <h5 class="card-title fw-bold">${task.title}</h5>
                                <h6 class="card-subtitle mb-1 text-muted">${task.course}</h6>
                                <div class="task-meta">📅 ${dateTimeDisplay}</div>
                                <div class="mt-auto">
                                    <span class="badge bg-${statusColor}">${task.status}</span>
                                    <span class="badge bg-${priorityColor}">${task.priority} Priority</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                taskContainer.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        // Initialize UI
        renderCourseUI();
        renderTasks();

        // -- Open Details Modal --
        window.openTaskModal = function(id) {
            currentEditingId = id;
            const task = tasks.find(t => t.id === id);
            
            document.getElementById('modalTitle').innerText = task.title;
            document.getElementById('modalCourse').innerText = task.course;
            document.getElementById('modalDateTime').innerText = new Date(`${task.date}T${task.time}`).toLocaleString([], {dateStyle: 'full', timeStyle: 'short'});
            document.getElementById('modalDesc').innerText = task.desc;
            document.getElementById('modalPriority').innerText = task.priority;
            document.getElementById('modalStatus').innerText = task.status;
            
            const modalImg = document.getElementById('modalImage');
            if(task.image) {
                modalImg.src = task.image;
                modalImg.classList.remove('d-none');
            } else {
                modalImg.classList.add('d-none');
            }

            detailsModal.show();
        };

        // -- Open Add Task Form --
        document.getElementById('btnOpenAddTask').addEventListener('click', () => {
            document.getElementById('taskForm').reset();
            document.getElementById('taskIdInput').value = ""; 
            document.getElementById('existingImageURL').value = ""; 
            document.getElementById('imageHelperText').innerText = ""; 
            document.getElementById('formModalTitle').innerText = "Add New Task";
            formModal.show();
        });

        // -- Open Edit Task Form --
        document.getElementById('btnEditTask').addEventListener('click', () => {
            detailsModal.hide();
            const task = tasks.find(t => t.id === currentEditingId);
            
            document.getElementById('taskIdInput').value = task.id;
            document.getElementById('taskTitleInput').value = task.title;
            document.getElementById('taskCourseInput').value = task.course;
            document.getElementById('taskDateInput').value = task.date;
            document.getElementById('taskTimeInput').value = task.time;
            
            // Handle existing image mapping
            document.getElementById('existingImageURL').value = task.image || "";
            document.getElementById('imageHelperText').innerText = task.image ? "Leave empty to keep existing image." : "";
            document.getElementById('taskImageInput').value = ""; // Clear file input
            
            document.getElementById('taskPriorityInput').value = task.priority;
            document.getElementById('taskStatusInput').value = task.status;
            document.getElementById('taskDescInput').value = task.desc;
            
            document.getElementById('formModalTitle').innerText = "Edit Task";
            formModal.show();
        });

        // -- Save Task (ASYNC Handle Supabase Upload) --
        document.getElementById('taskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('btnSaveTask');
            submitBtn.disabled = true;
            submitBtn.innerText = "Uploading & Saving...";

            let finalImageUrl = document.getElementById('existingImageURL').value;
            const imageFile = document.getElementById('taskImageInput').files[0];

            // 1. If user selected a new file, upload to Supabase
            if (imageFile) {
                // Generate a unique filename using timestamp
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `uploads/${fileName}`;

                // Upload to Supabase 'task-images' bucket
                const { data, error } = await supabase.storage
                    .from('task-images')
                    .upload(filePath, imageFile);

                if (error) {
                    alert("Image upload failed: " + error.message);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Save Task";
                    return; // Stop execution if upload fails
                }

                // Get the public URL to display it in the app
                const { data: publicUrlData } = supabase.storage
                    .from('task-images')
                    .getPublicUrl(filePath);

                finalImageUrl = publicUrlData.publicUrl;
            }

            // 2. Save the task data locally
            const idInput = document.getElementById('taskIdInput').value;
            const newTask = {
                id: idInput ? parseInt(idInput) : Date.now(), 
                title: document.getElementById('taskTitleInput').value,
                course: document.getElementById('taskCourseInput').value,
                date: document.getElementById('taskDateInput').value,
                time: document.getElementById('taskTimeInput').value,
                image: finalImageUrl, // Use uploaded URL or existing URL
                priority: document.getElementById('taskPriorityInput').value,
                status: document.getElementById('taskStatusInput').value,
                desc: document.getElementById('taskDescInput').value,
            };

            if (idInput) {
                const index = tasks.findIndex(t => t.id === parseInt(idInput));
                tasks[index] = newTask;
            } else {
                tasks.push(newTask);
            }

            // 3. Reset form and UI
            submitBtn.disabled = false;
            submitBtn.innerText = "Save Task";
            formModal.hide();
            
            const checkedCb = document.querySelector('.filter-cb:checked');
            renderTasks(checkedCb ? checkedCb.value : "All");
        });

        // -- Delete Task --
        document.getElementById('btnDeleteTask').addEventListener('click', () => {
            if(confirm("Are you sure you want to delete this task?")) {
                tasks = tasks.filter(t => t.id !== currentEditingId);
                detailsModal.hide();
                
                const checkedCb = document.querySelector('.filter-cb:checked');
                renderTasks(checkedCb ? checkedCb.value : "All");
            }
        });

        // -- View Toggling --
        document.getElementById("btnCalView").addEventListener("click", () => {
            document.getElementById("taskContainer").classList.add("d-none");
            document.getElementById("calendarContainer").classList.remove("d-none");
            document.getElementById("btnCalView").classList.add("active");
            document.getElementById("btnListView").classList.remove("active");
        });

        document.getElementById("btnListView").addEventListener("click", () => {
            document.getElementById("calendarContainer").classList.add("d-none");
            document.getElementById("taskContainer").classList.remove("d-none");
            document.getElementById("btnListView").classList.add("active");
            document.getElementById("btnCalView").classList.remove("active");
        });
    }

    // --- 3. CONTACT FORM VALIDATION ---
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const message = document.getElementById("messageBox").value.trim();
            if (message.length < 10) {
                alert("Message is too short. Please provide more detail.");
            } else {
                alert("Message sent successfully! Our team will get back to you.");
                contactForm.reset();
            }
        });
    }
});