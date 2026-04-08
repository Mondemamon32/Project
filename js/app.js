document.addEventListener("DOMContentLoaded", () => {
    try {
    // --- 0. THEME TOGGLE LOGIC ---
    const modeToggle = document.getElementById("modeToggle");
    const toggleLabel = document.getElementById("toggleLabel");
    const htmlElement = document.documentElement;

    function updateToggleText(theme) {
        if (toggleLabel) {
            toggleLabel.innerText = theme === "dark" ? "Dark Mode" : "Light Mode";
        }
    }

    const savedTheme = localStorage.getItem("theme") || localStorage.getItem("taskmaster-theme") || "light";
    htmlElement.setAttribute("data-bs-theme", savedTheme);
    if (modeToggle) {
        modeToggle.checked = savedTheme === "dark";
        updateToggleText(savedTheme);
        
        modeToggle.addEventListener("change", () => {
            const newTheme = modeToggle.checked ? "dark" : "light";
            htmlElement.setAttribute("data-bs-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            localStorage.setItem("taskmaster-theme", newTheme);
            updateToggleText(newTheme);
        });
    }

    // ⚙️ CONFIGURATION & UTILITIES
    const CONFIG = {
        SUPABASE: {
            URL: 'https://pselhaneizlyxrjlwrdi.supabase.co',
            ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZWxoYW5laXpseXhyamx3cmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDIzMzQsImV4cCI6MjA5MDg3ODMzNH0.fY09eWmTfVDboPXWVhyMTxk4PbREAafognPfDjybsMA'
        },
        EMAILJS: {
            SERVICE_ID: "service_zq6e7ni",
            TEMPLATE_ID: "template_tvecg8i",
            PUBLIC_KEY: "vcyaE5fdJT8OJ6vw5",
            TO_EMAIL: 'alfonso_chua@dlsu.edu.ph'
        }
    };

    function sanitizeHTML(str) {
        if (!str) return "";
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    let supabase = null;
    if (window.supabase) {
        supabase = window.supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);
    } else {
        console.error("Supabase SDK missing. Database features disabled.");
    }

    // --- 1. LOGIN / REGISTER LOGIC ---
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm && registerForm) {
        // Initial animation for auth card
        if (window.motion) {
            motion.animate("#authCard", { opacity: [0, 1], y: [20, 0] }, { duration: 0.6, easing: "ease-out" });
        }
        
        // Toggle between Login and Register views
        document.getElementById("showRegister").addEventListener("click", (e) => {
            e.preventDefault();
            if (window.motion) {
                motion.animate("#loginForm", { opacity: 0, x: -20 }, { duration: 0.3 }).finished.then(() => {
                    loginForm.classList.add("d-none");
                    registerForm.classList.remove("d-none");
                    motion.animate("#registerForm", { opacity: [0, 1], x: [20, 0] }, { duration: 0.3 });
                });
            } else {
                loginForm.classList.add("d-none");
                registerForm.classList.remove("d-none");
            }
        });
        
        document.getElementById("showLogin").addEventListener("click", (e) => {
            e.preventDefault();
            if (window.motion) {
                motion.animate("#registerForm", { opacity: 0, x: 20 }, { duration: 0.3 }).finished.then(() => {
                    registerForm.classList.add("d-none");
                    loginForm.classList.remove("d-none");
                    motion.animate("#loginForm", { opacity: [0, 1], x: [-20, 0] }, { duration: 0.3 });
                });
            } else {
                registerForm.classList.add("d-none");
                loginForm.classList.remove("d-none");
            }
        });

        // Handle REAL Registration
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;
            const fullName = document.getElementById("regName").value;
            
            const regBtn = document.getElementById("regBtn");
            regBtn.disabled = true;
            regBtn.innerHTML = `<span>Creating account...</span> <i data-lucide="loader" class="spin"></i>`;
            if (window.lucide) lucide.createIcons();

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
                regBtn.innerHTML = `<span>Create Account</span> <i data-lucide="user-plus" size="18"></i>`;
                if (window.lucide) lucide.createIcons();
            } else {
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
            loginBtn.innerHTML = `<span>Signing in...</span> <i data-lucide="loader" class="spin"></i>`;
            if (window.lucide) lucide.createIcons();

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert("Login failed: " + error.message);
                loginBtn.disabled = false;
                loginBtn.innerHTML = `<span>Sign In</span> <i data-lucide="arrow-right" size="18"></i>`;
                if (window.lucide) lucide.createIcons();
            } else {
                window.location.href = "dashboard.html";
            }
        });
    }

    // --- 2. GLOBAL DATA FETCHING & ANALYTICS ---
    let courses = [];
    let tasks = [];

    async function fetchAllData() {
        if (!supabase) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Display user name if on dashboard
        const userNameDisplay = document.getElementById("userNameDisplay");
        if (userNameDisplay && user.user_metadata?.full_name) {
            userNameDisplay.innerText = user.user_metadata.full_name;
        }

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
        populateDashboard();
    }

    // === Dashboard Populator ===
    function populateDashboard() {
        if (!document.getElementById("dashTotalTasks")) return;

        const pendingTasks = tasks.filter(t => t.status === "Pending");
        const today = new Date().toISOString().split('T')[0];
        const dueToday = pendingTasks.filter(t => t.date === today);
        const completedTasks = tasks.filter(t => t.status === "Completed");
        const completionRate = tasks.length === 0 ? 0 : Math.round((completedTasks.length / tasks.length) * 100);

        document.getElementById("dashTotalTasks").innerText = pendingTasks.length;
        document.getElementById("dashDueToday").innerText = dueToday.length;
        document.getElementById("dashCompletionRate").innerText = completionRate;
        document.getElementById("dashProgressBar").style.width = `${completionRate}%`;
        document.getElementById("dashStreak").innerText = completedTasks.length > 0 ? Math.min(completedTasks.length, 7) : 0;

        // Render Priority Tasks (max 3)
        const priorityContainer = document.getElementById("priorityTasksContainer");
        if (priorityContainer) {
            const highPriority = pendingTasks
                .filter(t => t.priority === "High")
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 3);

            if (highPriority.length > 0) {
                priorityContainer.innerHTML = "";
                highPriority.forEach((task, index) => {
                    const cardHtml = `
                        <div class="col-12">
                            <div class="custom-card p-3 d-flex align-items-center justify-content-between" style="border-left: 4px solid var(--accent-blue);">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="p-2 bg-primary-subtle text-primary rounded-3">
                                        <i data-lucide="alert-circle" size="20"></i>
                                    </div>
                                    <div>
                                        <h6 class="fw-bold m-0">${sanitizeHTML(task.title)}</h6>
                                        <div class="small text-secondary">${sanitizeHTML(task.course)} • Due ${new Date(task.date).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <button class="btn btn-sm btn-primary px-3" onclick="markAsDone('${task.id}', event)">Done</button>
                            </div>
                        </div>
                    `;
                    priorityContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
                if (window.lucide) lucide.createIcons();
                // Animation
                if (window.motion) {
                    motion.animate("#priorityTasksContainer > div", { opacity: [0, 1], y: [10, 0] }, { delay: motion.stagger(0.1) });
                }
            }
        }

        // Summary Card Animations
        if (window.motion) {
            motion.animate("#totalTasksCard, #dueTodayCard, #completionCard", { opacity: [0, 1], scale: [0.95, 1] }, { delay: motion.stagger(0.1), duration: 0.5 });
        }
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

        if (window.motion) {
            motion.animate("#analyticsProgress", { width: ["0%", `${completionRate}%`] }, { duration: 1, easing: "ease-out" });
        }
    }

    // === Mark as Done Function ===
    window.markAsDone = async function(id, event) {
        if (event) event.stopPropagation(); 
        
        const { error } = await supabase.from('tasks').update({ status: 'Completed' }).eq('id', id);
        
        if (!error) {
            await fetchAllData(); 
        } else {
            alert("Error updating task: " + error.message);
        }
    };

    if (supabase) {
        fetchAllData();
    }

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
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 mb-2">
                    <div class="form-check w-100">
                        <input class="form-check-input filter-cb" type="checkbox" value="All" id="courseAll" ${currentChecked === "All" ? "checked" : ""}>
                        <label class="form-check-label fw-medium stretched-link" for="courseAll">All Courses</label>
                    </div>
                </li>`;
            
            courses.forEach(course => {
                const isChecked = currentChecked === course ? "checked" : "";
                filterContainer.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-0 px-0 mb-2">
                        <div class="form-check flex-grow-1">
                            <input class="form-check-input filter-cb" type="checkbox" value="${sanitizeHTML(course)}" id="course-${course}" ${isChecked}>
                            <label class="form-check-label fw-medium stretched-link" for="course-${course}">${sanitizeHTML(course)}</label>
                        </div>
                        <button class="btn btn-sm text-danger opacity-50 hover-opacity-100 border-0 p-0" onclick="deleteCourse('${course}', event)" title="Delete Course" style="position: relative; z-index: 2;">
                            <i data-lucide="x-circle" size="16"></i>
                        </button>
                    </li>`;
            });

            if (window.lucide) lucide.createIcons();

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
                selectContainer.innerHTML += `<option value="${sanitizeHTML(course)}">${sanitizeHTML(course)}</option>`;
            });
            selectContainer.innerHTML += `<option value="__ADD_NEW__" class="text-success fw-bold">+ Add New Course</option>`;
        }

        // -- Delete / Add Courses --
        window.deleteCourse = async function(courseName, event) { 
            event.stopPropagation();
            if(confirm(`CASCADE DELETE: Are you sure you want to delete the course "${courseName}" and ALL tasks associated with it?`)) {
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("User not authenticated");

                    // Delete tasks associated with the course first (explicitly using user_id for RLS)
                    const { error: taskError } = await supabase
                        .from('tasks')
                        .delete()
                        .eq('course', courseName)
                        .eq('user_id', user.id);
                    
                    if (taskError) {
                        console.error("Supabase Task Delete Error:", taskError);
                        alert(`Error deleting tasks: ${taskError.message}`);
                        return;
                    }

                    // Now delete the course itself
                    const { error: courseError } = await supabase
                        .from('courses')
                        .delete()
                        .eq('course_name', courseName)
                        .eq('user_id', user.id);
                    
                    if (!courseError) {
                        await fetchAllData();
                        
                        const checkedCb = document.querySelector('.filter-cb:checked');
                        if(!checkedCb) {
                            const allBtn = document.querySelector('input[value="All"]');
                            if (allBtn) allBtn.checked = true;
                            renderTasks("All");
                        }
                    } else {
                        console.error("Supabase Course Delete Error:", courseError);
                        alert(`Error deleting course: ${courseError.message}`);
                    }
                } catch (err) {
                    console.error("Unexpected Deletion Error:", err);
                    alert("An unexpected error occurred during deletion.");
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

        // -- Render Tasks --
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
                taskContainer.innerHTML = `<div class="col-12 text-center text-secondary py-5 border rounded-4 border-dashed"><p class="m-0">No ${sanitizeHTML(activeStatusFilter.toLowerCase())} tasks found.</p></div>`;
                return;
            }

            filteredTasks.forEach(task => {
                const statusColor = task.status === "Pending" ? "warning" : "success";
                const priorityColor = task.priority === "High" ? "danger" : task.priority === "Medium" ? "primary" : "info";
                
                const dateTimeDisplay = new Date(`${task.date}T${task.time}`).toLocaleString([], {dateStyle: 'medium', timeStyle: 'short'});
                const imgHtml = task.image ? `<img src="${task.image}" class="task-img" alt="Task Image">` : '';
                
                const markDoneBtn = task.status === "Pending" 
                    ? `<button class="btn btn-sm btn-outline-success mt-3 w-100 fw-bold d-flex align-items-center justify-content-center gap-2" onclick="markAsDone('${task.id}', event)"><i data-lucide="check" size="16"></i> Done</button>` 
                    : `<button class="btn btn-sm btn-secondary mt-3 w-100 fw-bold opacity-75 border-0" disabled><i data-lucide="check-circle-2" size="16"></i> Completed</button>`;

                const cardHtml = `
                    <div class="col-md-6 col-xl-4 task-item-wrapper">
                        <div class="custom-card h-100" onclick="openTaskModal('${task.id}')">
                            ${imgHtml}
                            <div class="card-body p-4 d-flex flex-column">
                                <span class="badge bg-primary-subtle text-primary text-uppercase mb-2" style="width: fit-content; font-size: 0.65rem;">${sanitizeHTML(task.course)}</span>
                                <h5 class="fw-bold mb-3">${sanitizeHTML(task.title)}</h5>
                                <div class="d-flex align-items-center gap-2 text-secondary small mb-4">
                                    <i data-lucide="calendar" size="14"></i>
                                    <span>${dateTimeDisplay}</span>
                                </div>
                                <div class="mt-auto">
                                    <div class="d-flex gap-2">
                                        <span class="badge bg-${priorityColor} px-2 py-1" style="font-size: 0.7rem;">${sanitizeHTML(task.priority)}</span>
                                    </div>
                                    ${markDoneBtn}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                taskContainer.insertAdjacentHTML('beforeend', cardHtml);
            });

            if (window.lucide) lucide.createIcons();
            
            // Animation for task list
            if (window.motion) {
                motion.animate(".task-item-wrapper", { opacity: [0, 1], y: [20, 0] }, { delay: motion.stagger(0.05), duration: 0.4 });
            }
        }

        // -- Render Calendar View --
        function renderCalendar() {
            const calendarEl = document.getElementById('calendar');
            if (!calendarEl) return;
            
            const calendarEvents = tasks.map(task => {
                let color = task.priority === "High" ? "#ef4444" : task.priority === "Medium" ? "#0d6efd" : "#06b6d4";
                if (task.status === "Completed") color = "#10b981"; 

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
                const isMobile = window.innerWidth < 768;
                calendarInstance = new FullCalendar.Calendar(calendarEl, {
                    initialView: isMobile ? 'timeGridDay' : 'dayGridMonth',
                    headerToolbar: isMobile ? {
                        left: 'prev,next',
                        center: 'title',
                        right: 'dayGridMonth,timeGridDay'
                    } : {
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    },
                    height: 'auto',
                    defaultTimedEventDuration: '00:00:00',
                    displayEventEnd: false,
                    eventTimeFormat: {
                      hour: 'numeric',
                      minute: '2-digit',
                      meridiem: 'short'
                    },
                    eventContent: function(arg) {
                      let timeText = arg.timeText.toUpperCase();
                      return {
                        html: `<div class="fc-event-main-frame d-flex align-items-center gap-1" style="overflow: hidden; white-space: nowrap;">
                                <div class="fc-daygrid-event-dot" style="border-color: ${arg.borderColor}"></div>
                                <div class="fc-event-title fw-bold" style="font-size: 0.75rem;">${sanitizeHTML(arg.event.title)}</div>
                                <div class="fc-event-time text-secondary opacity-75" style="font-size: 0.7rem;">${timeText}</div>
                              </div>`
                      };
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
            document.getElementById('modalDesc').innerText = task.desc || "No description provided.";
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
            if (window.lucide) lucide.createIcons();
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
            submitBtn.innerText = "Saving...";

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

        // -- View Toggling --
        const btnListView = document.getElementById("btnListView");
        const btnCalView = document.getElementById("btnCalView");
        const btnHistoryView = document.getElementById("btnHistoryView"); 
        const calContainer = document.getElementById("calendarContainer");

        const updateTabUI = (activeBtn) => {
            [btnListView, btnCalView, btnHistoryView].forEach(btn => btn?.classList.remove("active", "btn-primary"));
            [btnListView, btnCalView, btnHistoryView].forEach(btn => btn?.classList.add("btn-outline-primary"));
            activeBtn.classList.remove("btn-outline-primary");
            activeBtn.classList.add("active", "btn-primary");
        };

        if (btnListView) {
            btnListView.addEventListener("click", () => {
                calContainer.classList.add("d-none");
                taskContainer.classList.remove("d-none");
                updateTabUI(btnListView);
                activeStatusFilter = "Pending";
                const currentCourse = document.querySelector('.filter-cb:checked')?.value || "All";
                renderTasks(currentCourse);
            });
        }

        if (btnHistoryView) {
            btnHistoryView.addEventListener("click", () => {
                calContainer.classList.add("d-none");
                taskContainer.classList.remove("d-none");
                updateTabUI(btnHistoryView);
                activeStatusFilter = "Completed";
                const currentCourse = document.querySelector('.filter-cb:checked')?.value || "All";
                renderTasks(currentCourse);
            });
        }

        if (btnCalView) {
            btnCalView.addEventListener("click", () => {
                taskContainer.classList.add("d-none");
                calContainer.classList.remove("d-none");
                updateTabUI(btnCalView);
                setTimeout(() => { if(calendarInstance) calendarInstance.render(); }, 10);
            });
        }
    }

    // --- 4. CONTACT FORM VALIDATION ---
    const contactForm = document.getElementById("contactForm");
    if (contactForm) {
        contactForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const name = contactForm.querySelector('input[placeholder="John Doe"]').value;
            const message = document.getElementById("messageBox").value.trim();

            if (message.length < 10) {
                alert("Message is too short. Please provide more detail.");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span>Sending...</span> <i data-lucide="loader" class="spin"></i>`;
            if (window.lucide) lucide.createIcons();

            try {
                emailjs.init(CONFIG.EMAILJS.PUBLIC_KEY);
                const templateParams = { 
                    from_name: name, 
                    message: message, 
                    to_email: CONFIG.EMAILJS.TO_EMAIL 
                };
                await emailjs.send(CONFIG.EMAILJS.SERVICE_ID, CONFIG.EMAILJS.TEMPLATE_ID, templateParams);
                alert("Message sent successfully! Our team will get back to you.");
                contactForm.reset();
            } catch (error) {
                console.error("EmailJS Error:", error);
                alert("Failed to send message. Please try again later.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<span>Send Message</span> <i data-lucide="send" size="18"></i>`;
                if (window.lucide) lucide.createIcons();
            }
        });
    }
} catch (err) {
    console.error("App Initialization Error:", err);
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
            // allowing the browser to send the form directly to FormSubmit!
        });
    }

});



