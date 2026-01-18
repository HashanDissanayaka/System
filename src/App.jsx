import React, { useState, useEffect } from 'react';
import { modulesData } from './data/modulesData';
import { supabase, isSupabaseConfigured } from './supabaseClient';

function App() {
    const [view, setView] = useState('login'); // 'login', 'register', 'dashboard', 'module-detail'
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    // Login state
    const [loginCode, setLoginCode] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [foundStudent, setFoundStudent] = useState(null);

    // Registration state
    const [regName, setRegName] = useState('');
    const [regSchool, setRegSchool] = useState('');
    const [regCode, setRegCode] = useState('');
    const [regGrade, setRegGrade] = useState('6');
    const [regPassword, setRegPassword] = useState('');

    // Module detail state
    const [currentModule, setCurrentModule] = useState(null);
    const [moduleView, setModuleView] = useState('overview'); // 'overview', 'content', 'quiz', 'papers'

    // Quiz state
    const [quizActive, setQuizActive] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(0);
    const [attempts, setAttempts] = useState({});
    const [modules, setModules] = useState([]);
    const [activeQuiz, setActiveQuiz] = useState(null);
    const [activePapers, setActivePapers] = useState([]);

    useEffect(() => {
        let timer;
        if (quizActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && quizActive) {
            finishQuiz();
        }
        return () => clearInterval(timer);
    }, [quizActive, timeLeft]);

    // Fetch Modules from Supabase
    useEffect(() => {
        const fetchModules = async () => {
            if (user && isSupabaseConfigured) {
                const { data, error } = await supabase
                    .from('modules')
                    .select('*')
                    .eq('grade', user.grade);
                if (data) setModules(data);
            }
        };
        fetchModules();
    }, [user]);

    // Dynamic Login Lookup
    useEffect(() => {
        const lookupStudent = async () => {
            if (loginCode.trim().length >= 3) {
                try {
                    const { data, error } = await supabase
                        .from('students')
                        .select('fullname, grade, role')
                        .eq('student_code', loginCode.trim())
                        .maybeSingle();

                    if (data) {
                        setFoundStudent(data);
                    } else {
                        setFoundStudent(null);
                    }
                } catch (err) {
                    console.error('Lookup error:', err);
                }
            } else {
                setFoundStudent(null);
            }
        };

        const timer = setTimeout(lookupStudent, 500);
        return () => clearTimeout(timer);
    }, [loginCode]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .eq('student_code', loginCode.trim())
                .eq('password', loginPassword)
                .maybeSingle();

            if (data) {
                if (data.status === 'disabled') {
                    alert('Your account has been disabled by the admin.');
                } else if (data.status === 'pending') {
                    alert('Your registration is pending approval. Please contact the administrator.');
                } else {
                    setUser(data);
                    if (data.role === 'admin') {
                        setView('admin-dashboard');
                    } else {
                        setView('dashboard');
                    }

                    // Fetch attempts
                    const { data: attemptsData } = await supabase
                        .from('quiz_attempts')
                        .select('module_id, count')
                        .eq('student_id', data.id);

                    const attemptMap = {};
                    attemptsData?.forEach(a => attemptMap[a.module_id] = a.count);
                    setAttempts(attemptMap);
                }
            } else {
                alert('Invalid student code or password!');
            }
        } catch (err) {
            alert('Login failed. Please check your connection.');
        }
        setLoading(false);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([
                    {
                        fullname: regName,
                        school: regCode.trim().startsWith('ADM-') ? (regSchool || 'Admin') : regSchool,
                        student_code: regCode.trim(),
                        grade: regCode.trim().startsWith('ADM-') ? 0 : parseInt(regGrade),
                        password: regPassword,
                        status: regCode.trim().startsWith('ADM-') ? 'approved' : 'pending',
                        role: regCode.trim().startsWith('ADM-') ? 'admin' : 'student'
                    }
                ])
                .select();

            if (error) {
                alert('Registration failed: ' + error.message);
            } else {
                alert('Registration successful! You can now log in.');
                setView('login');
                setLoginCode(regCode);
            }
        } catch (err) {
            alert('Registration error. Please try again.');
        }
        setLoading(false);
    };

    const logout = () => {
        setUser(null);
        setView('login');
        setLoginCode('');
        setLoginPassword('');
        setFoundStudent(null);
        setCurrentModule(null);
    };

    // Admin Functions
    const [allStudents, setAllStudents] = useState([]);
    const [adminView, setAdminTab] = useState('users'); // 'users', 'content'
    const [cmsModules, setCmsModules] = useState([]);
    const [editingModule, setEditingModule] = useState(null);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [moduleQuiz, setModuleQuiz] = useState({ questions: [], time_limit: 300, max_attempts: 3 });
    const [modulePapers, setModulePapers] = useState([]);
    const [editorMode, setEditorMode] = useState('edit'); // 'edit', 'preview'

    const fetchAllStudents = async () => {
        const { data } = await supabase.from('students').select('*').order('created_at', { ascending: false });
        if (data) setAllStudents(data);
    };

    const fetchCmsContent = async () => {
        const { data: modulesData } = await supabase.from('modules').select('*').order('grade', { ascending: true });
        if (modulesData) setCmsModules(modulesData);
    };

    const openModuleEditor = async (m) => {
        setEditingModule(m);
        // Fetch quiz
        const { data: qData } = await supabase.from('quizzes').select('*').eq('module_id', m.id).maybeSingle();
        setModuleQuiz(qData || { questions: [], time_limit: 300, max_attempts: 3 });
        // Fetch papers
        const { data: pData } = await supabase.from('papers').select('*').eq('module_id', m.id);
        setModulePapers(pData || []);
        setEditorMode('edit');
        setIsModuleModalOpen(true);
    };

    const handleSaveModule = async (e) => {
        e.preventDefault();
        setLoading(true);
        const moduleData = {
            title: editingModule.title,
            grade: parseInt(editingModule.grade),
            description: editingModule.description,
            category: editingModule.category,
            content_json: editingModule.content_json || {}
        };

        let currentModuleId = editingModule.id;
        if (editingModule.id) {
            await supabase.from('modules').update(moduleData).eq('id', editingModule.id);
        } else {
            const { data } = await supabase.from('modules').insert([moduleData]).select().single();
            currentModuleId = data.id;
        }

        // Save Quiz
        const quizData = { ...moduleQuiz, module_id: currentModuleId };
        if (moduleQuiz.id) {
            await supabase.from('quizzes').update(quizData).eq('id', moduleQuiz.id);
        } else {
            await supabase.from('quizzes').insert([quizData]);
        }

        // Save Papers
        // Simple approach: delete existing and insert new list
        if (editingModule.id) {
            await supabase.from('papers').delete().eq('module_id', editingModule.id);
        }
        if (modulePapers.length > 0) {
            const papersToSave = modulePapers.map(p => ({
                module_id: currentModuleId,
                title: p.title,
                url: p.url || p.file_url
            }));
            await supabase.from('papers').insert(papersToSave);
        }

        setIsModuleModalOpen(false);
        fetchCmsContent();
        setLoading(false);
    };

    const deleteModule = async (id) => {
        if (window.confirm('Are you sure you want to delete this module? This will also delete its quizzes and papers.')) {
            const { error } = await supabase.from('modules').delete().eq('id', id);
            if (!error) fetchCmsContent();
        }
    };

    const updateStudentStatus = async (id, newStatus) => {
        const { error } = await supabase.from('students').update({ status: newStatus }).eq('id', id);
        if (!error) fetchAllStudents();
        else alert('Update failed');
    };

    useEffect(() => {
        if (view === 'admin-dashboard') {
            fetchAllStudents();
            fetchCmsContent();
        }
    }, [view]);

    const openModule = async (module) => {
        setCurrentModule(module);
        setModuleView('overview');
        setView('module-detail');
        // Fetch quiz and papers for student
        const { data: qData } = await supabase.from('quizzes').select('*').eq('module_id', module.id).maybeSingle();
        setActiveQuiz(qData);
        const { data: pData } = await supabase.from('papers').select('*').eq('module_id', module.id);
        setActivePapers(pData || []);
    };

    const startQuiz = async () => {
        const moduleAttempts = attempts[currentModule.id] || 0;
        if (moduleAttempts >= (activeQuiz?.max_attempts || 3)) {
            alert('You have reached the maximum number of attempts for this quiz.');
            return;
        }

        setQuizActive(true);
        setQuizFinished(false);
        setTimeLeft(activeQuiz?.time_limit || 300);
        setAnswers({});
        setModuleView('quiz');
    };

    const handleAnswerChange = (questionId, optionIndex) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
    };

    const finishQuiz = async () => {
        setQuizActive(false);
        setQuizFinished(true);

        let finalScore = 0;
        (activeQuiz?.questions || []).forEach(q => {
            if (answers[q.id] === q.answer) {
                finalScore += 1;
            }
        });
        setScore(finalScore);

        const newCount = (attempts[currentModule.id] || 0) + 1;
        try {
            const { error } = await supabase
                .from('quiz_attempts')
                .upsert({
                    student_id: user.id,
                    module_id: currentModule.id,
                    count: newCount,
                    score: finalScore,
                    total_questions: (activeQuiz?.questions || []).length
                }, { onConflict: 'student_id,module_id' });

            if (!error) {
                setAttempts(prev => ({ ...prev, [currentModule.id]: newCount }));
            }
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    if (!isSupabaseConfigured) {
        return (
            <div className="auth-container">
                <div className="auth-card glass-card" style={{ border: '1px solid #ef4444' }}>
                    <h2 style={{ color: '#ef4444' }}>Configuration Missing</h2>
                    <p style={{ marginTop: '16px' }}>
                        Supabase Environment Variables (URL and Key) were not found.
                    </p>
                    <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Please add <b>VITE_SUPABASE_URL</b> and <b>VITE_SUPABASE_ANON_KEY</b> to your Vercel Project Settings.
                    </p>
                </div>
            </div>
        );
    }

    if (view === 'login') {
        return (
            <div className="auth-container">
                <style>{`
          .auth-container { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
          .auth-card { width: 100%; max-width: 400px; padding: 40px; text-align: center; }
          .input-group { text-align: left; margin-bottom: 20px; }
          .student-pill { background: rgba(59, 130, 246, 0.1); padding: 16px; border-radius: 12px; margin-bottom: 20px; text-align: left; border: 1px solid var(--accent-glow); animation: fadeIn 0.3s ease; }
          .pill-label { font-size: 0.7rem; color: var(--accent-color); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
          .pill-value { font-size: 1.1rem; font-weight: 600; color: #fff; }
        `}</style>
                <div className="auth-card glass-card">
                    <h1 className="gradient-text">ICT LMS</h1>
                    <p>Welcome Back!</p>
                    <form onSubmit={handleLogin}>
                        <div className="input-group">
                            <label>Student Code</label>
                            <input
                                type="text"
                                placeholder="Enter your unique code"
                                value={loginCode}
                                onChange={(e) => setLoginCode(e.target.value)}
                                required
                            />
                        </div>

                        {foundStudent && (
                            <div className="student-pill">
                                <div>
                                    <span className="pill-label">Name</span>
                                    <span className="pill-value">{foundStudent.fullname}</span>
                                </div>
                                {foundStudent.role !== 'admin' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <span className="pill-label">Grade</span>
                                        <span className="pill-value">Grade {foundStudent.grade}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {foundStudent && (
                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <button type="submit" className="auth-btn" disabled={loading || !foundStudent}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </button>
                    </form>
                    <div className="toggle-auth">
                        New student? <span onClick={() => setView('register')}>Register here</span>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'register') {
        return (
            <div className="auth-container">
                <div className="auth-card glass-card" style={{ maxWidth: '500px' }}>
                    <h1 className="gradient-text">Register</h1>
                    <p>Join the ICT Learning Platform</p>
                    <form onSubmit={handleRegister}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input type="text" placeholder="Ex: Hashan Dissanayaka" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Student Code (Unique)</label>
                            <input type="text" placeholder="Create a unique code" value={regCode} onChange={(e) => setRegCode(e.target.value)} required />
                        </div>
                        {!regCode.trim().startsWith('ADM-') && (
                            <>
                                <div className="input-group">
                                    <label>School</label>
                                    <input type="text" placeholder="Enter your school name" value={regSchool} onChange={(e) => setRegSchool(e.target.value)} required={!regCode.trim().startsWith('ADM-')} />
                                </div>
                                <div className="input-group">
                                    <label>Grade</label>
                                    <select value={regGrade} onChange={(e) => setRegGrade(e.target.value)}>
                                        {[6, 7, 8, 9, 10, 11].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                        <div className="input-group">
                            <label>Password</label>
                            <input type="password" placeholder="Create a password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="auth-btn" disabled={loading}>
                            {loading ? 'Creating Profile...' : 'Create Profile'}
                        </button>
                    </form>
                    <div className="toggle-auth">
                        Already have a profile? <span onClick={() => setView('login')}>Log in</span>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'module-detail') {
        return (
            <div className="module-detail">
                <style>{`
                    .module-detail { padding: 40px 5%; max-width: 1000px; margin: 0 auto; }
                    .back-btn { background: none; border: none; color: var(--accent-color); cursor: pointer; font-size: 1rem; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
                    .module-header { margin-bottom: 40px; }
                    .module-nav { display: flex; gap: 16px; margin-bottom: 32px; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; }
                    .nav-item { cursor: pointer; color: var(--text-muted); font-weight: 500; padding: 4px 12px; border-radius: 4px; }
                    .nav-item.active { color: #fff; background: var(--glass-bg); }
                    
                    .content-area { line-height: 1.7; }
                    .content-area h3 { margin: 24px 0 12px; }
                    .content-area ul { margin-left: 24px; margin-bottom: 16px; }
                    .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin: 24px 0; background: #000; }
                    .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
                    .content-img { width: 100%; border-radius: 12px; margin: 24px 0; }

                    .quiz-info-card { padding: 40px; text-align: center; }
                    .quiz-meta { display: flex; justify-content: center; gap: 40px; margin: 32px 0; }
                    .meta-item span { display: block; font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; }
                    .meta-item b { font-size: 1.5rem; }

                    .quiz-timer { position: sticky; top: 20px; right: 0; background: var(--accent-color); color: #fff; padding: 10px 20px; border-radius: 30px; font-weight: 700; width: fit-content; margin-left: auto; margin-bottom: 24px; box-shadow: 0 4px 12px var(--accent-glow); z-index: 100; }
                    .question-card { margin-bottom: 32px; padding: 24px; }
                    .question-card h4 { margin-bottom: 20px; font-size: 1.1rem; }
                    .options-list { display: grid; gap: 12px; }
                    .option-btn { padding: 16px; text-align: left; background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); border-radius: 8px; color: var(--text-main); font-size: 1rem; width: 100%; }
                    .option-btn:hover { background: rgba(255,255,255,0.08); }
                    .option-btn.selected { border-color: var(--accent-color); background: rgba(59, 130, 246, 0.1); }
                    .option-btn.correct { border-color: #22c55e; background: rgba(34, 197, 94, 0.1); }
                    .option-btn.wrong { border-color: #ef4444; background: rgba(239, 68, 68, 0.1); }

                    .submit-btn { background: var(--accent-color); color: #fff; border: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 1.1rem; margin-top: 24px; width: 100%; }
                    
                    .results-card { text-align: center; padding: 40px; }
                    .score-circle { width: 150px; height: 150px; border-radius: 50%; border: 8px solid var(--accent-color); display: flex; flex-direction: column; justify-content: center; align-items: center; margin: 0 auto 32px; }
                    .score-circle big { font-size: 3rem; font-weight: 800; }
                    .review-section { margin-top: 48px; text-align: left; }

                    .paper-list { display: grid; gap: 16px; }
                    .paper-item { display: flex; justify-content: space-between; align-items: center; padding: 20px; }
                    .paper-item a { color: var(--accent-color); text-decoration: none; font-weight: 600; }
                `}</style>

                <button className="back-btn" onClick={() => setView('dashboard')}>← Back to Modules</button>

                <header className="module-header">
                    <span className="category-tag">{currentModule.category}</span>
                    <h1 style={{ fontSize: '2.5rem', marginTop: '8px' }}>{currentModule.title}</h1>
                </header>

                <nav className="module-nav">
                    <div className={`nav-item ${moduleView === 'overview' ? 'active' : ''}`} onClick={() => setModuleView('overview')}>Overview</div>
                    <div className={`nav-item ${moduleView === 'content' ? 'active' : ''}`} onClick={() => setModuleView('content')}>Study Content</div>
                    <div className={`nav-item ${moduleView === 'quiz' ? 'active' : ''}`} onClick={() => setModuleView('quiz')}>Quiz</div>
                    <div className={`nav-item ${moduleView === 'papers' ? 'active' : ''}`} onClick={() => setModuleView('papers')}>Papers</div>
                </nav>

                <div className="module-body">
                    {moduleView === 'overview' && (
                        <div className="overview-area">
                            <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '32px' }}>{currentModule.description}</p>
                            <div className="glass-card" style={{ padding: '32px' }}>
                                <h3 style={{ marginBottom: '16px' }}>What you'll learn</h3>
                                <p>This module covers essential concepts of {currentModule.title.toLowerCase()}. By the end of this session, you'll have a solid understanding of the core topics, completed a comprehensive quiz, and reviewed supporting materials.</p>
                                <button className="auth-btn" style={{ width: 'fit-content', marginTop: '24px', padding: '12px 32px' }} onClick={() => setModuleView('content')}>Start Learning</button>
                            </div>
                        </div>
                    )}

                    {moduleView === 'content' && (
                        <div className="content-area">
                            {currentModule.content_json ? (
                                <>
                                    <div dangerouslySetInnerHTML={{ __html: currentModule.content_json.notes }} />
                                    {currentModule.content_json.image && <img src={currentModule.content_json.image} alt="Module visual" className="content-img" />}
                                    {currentModule.content_json.videoUrl && (
                                        <div className="video-container">
                                            <iframe src={currentModule.content_json.videoUrl} title="Module Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p>Content is coming soon for this module!</p>
                            )}
                        </div>
                    )}

                    {moduleView === 'quiz' && (
                        <div className="quiz-area">
                            {!activeQuiz ? (
                                <p>Quiz is coming soon for this module!</p>
                            ) : quizActive ? (
                                <>
                                    <div className="quiz-timer">⏱ {formatTime(timeLeft)}</div>
                                    {activeQuiz.questions.map((q, qIndex) => (
                                        <div key={q.id || qIndex} className="question-card glass-card">
                                            <h4>{qIndex + 1}. {q.question}</h4>
                                            <div className="options-list">
                                                {q.options.map((opt, optIndex) => (
                                                    <button
                                                        key={optIndex}
                                                        className={`option-btn ${answers[q.id || qIndex] === optIndex ? 'selected' : ''}`}
                                                        onClick={() => handleAnswerChange(q.id || qIndex, optIndex)}
                                                    >
                                                        {opt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    <button className="submit-btn" onClick={finishQuiz}>Finish Quiz</button>
                                </>
                            ) : quizFinished ? (
                                <div className="results-card glass-card">
                                    <h2 style={{ marginBottom: '32px' }}>Quiz Results</h2>
                                    <div className="score-circle">
                                        <big>{score}/{activeQuiz.questions.length}</big>
                                        <span>Marks</span>
                                    </div>
                                    <h3>{score === activeQuiz.questions.length ? 'Excellent! 🏆' : score > 0 ? 'Good Job! 👍' : 'Keep practicing! 💪'}</h3>

                                    <div className="review-section">
                                        <h3 style={{ marginBottom: '24px' }}>Review Answers</h3>
                                        {activeQuiz.questions.map((q, qIndex) => (
                                            <div key={q.id || qIndex} className="question-card glass-card" style={{ background: 'transparent' }}>
                                                <h4 style={{ color: answers[q.id || qIndex] === q.answer ? '#22c55e' : '#ef4444' }}>
                                                    {qIndex + 1}. {q.question} {answers[q.id || qIndex] === q.answer ? '✓' : '✗'}
                                                </h4>
                                                <div className="options-list">
                                                    {q.options.map((opt, optIndex) => (
                                                        <div
                                                            key={optIndex}
                                                            className={`option-btn ${optIndex === q.answer ? 'correct' : (answers[q.id || qIndex] === optIndex ? 'wrong' : '')}`}
                                                            style={{ cursor: 'default' }}
                                                        >
                                                            {opt}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button className="auth-btn" style={{ marginTop: '40px' }} onClick={() => setQuizFinished(false)}>Back to Module</button>
                                </div>
                            ) : (
                                <div className="quiz-info-card glass-card">
                                    <h2 style={{ marginBottom: '16px' }}>Ready for the Quiz?</h2>
                                    <p style={{ color: 'var(--text-muted)' }}>Test your knowledge on {currentModule.title}.</p>

                                    <div className="quiz-meta">
                                        <div className="meta-item">
                                            <span>Time Limit</span>
                                            <b>{activeQuiz.time_limit / 60} min</b>
                                        </div>
                                        <div className="meta-item">
                                            <span>Questions</span>
                                            <b>{activeQuiz.questions.length}</b>
                                        </div>
                                        <div className="meta-item">
                                            <span>Attempts</span>
                                            <b>{attempts[currentModule.id] || 0} / {activeQuiz.max_attempts}</b>
                                        </div>
                                    </div>

                                    {(attempts[currentModule.id] || 0) < activeQuiz.max_attempts ? (
                                        <button className="submit-btn" onClick={startQuiz}>Start Quiz</button>
                                    ) : (
                                        <p style={{ color: '#ef4444', fontWeight: 'bold' }}>You've used all attempts for this quiz.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {moduleView === 'papers' && (
                        <div className="papers-area">
                            {activePapers.length === 0 ? (
                                <p>No papers attached to this module yet.</p>
                            ) : (
                                <div className="paper-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
                                    {activePapers.map(paper => (
                                        <div key={paper.id} className="paper-item glass-card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <div style={{ fontSize: '1.5rem' }}>📄</div>
                                            <span style={{ fontWeight: '500', fontSize: '0.9rem' }}>{paper.title}</span>
                                            <a href={paper.url || paper.file_url} target="_blank" rel="noopener noreferrer" className="action-btn" style={{ fontSize: '0.8rem', padding: '6px 12px', textAlign: 'center', width: '100%' }}>View PDF</a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (view === 'admin-dashboard') {
        return (
            <div className="dashboard admin-portal">
                <style>{`
                    .admin-portal { padding: 40px 5%; }
                    .admin-nav { display: flex; gap: 20px; margin-bottom: 40px; }
                    .tab-btn { padding: 10px 24px; border-radius: 8px; border: 1px solid var(--glass-border); background: var(--glass-bg); color: #fff; cursor: pointer; }
                    .tab-btn.active { background: var(--accent-color); border-color: var(--accent-color); }
                    
                    .admin-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    .admin-table th, .admin-table td { padding: 16px; text-align: left; border-bottom: 1px solid var(--glass-border); }
                    .status-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
                    .status-pending { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
                    .status-approved { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
                    .status-disabled { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                    
                    .admin-actions { display: flex; gap: 8px; }
                    .action-icon-btn { padding: 6px 12px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; font-size: 0.8rem; }
                    .action-approve { border-color: #22c55e; color: #22c55e; }
                    .action-disable { border-color: #ef4444; color: #ef4444; }
                `}</style>

                <header>
                    <div className="user-info">
                        <h2>Admin <span>Portal</span></h2>
                        <p style={{ color: 'var(--text-muted)' }}>Manage Users & Content</p>
                    </div>
                    <div>
                        <button className="tab-btn" onClick={() => setView('dashboard')} style={{ marginRight: '10px' }}>Student View</button>
                        <a className="logout-link" onClick={logout}>Sign Out</a>
                    </div>
                </header>

                <div className="admin-nav">
                    <button className={`tab-btn ${adminView === 'users' ? 'active' : ''}`} onClick={() => setAdminTab('users')}>Users</button>
                    <button className={`tab-btn ${adminView === 'content' ? 'active' : ''}`} onClick={() => setAdminTab('content')}>Content</button>
                </div>

                {adminView === 'users' && (
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3>User Management</h3>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Grade</th>
                                    <th>School</th>
                                    <th>Code</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allStudents.filter(s => s.role !== 'admin').map(s => (
                                    <tr key={s.id}>
                                        <td>{s.fullname}</td>
                                        <td>Grade {s.grade}</td>
                                        <td>{s.school}</td>
                                        <td><code>{s.student_code}</code></td>
                                        <td>
                                            <span className={`status-badge status-${s.status}`}>
                                                {s.status?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="admin-actions">
                                            {s.status === 'pending' && (
                                                <button className="action-icon-btn action-approve" onClick={() => updateStudentStatus(s.id, 'approved')}>Approve</button>
                                            )}
                                            {s.status === 'approved' && (
                                                <button className="action-icon-btn action-disable" onClick={() => updateStudentStatus(s.id, 'disabled')}>Disable</button>
                                            )}
                                            {s.status === 'disabled' && (
                                                <button className="action-icon-btn action-approve" onClick={() => updateStudentStatus(s.id, 'approved')}>Enable</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {allStudents.filter(s => s.role !== 'admin').length === 0 && <p style={{ textAlign: 'center', marginTop: '20px' }}>No students registered yet.</p>}
                    </div>
                )}

                {adminView === 'content' && (
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Module Management</h3>
                            <button className="auth-btn" style={{ width: 'fit-content', padding: '8px 20px' }} onClick={() => { setEditingModule({ title: '', grade: 6, description: '', category: 'Foundation', content_json: {} }); setIsModuleModalOpen(true); }}>+ Add New Module</button>
                        </div>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Grade</th>
                                    <th>Title</th>
                                    <th>Category</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cmsModules.map(m => (
                                    <tr key={m.id}>
                                        <td>Grade {m.grade}</td>
                                        <td>{m.title}</td>
                                        <td>{m.category}</td>
                                        <td className="admin-actions">
                                            <button className="action-icon-btn" onClick={() => openModuleEditor(m)}>Edit</button>
                                            <button className="action-icon-btn action-disable" onClick={() => deleteModule(m.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {isModuleModalOpen && (
                            <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                                <div className="glass-card" style={{ width: '100%', maxWidth: '600px', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3>{editingModule.id ? 'Edit Module' : 'Add New Module'}</h3>
                                        <div className="admin-nav" style={{ margin: 0 }}>
                                            <button type="button" className={`tab-btn ${editorMode === 'edit' ? 'active' : ''}`} onClick={() => setEditorMode('edit')}>Edit</button>
                                            <button type="button" className={`tab-btn ${editorMode === 'preview' ? 'active' : ''}`} onClick={() => setEditorMode('preview')}>Preview</button>
                                        </div>
                                    </div>

                                    <form onSubmit={handleSaveModule} style={{ marginTop: '20px' }}>
                                        {editorMode === 'edit' ? (
                                            <>
                                                <div className="input-group">
                                                    <label>Title</label>
                                                    <input type="text" value={editingModule.title} onChange={e => setEditingModule({ ...editingModule, title: e.target.value })} required />
                                                </div>
                                                <div className="input-group">
                                                    <label>Grade</label>
                                                    <select value={editingModule.grade} onChange={e => setEditingModule({ ...editingModule, grade: e.target.value })}>
                                                        {[6, 7, 8, 9, 10, 11].map(g => <option key={g} value={g}>Grade {g}</option>)}
                                                    </select>
                                                </div>
                                                <div className="input-group">
                                                    <label>Category</label>
                                                    <input type="text" value={editingModule.category} onChange={e => setEditingModule({ ...editingModule, category: e.target.value })} required />
                                                </div>
                                                <div className="input-group">
                                                    <label>Description</label>
                                                    <textarea style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', padding: '12px' }} rows="3" value={editingModule.description} onChange={e => setEditingModule({ ...editingModule, description: e.target.value })} required />
                                                </div>

                                                <div className="input-group">
                                                    <label>Video URL (YouTube Embed Link)</label>
                                                    <input type="text" placeholder="https://www.youtube.com/embed/..." value={editingModule.content_json?.videoUrl || ''} onChange={e => setEditingModule({ ...editingModule, content_json: { ...editingModule.content_json, videoUrl: e.target.value } })} />
                                                </div>

                                                <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid var(--glass-border)' }} />
                                                <h4>Study Content (Notes HTML)</h4>
                                                <textarea
                                                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: '#fff', padding: '12px', marginTop: '10px' }}
                                                    rows="5"
                                                    value={editingModule.content_json?.notes || ''}
                                                    onChange={e => setEditingModule({ ...editingModule, content_json: { ...editingModule.content_json, notes: e.target.value } })}
                                                    placeholder="<h3>Notes</h3><p>Text here...</p>"
                                                />

                                                <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid var(--glass-border)' }} />
                                                <h4>Paper Management</h4>
                                                <div className="paper-list-admin" style={{ marginTop: '10px' }}>
                                                    {modulePapers.map((paper, pIdx) => (
                                                        <div key={pIdx} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                                            <input type="text" placeholder="Paper Title" value={paper.title} onChange={e => {
                                                                const newP = [...modulePapers];
                                                                newP[pIdx].title = e.target.value;
                                                                setModulePapers(newP);
                                                            }} />
                                                            <input type="text" placeholder="URL" value={paper.url || paper.file_url || ''} onChange={e => {
                                                                const newP = [...modulePapers];
                                                                newP[pIdx].url = e.target.value;
                                                                setModulePapers(newP);
                                                            }} />
                                                            <button type="button" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModulePapers(modulePapers.filter((_, i) => i !== pIdx))}>×</button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="tab-btn" style={{ fontSize: '0.8rem' }} onClick={() => setModulePapers([...modulePapers, { title: '', url: '' }])}>+ Add Paper</button>
                                                </div>

                                                <hr style={{ margin: '30px 0', border: '0', borderTop: '1px solid var(--glass-border)' }} />
                                                <h4>Quiz Management</h4>
                                                <div className="input-group" style={{ marginTop: '10px' }}>
                                                    <label>Time Limit (Seconds)</label>
                                                    <input type="number" value={moduleQuiz.time_limit} onChange={e => setModuleQuiz({ ...moduleQuiz, time_limit: parseInt(e.target.value) })} />
                                                </div>
                                                <div className="input-group">
                                                    <label>Max Attempts</label>
                                                    <input type="number" value={moduleQuiz.max_attempts} onChange={e => setModuleQuiz({ ...moduleQuiz, max_attempts: parseInt(e.target.value) })} />
                                                </div>

                                                <p style={{ marginTop: '15px', fontWeight: 'bold' }}>Questions ({moduleQuiz.questions?.length || 0})</p>
                                                <button type="button" className="tab-btn" style={{ fontSize: '0.8rem', marginTop: '10px' }} onClick={() => setModuleQuiz({ ...moduleQuiz, questions: [...(moduleQuiz.questions || []), { id: Date.now(), question: '', options: ['', '', '', ''], answer: 0 }] })}>+ Add Question</button>

                                                {(moduleQuiz.questions || []).map((q, idx) => (
                                                    <div key={q.id || idx} style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <label>Question {idx + 1}</label>
                                                            <button type="button" style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setModuleQuiz({ ...moduleQuiz, questions: moduleQuiz.questions.filter((_, i) => i !== idx) })}>Remove</button>
                                                        </div>
                                                        <input type="text" style={{ marginTop: '5px' }} value={q.question} onChange={e => {
                                                            const newQs = [...moduleQuiz.questions];
                                                            newQs[idx].question = e.target.value;
                                                            setModuleQuiz({ ...moduleQuiz, questions: newQs });
                                                        }} />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                                            {q.options.map((opt, optIdx) => (
                                                                <div key={optIdx}>
                                                                    <input type="text" placeholder={`Option ${optIdx + 1}`} value={opt} onChange={e => {
                                                                        const newQs = [...moduleQuiz.questions];
                                                                        newQs[idx].options[optIdx] = e.target.value;
                                                                        setModuleQuiz({ ...moduleQuiz, questions: newQs });
                                                                    }} />
                                                                    <label style={{ fontSize: '0.7rem' }}>
                                                                        <input type="radio" name={`q-${idx}`} checked={q.answer === optIdx} onChange={() => {
                                                                            const newQs = [...moduleQuiz.questions];
                                                                            newQs[idx].answer = optIdx;
                                                                            setModuleQuiz({ ...moduleQuiz, questions: newQs });
                                                                        }} /> Correct
                                                                    </label>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="preview-container" style={{ textAlign: 'left' }}>
                                                <header className="module-header" style={{ border: 'none', padding: 0, marginBottom: '20px' }}>
                                                    <span className="category-tag">{editingModule.category}</span>
                                                    <h1 style={{ fontSize: '1.8rem', marginTop: '8px' }}>{editingModule.title}</h1>
                                                </header>
                                                <div className="content-area">
                                                    <div dangerouslySetInnerHTML={{ __html: editingModule.content_json?.notes || '<p>No notes added yet.</p>' }} />
                                                    {editingModule.content_json?.videoUrl && (
                                                        <div className="video-container" style={{ marginTop: '20px' }}>
                                                            <iframe src={editingModule.content_json.videoUrl} title="Module Video" frameBorder="0" allowFullScreen></iframe>
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                                                    <h4>Papers</h4>
                                                    {modulePapers.length === 0 ? <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No papers.</p> : (
                                                        <ul style={{ marginTop: '10px' }}>
                                                            {modulePapers.map((p, i) => <li key={i}>{p.title}</li>)}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '10px', marginTop: '40px', position: 'sticky', bottom: 0, background: 'var(--glass-bg)', padding: '10px 0', zIndex: 5 }}>
                                            <button type="submit" className="auth-btn" disabled={loading} style={{ margin: 0 }}>{loading ? 'Saving...' : 'Save All Changes'}</button>
                                            <button type="button" className="tab-btn" onClick={() => setIsModuleModalOpen(false)} style={{ margin: 0 }}>Cancel</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Dashboard Filtering
    const studentModules = modules;

    return (
        <div className="dashboard">
            <style>{`
        .dashboard { padding: 40px 5% 100px; }
        header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 48px; }
        .user-info h2 { font-size: 1.5rem; }
        .user-info span { color: var(--accent-color); }
        .logout-link { color: var(--text-muted); font-size: 0.9rem; text-decoration: none; border-bottom: 1px solid transparent; }
        .logout-link:hover { color: #fff; cursor: pointer; }
        
        .section-title { margin-bottom: 24px; font-size: 1.25rem; font-weight: 600; color: var(--text-muted); }
        .module-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .module-card {
          padding: 30px;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: transform 0.3s ease;
        }
        .module-card:hover { transform: translateY(-5px); }
        .module-card h3 { margin-bottom: 12px; font-size: 1.3rem; }
        .module-card p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.6; flex: 1; }
        .action-btn {
          margin-top: 24px;
          padding: 10px 20px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          color: #fff;
          font-weight: 500;
          width: fit-content;
        }
        .module-card:hover .action-btn { background: var(--accent-color); border-color: var(--accent-color); }
      `}</style>

            <header>
                <div className="user-info">
                    <h2>Hi, <span>{user?.fullname}</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user?.school} | Grade {user?.grade} {user?.role === 'admin' && <b style={{ color: 'var(--accent-color)' }}>(ADMIN)</b>}</p>
                </div>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    {user?.role === 'admin' && (
                        <button className="tab-btn" onClick={() => setView('admin-dashboard')} style={{ fontSize: '0.8rem' }}>Admin Portal</button>
                    )}
                    <a className="logout-link" onClick={logout}>Sign Out</a>
                </div>
            </header>

            <section>
                <h3 className="section-title">Your Modules</h3>
                <div className="module-grid">
                    {studentModules.map(module => (
                        <div key={module.id} className="module-card glass-card" onClick={() => openModule(module)}>
                            <span className="category-tag">{module.category}</span>
                            <h3>{module.title}</h3>
                            <p>{module.description}</p>
                            <button className="action-btn">Open Module</button>
                        </div>
                    ))}
                    {studentModules.length === 0 && <p>No modules available for your grade yet.</p>}
                </div>
            </section>

            <footer style={{ position: 'fixed', bottom: 30, right: 30, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ICT LMS v1.1 | Hashan Dissanayaka
            </footer>
        </div>
    );
}

export default App;
