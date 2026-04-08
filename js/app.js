document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // DARK/LIGHT MODE
    // ==========================================

    // Text label for light/dark mode toggle
    const modeToggle = document.getElementById("modeToggle");
    const toggleLabel = document.getElementById("toggleLabel");
    const htmlElement = document.documentElement;

    // Apply theme changes
    const applyTheme = (theme) => {
        if (theme === "dark") {
            htmlElement.setAttribute("data-bs-theme", "dark");
            if (toggleLabel) toggleLabel.innerText = "Theme: Dark";
            if (modeToggle) modeToggle.checked = true;
        } else {
            htmlElement.setAttribute("data-bs-theme", "light");
            if (toggleLabel) toggleLabel.innerText = "Theme: Light";
            if (modeToggle) modeToggle.checked = false;
        }
    };

    // Apply theme from current selection
    const savedTheme = localStorage.getItem("taskmaster-theme") || "light";
    applyTheme(savedTheme);

    if (modeToggle) {
        modeToggle.addEventListener("change", () => {
            const newTheme = modeToggle.checked ? "dark" : "light";
            localStorage.setItem("taskmaster-theme", newTheme);
            applyTheme(newTheme);
        });
    }

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

    // --- 2. GLOBAL DATA FETCHING & ANALYTICS ---
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

        // Update UI based on what page we are on
        if (document.getElementById("taskContainer")) {
            renderCourseUI();
            const currentCourse = document.querySelector('.filter-cb:checked')?.value || "All";
            renderTasks(currentCourse);
            renderCalendar();
        }
        
        updateAnalytics();
    }

    // === Analytics Calculator ===
    function updateAnalytics() {
        const progressEl = document.getElementById("analyticsProgress");
        const textEl = document.getElementById("analyticsText");
        const streakEl = document.getElementById("analyticsStreak");

        if (!progressEl || !textEl || !streakEl) return; 

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === "Completed").length;
        const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

        progressEl.style.width = `${completionRate}%`;
        progressEl.innerText = `${completionRate}%`;
        progressEl.className = `progress-bar progress-bar-striped progress-bar-animated ${completionRate === 100 ? 'bg-success' : 'bg-primary'}`;
        
        textEl.innerText = `You have completed ${completedTasks} out of ${totalTasks} tasks this term!`;

        const activeStreak = completedTasks > 0 ? Math.min(completedTasks, 7) : 0; 
        streakEl.innerText = activeStreak;
    }

    // === Mark as Done Function ===
    window.markAsDone = async function(id, event) {
        event.stopPropagation(); 
        
        const { error } = await supabase.from('tasks').update({ status: 'Completed' }).eq('id', id);
        
        if (!error) {
            await fetchAllData(); 
        } else {
            alert("Error updating task: " + error.message);
        }
    };

    fetchAllData();

    // --- 3. TASK MANAGER UI LOGIC ---
    if (document.getElementById("taskContainer")) {
        
        const taskContainer = document.getElementById("taskContainer");
        const filterContainer = document.getElementById("courseFilters");
        const selectContainer = document.getElementById("taskCourseInput");
        
        const detailsModal = new bootstrap.Modal(document.getElementById('taskModal'));
        const formModal = new bootstrap.Modal(document.getElementById('taskFormModal'));
        let currentEditingId = null; 
        let calendarInstance = null;
        
        // NEW STATE: Tracks if we are looking at Pending or Completed tasks
        let activeStatusFilter = "Pending"; 

        // -- Render Dynamic Courses --
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

            selectContainer.innerHTML = "";
            courses.forEach(course => {
                selectContainer.innerHTML += `<option value="${course}">${course}</option>`;
            });
            selectContainer.innerHTML += `<option value="__ADD_NEW__" class="text-success fw-bold">+ Add New Course</option>`;
        }

        // -- Delete / Add Courses --
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

        // -- Render Tasks (Updated with History Filter) --
        window.renderTasks = function(filter = "All") {
            taskContainer.innerHTML = "";
            let filteredTasks = filter === "All" ? tasks : tasks.filter(t => t.course === filter);
            
            // NEW: Only show tasks matching our current tab (Pending vs Completed)
            filteredTasks = filteredTasks.filter(t => t.status === activeStatusFilter);
            
            filteredTasks.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateA - dateB;
            });
            
            // Empty state handler
            if (filteredTasks.length === 0) {
                taskContainer.innerHTML = `<div class="col-12 text-center text-muted py-5"><p>No ${activeStatusFilter.toLowerCase()} tasks found here.</p></div>`;
                return;
            }

            filteredTasks.forEach(task => {
                const statusColor = task.status === "Pending" ? "warning" : "success";
                const priorityColor = task.priority === "High" ? "danger" : task.priority === "Medium" ? "primary" : "info";
                
                const dateTimeDisplay = new Date(`${task.date}T${task.time}`).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
                const imgHtml = task.image ? `<img src="${task.image}" class="task-img" alt="Task Image">` : '';
                
                // If it's completed, show a disabled grey button to look clean in the history tab
                const markDoneBtn = task.status === "Pending" 
                    ? `<button class="btn btn-sm btn-outline-success mt-3 w-100 fw-bold" onclick="markAsDone('${task.id}', event)">✔ Mark as Done</button>` 
                    : `<button class="btn btn-sm btn-secondary mt-3 w-100 fw-bold" disabled>Completed</button>`;

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
                                    ${markDoneBtn}
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

        // -- Modals & Forms --
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

        document.getElementById('btnOpenAddTask').addEventListener('click', () => {
            document.getElementById('taskForm').reset();
            document.getElementById('taskIdInput').value = ""; 
            document.getElementById('existingImageURL').value = ""; 
            document.getElementById('imageHelperText').innerText = ""; 
            document.getElementById('formModalTitle').innerText = "Add New Task";
            formModal.show();
        });

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
                await supabase.from('tasks').update(taskData).eq('id', idInput);
            } else {
                await supabase.from('tasks').insert([taskData]);
            }

            submitBtn.disabled = false;
            submitBtn.innerText = "Save Task";
            formModal.hide();
            await fetchAllData();
        });

        document.getElementById('btnDeleteTask').addEventListener('click', async () => { 
            if(confirm("Are you sure you want to delete this task?")) {
                await supabase.from('tasks').delete().eq('id', currentEditingId);
                detailsModal.hide();
                await fetchAllData();
            }
        });

        // -- View Toggling (Updated with History) --
        const btnListView = document.getElementById("btnListView");
        const btnCalView = document.getElementById("btnCalView");
        const btnHistoryView = document.getElementById("btnHistoryView"); // We will add this to tasks.html next
        const calContainer = document.getElementById("calendarContainer");

        if (btnListView) {
            btnListView.addEventListener("click", () => {
                calContainer.classList.add("d-none");
                taskContainer.classList.remove("d-none");
                
                btnListView.classList.add("active");
                btnCalView.classList.remove("active");
                if (btnHistoryView) btnHistoryView.classList.remove("active");
                
                activeStatusFilter = "Pending";
                const currentCourse = document.querySelector('.filter-cb:checked')?.value || "All";
                renderTasks(currentCourse);
            });
        }

        // -- View Toggling --
        document.getElementById("btnCalView").addEventListener("click", () => {
            document.getElementById("taskContainer").classList.add("d-none");
            document.getElementById("calendarContainer").classList.remove("d-none");
            document.getElementById("btnCalView").classList.add("active");
            document.getElementById("btnListView").classList.remove("active");
            
            // Force Calendar to resize properly
            setTimeout(() => calendarInstance.render(), 10);
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
            const message = document.getElementById("messageBox").value.trim();
            
            // Only block the form IF the message is too short
            if (message.length < 10) {
                e.preventDefault(); // Stop submission
                alert("Message is too short. Please provide more detail.");
            }
            // If it is 10 characters or more, the JS does nothing, 
            // allowing the browser to send the form directly to FormSubmit
        });
    }
});
