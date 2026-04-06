document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 🚀 INITIALIZE SUPABASE
    // ==========================================
    const SUPABASE_URL = 'https://pselhaneizlyxrjlwrdi.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZWxoYW5laXpseXhyamx3cmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDIzMzQsImV4cCI6MjA5MDg3ODMzNH0.fY09eWmTfVDboPXWVhyMTxk4PbREAafognPfDjybsMA'; 
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 1. LOGIN / REGISTER LOGIC ---
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

    // --- 2. TASK MANAGER LOGIC (CRUD, Courses, Sorting, Supabase Upload, Calendar) ---
    if (document.getElementById("taskContainer")) {
        
        // Data State
        let courses = [];
        let tasks = [];

        async function fetchAllData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch Courses from Supabase
            const { data: cData } = await supabase.from('courses').select('*').eq('user_id', user.id);
            courses = cData ? cData.map(c => c.course_name) : [];

            // Fetch Tasks from Supabase 
            const { data: tData } = await supabase.from('tasks').select('*').eq('user_id', user.id);
            tasks = tData ? tData.map(t => ({
                id: t.id,
                title: t.title,
                course: t.course,
                date: t.date,
                time: t.time,
                image: t.image,
                priority: t.priority,
                status: t.status,
                desc: t.desc_text 
            })) : [];

            renderCourseUI();
            renderTasks();
            renderCalendar();
        }

        // DOM Elements
        const taskContainer = document.getElementById("taskContainer");
        const filterContainer = document.getElementById("courseFilters");
        const selectContainer = document.getElementById("taskCourseInput");
        
        const detailsModal = new bootstrap.Modal(document.getElementById('taskModal'));
        const formModal = new bootstrap.Modal(document.getElementById('taskFormModal'));
        let currentEditingId = null; 
        let calendarInstance = null;

        // -- Render Dynamic Courses (With Delete Functionality) --
        window.renderCourseUI = function() {
            const checkedCb = document.querySelector('.filter-cb:checked');
            const currentChecked = checkedCb ? checkedCb.value : "All";
            
            filterContainer.innerHTML = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <input class="form-check-input filter-cb" type="checkbox" value="All" ${currentChecked === "All" ? "checked" : ""}> All
                    </div>
                </li>`;
            
            courses.forEach(course => {
                const isChecked = currentChecked === course ? "checked" : "";
                filterContainer.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <input class="form-check-input filter-cb" type="checkbox" value="${course}" ${isChecked}> ${course}
                        </div>
                        <button class="btn btn-sm btn-outline-danger border-0 py-0 px-2" onclick="deleteCourse('${course}', event)" title="Delete Course">×</button>
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

            // Populate Form Dropdown and add "+ Add New Course"
            selectContainer.innerHTML = "";
            courses.forEach(course => {
                selectContainer.innerHTML += `<option value="${course}">${course}</option>`;
            });
            selectContainer.innerHTML += `<option value="__ADD_NEW__" class="text-success fw-bold">+ Add New Course</option>`;
        }

        // -- Delete Course Logic --
        window.deleteCourse = async function(courseName, event) { 
            event.stopPropagation();
            if(confirm(`Are you sure you want to delete the course "${courseName}"?`)) {
                const { error } = await supabase.from('courses').delete().eq('course_name', courseName);
                
                if (!error) {
                    await fetchAllData();
                    const checkedCb = document.querySelector('.filter-cb:checked');
                    if(!checkedCb) {
                        const allBtn = document.querySelector('input[value="All"]');
                        if (allBtn) allBtn.checked = true;
                        renderTasks("All");
                    }
                }
            }
        };

        // -- Add New Course from Sidebar --
        document.getElementById("addCourseForm").addEventListener("submit", async (e) => { 
            e.preventDefault();
            const inputField = document.getElementById("newCourseInput");
            const newCourse = inputField.value.trim().toUpperCase();

            if (newCourse && !courses.includes(newCourse)) {
                const { data: { user } } = await supabase.auth.getUser();
                await supabase.from('courses').insert([{ user_id: user.id, course_name: newCourse }]);
                
                await fetchAllData();
                inputField.value = ""; 
            } else if (courses.includes(newCourse)) {
                alert("Course already exists!");
            }
        });

        // -- Add New Course from Modal Dropdown --
        selectContainer.addEventListener('change', async (e) => { 
            if(e.target.value === "__ADD_NEW__") {
                const newCourse = prompt("Enter the name of the new course:");
                if(newCourse && newCourse.trim() !== "") {
                    const upperCourse = newCourse.trim().toUpperCase();
                    if(!courses.includes(upperCourse)) {
                        const { data: { user } } = await supabase.auth.getUser();
                        await supabase.from('courses').insert([{ user_id: user.id, course_name: upperCourse }]);
                        await fetchAllData(); 
                    }
                    e.target.value = upperCourse; 
                } else {
                    e.target.value = courses[0] || ""; 
                }
            }
        });

        // -- Render Tasks (List View) --
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
                        <div class="card custom-card hover-anim h-100" onclick="openTaskModal('${task.id}')">
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

        // -- Render Calendar View --
        function renderCalendar() {
            const calendarEl = document.getElementById('calendar');
            
            const calendarEvents = tasks.map(task => {
                let color = task.priority === "High" ? "#dc3545" : task.priority === "Medium" ? "#0d6efd" : "#0dcaf0";
                if (task.status === "Completed") color = "#198754"; 

                return {
                    id: task.id,
                    title: task.title,
                    start: `${task.date}T${task.time}`,
                    backgroundColor: color,
                    borderColor: color,
                    extendedProps: { ...task }
                };
            });

            if (calendarInstance) {
                calendarInstance.removeAllEvents();
                calendarInstance.addEventSource(calendarEvents);
            } else {
                calendarInstance = new FullCalendar.Calendar(calendarEl, {
                    initialView: 'dayGridMonth',
                    headerToolbar: {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    events: calendarEvents,
                    eventClick: function(info) {
                        openTaskModal(info.event.extendedProps.id);
                    }
                });
                calendarInstance.render();
            }
        }

        fetchAllData();

        // -- Open Details Modal --
        window.openTaskModal = function(id) {
            currentEditingId = id;
            const task = tasks.find(t => t.id == id);
            
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
            const task = tasks.find(t => t.id == currentEditingId);
            
            document.getElementById('taskIdInput').value = task.id;
            document.getElementById('taskTitleInput').value = task.title;
            document.getElementById('taskCourseInput').value = task.course;
            document.getElementById('taskDateInput').value = task.date;
            document.getElementById('taskTimeInput').value = task.time;
            
            document.getElementById('existingImageURL').value = task.image || "";
            document.getElementById('imageHelperText').innerText = task.image ? "Leave empty to keep existing image." : "";
            document.getElementById('taskImageInput').value = ""; 
            
            document.getElementById('taskPriorityInput').value = task.priority;
            document.getElementById('taskStatusInput').value = task.status;
            document.getElementById('taskDescInput').value = task.desc;
            
            document.getElementById('formModalTitle').innerText = "Edit Task";
            formModal.show();
        });

        // -- Save Task (ASYNC Handle Supabase Upload & Sync Views) --
        document.getElementById('taskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('btnSaveTask');
            submitBtn.disabled = true;
            submitBtn.innerText = "Uploading & Saving...";

            let finalImageUrl = document.getElementById('existingImageURL').value;
            const imageFile = document.getElementById('taskImageInput').files[0];

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}.${fileExt}`;
                const filePath = `uploads/${fileName}`;

                const { data, error } = await supabase.storage
                    .from('task-images')
                    .upload(filePath, imageFile);

                if (error) {
                    alert("Image upload failed: " + error.message);
                    submitBtn.disabled = false;
                    submitBtn.innerText = "Save Task";
                    return; 
                }

                const { data: publicUrlData } = supabase.storage
                    .from('task-images')
                    .getPublicUrl(filePath);

                finalImageUrl = publicUrlData.publicUrl;
            }

            const idInput = document.getElementById('taskIdInput').value;
            const { data: { user } } = await supabase.auth.getUser();
            const taskData = {
                user_id: user.id,
                title: document.getElementById('taskTitleInput').value,
                course: document.getElementById('taskCourseInput').value,
                date: document.getElementById('taskDateInput').value,
                time: document.getElementById('taskTimeInput').value,
                image: finalImageUrl, 
                priority: document.getElementById('taskPriorityInput').value,
                status: document.getElementById('taskStatusInput').value,
                desc_text: document.getElementById('taskDescInput').value, 
            };

            if (idInput) {
                // Update existing row
                await supabase.from('tasks').update(taskData).eq('id', idInput);
            } else {
                // Insert new row
                await supabase.from('tasks').insert([taskData]);
            }

            submitBtn.disabled = false;
            submitBtn.innerText = "Save Task";
            formModal.hide();
            await fetchAllData();
        });

        // -- Delete Task (Sync Views) --
        document.getElementById('btnDeleteTask').addEventListener('click', async () => { 
            if(confirm("Are you sure you want to delete this task?")) {
                await supabase.from('tasks').delete().eq('id', currentEditingId);
                detailsModal.hide();
                await fetchAllData();
            }
        });

        // -- View Toggling --
        document.getElementById("btnCalView").addEventListener("click", () => {
            document.getElementById("taskContainer").classList.add("d-none");
            document.getElementById("calendarContainer").classList.remove("d-none");
            document.getElementById("btnCalView").classList.add("active");
            document.getElementById("btnListView").classList.remove("active");
            
            // Force Calendar to resize properly
            setTimeout(() => { if(calendarInstance) calendarInstance.render(); }, 10);
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