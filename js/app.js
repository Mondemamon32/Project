document.addEventListener("DOMContentLoaded", () => {
    
    // ==========================================
    // 🚀 INITIALIZE SUPABASE
    // ==========================================
    const SUPABASE_URL = 'https://pselhaneizlyxrjlwrdi.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzZWxoYW5laXpseXhyamx3cmRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDIzMzQsImV4cCI6MjA5MDg3ODMzNH0.fY09eWmTfVDboPXWVhyMTxk4PbREAafognPfDjybsMA'; 
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- 1. AUTH LOGIC ---
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm && registerForm) {
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

        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("regEmail").value;
            const password = document.getElementById("regPassword").value;
            const fullName = document.getElementById("regName").value;
            const regBtn = document.getElementById("regBtn");
            
            regBtn.disabled = true;
            regBtn.innerText = "Creating account...";

            const { error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: { data: { full_name: fullName } }
            });

            if (error) {
                alert("Registration failed: " + error.message);
                regBtn.disabled = false;
                regBtn.innerText = "Register";
            } else {
                alert("Account created! Check your email for verification if required.");
                window.location.href = "dashboard.html";
            }
        });

        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("loginEmail").value;
            const password = document.getElementById("loginPassword").value;
            const loginBtn = document.getElementById("loginBtn");
            
            loginBtn.disabled = true;
            loginBtn.innerText = "Signing in...";

            const { error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                alert("Login failed: " + error.message);
                loginBtn.disabled = false;
                loginBtn.innerText = "Login";
            } else {
                window.location.href = "dashboard.html";
            }
        });
    }

    // --- 2. TASK & COURSE MANAGER (DATABASE INTEGRATED) ---
    if (document.getElementById("taskContainer")) {
        
        // Blank state for new users
        let courses = []; 
        let tasks = [];
        let currentUser = null;

        const taskContainer = document.getElementById("taskContainer");
        const filterContainer = document.getElementById("courseFilters");
        const selectContainer = document.getElementById("taskCourseInput");
        const detailsModal = new bootstrap.Modal(document.getElementById('taskModal'));
        const formModal = new bootstrap.Modal(document.getElementById('taskFormModal'));
        
        let currentEditingId = null; 
        let calendarInstance = null;

        // FETCH DATA FROM DATABASE
        async function loadUserData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                window.location.href = "index.html";
                return;
            }
            currentUser = user;

            // Load Courses
            const { data: dbCourses } = await supabase.from('courses').select('name').eq('user_id', user.id);
            courses = dbCourses ? dbCourses.map(c => c.name) : [];

            // Load Tasks
            const { data: dbTasks } = await supabase.from('tasks').select('*').eq('user_id', user.id);
            tasks = dbTasks || [];

            renderCourseUI();
            renderTasks();
            renderCalendar();
            updateAnalytics(); // Update numbers from 0
        }

        // RENDER COURSES
        window.renderCourseUI = function() {
            const checkedCb = document.querySelector('.filter-cb:checked');
            const currentChecked = checkedCb ? checkedCb.value : "All";
            
            filterContainer.innerHTML = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div><input class="form-check-input filter-cb" type="checkbox" value="All" ${currentChecked === "All" ? "checked" : ""}> All</div>
                </li>`;
            
            courses.forEach(course => {
                filterContainer.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div><input class="form-check-input filter-cb" type="checkbox" value="${course}" ${currentChecked === course ? "checked" : ""}> ${course}</div>
                        <button class="btn btn-sm btn-outline-danger border-0 py-0 px-2" onclick="deleteCourse('${course}', event)">×</button>
                    </li>`;
            });

            document.querySelectorAll('.filter-cb').forEach(cb => {
                cb.addEventListener('change', (e) => {
                    document.querySelectorAll('.filter-cb').forEach(box => box.checked = false); 
                    e.target.checked = true;
                    renderTasks(e.target.value);
                });
            });

            selectContainer.innerHTML = courses.map(c => `<option value="${c}">${c}</option>`).join("");
            selectContainer.innerHTML += `<option value="__ADD_NEW__" class="text-success fw-bold">+ Add New Course</option>`;
        }

        // DELETE COURSE
        window.deleteCourse = async function(courseName, event) {
            event.stopPropagation();
            if(confirm(`Delete "${courseName}"? This won't delete tasks but unassigns them.`)) {
                await supabase.from('courses').delete().eq('user_id', currentUser.id).eq('name', courseName);
                courses = courses.filter(c => c !== courseName);
                renderCourseUI();
                renderTasks("All");
            }
        };

        // ADD COURSE
        document.getElementById("addCourseForm").addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = document.getElementById("newCourseInput");
            const name = input.value.trim().toUpperCase();

            if (name && !courses.includes(name)) {
                const { error } = await supabase.from('courses').insert([{ user_id: currentUser.id, name: name }]);
                if (!error) {
                    courses.push(name);
                    renderCourseUI();
                    input.value = "";
                }
            }
        });

        // RENDER TASKS (WITH RED OVERDUE LOGIC)
        function renderTasks(filter = "All") {
            taskContainer.innerHTML = "";
            let filtered = filter === "All" ? tasks : tasks.filter(t => t.course === filter);
            
            const now = new Date();

            filtered.forEach(task => {
                const taskDeadline = new Date(`${task.date}T${task.time}`);
                const isOverdue = taskDeadline < now && task.status !== "Completed";

                const cardClass = isOverdue ? "border-danger bg-danger-subtle shadow" : "custom-card";
                const badgeClass = isOverdue ? "bg-danger" : (task.status === "Pending" ? "bg-warning" : "bg-success");

                const cardHtml = `
                    <div class="col-md-6 col-lg-4">
                        <div class="card ${cardClass} hover-anim h-100" onclick="openTaskModal(${task.id})">
                            ${task.image ? `<img src="${task.image}" class="task-img">` : ''}
                            <div class="card-body">
                                <h5 class="fw-bold">${task.title} ${isOverdue ? "⚠️" : ""}</h5>
                                <h6 class="text-muted">${task.course}</h6>
                                <div class="small">📅 ${new Date(`${task.date}T${task.time}`).toLocaleString()}</div>
                                <div class="mt-2">
                                    <span class="badge ${badgeClass}">${isOverdue ? "OVERDUE" : task.status}</span>
                                    <span class="badge bg-secondary">${task.priority}</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
                taskContainer.insertAdjacentHTML('beforeend', cardHtml);
            });
            updateAnalytics();
        }

        // SAVE TASK
        document.getElementById('taskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('btnSaveTask');
            submitBtn.disabled = true;

            let finalImageUrl = document.getElementById('existingImageURL').value;
            const file = document.getElementById('taskImageInput').files[0];

            if (file) {
                const path = `uploads/${currentUser.id}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage.from('task-images').upload(path, file);
                if (!uploadError) {
                    const { data } = supabase.storage.from('task-images').getPublicUrl(path);
                    finalImageUrl = data.publicUrl;
                }
            }

            const idInput = document.getElementById('taskIdInput').value;
            const taskObj = {
                user_id: currentUser.id,
                title: document.getElementById('taskTitleInput').value,
                course: document.getElementById('taskCourseInput').value,
                date: document.getElementById('taskDateInput').value,
                time: document.getElementById('taskTimeInput').value,
                image: finalImageUrl,
                priority: document.getElementById('taskPriorityInput').value,
                status: document.getElementById('taskStatusInput').value,
                desc: document.getElementById('taskDescInput').value
            };

            if (idInput) {
                await supabase.from('tasks').update(taskObj).eq('id', idInput);
            } else {
                const { data } = await supabase.from('tasks').insert([taskObj]).select();
                if (data) tasks.push(data[0]);
            }

            formModal.hide();
            await loadUserData(); // Refresh local state
            submitBtn.disabled = false;
        });

        // DELETE TASK
        document.getElementById('btnDeleteTask').addEventListener('click', async () => {
            if(confirm("Delete this task?")) {
                await supabase.from('tasks').delete().eq('id', currentEditingId);
                detailsModal.hide();
                await loadUserData();
            }
        });

        // DEFAULT DATE TO TODAY
        document.getElementById('btnOpenAddTask').addEventListener('click', () => {
            document.getElementById('taskForm').reset();
            document.getElementById('taskIdInput').value = ""; 
            document.getElementById('taskDateInput').value = new Date().toISOString().split('T')[0];
            formModal.show();
        });

        // --- 3. ANALYTICS LOGIC (DYNAMIC FROM 0) ---
        function updateAnalytics() {
            const total = tasks.length;
            const completed = tasks.filter(t => t.status === "Completed").length;
            const pending = total - completed;
            const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

            // If these IDs exist on your dashboard/analytics page, they will update
            if(document.getElementById("statTotalTasks")) document.getElementById("statTotalTasks").innerText = total;
            if(document.getElementById("statCompletedTasks")) document.getElementById("statCompletedTasks").innerText = completed;
            if(document.getElementById("statPendingTasks")) document.getElementById("statPendingTasks").innerText = pending;
            if(document.getElementById("statCompletionRate")) document.getElementById("statCompletionRate").innerText = completionRate + "%";
        }

        // Initialize
        loadUserData();
    }
});