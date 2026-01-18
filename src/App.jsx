import React, { useState, useEffect } from 'react';
import { modulesData } from './data/modulesData';
import { supabase } from './supabaseClient';

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

    // Dynamic Login Lookup
    useEffect(() => {
        const lookupStudent = async () => {
            if (loginCode.trim().length >= 3) {
                try {
                    const { data, error } = await supabase
                        .from('students')
                        .select('fullname, grade')
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
                setUser(data);
                setView('dashboard');
                // Fetch attempts for this student
                const { data: attemptsData } = await supabase
                    .from('quiz_attempts')
                    .select('module_id, count')
                    .eq('student_id', data.id);

                const attemptMap = {};
                attemptsData?.forEach(a => attemptMap[a.module_id] = a.count);
                setAttempts(attemptMap);
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
                        school: regSchool,
                        student_code: regCode.trim(),
                        grade: parseInt(regGrade),
                        password: regPassword
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

    const openModule = (module) => {
        setCurrentModule(module);
        setModuleView('overview');
        setView('module-detail');
    };

    const startQuiz = async () => {
        const moduleAttempts = attempts[currentModule.id] || 0;
        if (moduleAttempts >= currentModule.quiz.allowedAttempts) {
            alert('You have reached the maximum number of attempts for this quiz.');
            return;
        }

        setQuizActive(true);
        setQuizFinished(false);
        setTimeLeft(currentModule.quiz.timeLimit);
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
        currentModule.quiz.questions.forEach(q => {
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
                    total_questions: currentModule.quiz.questions.length
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
                                <div style={{ marginTop: '12px' }}>
                                    <span className="pill-label">Grade</span>
                                    <span className="pill-value">Grade {foundStudent.grade}</span>
                                </div>
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
                            <label>School</label>
                            <input type="text" placeholder="Enter your school name" value={regSchool} onChange={(e) => setRegSchool(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Student Code (Unique)</label>
                            <input type="text" placeholder="Create a unique code" value={regCode} onChange={(e) => setRegCode(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Grade</label>
                            <select value={regGrade} onChange={(e) => setRegGrade(e.target.value)}>
                                {[6, 7, 8, 9, 10, 11].map(g => <option key={g} value={g}>Grade {g}</option>)}
                            </select>
                        </div>
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
                            {currentModule.content ? (
                                <>
                                    <div dangerouslySetInnerHTML={{ __html: currentModule.content.notes }} />
                                    {currentModule.content.image && <img src={currentModule.content.image} alt="Module visual" className="content-img" />}
                                    {currentModule.content.videoUrl && (
                                        <div className="video-container">
                                            <iframe src={currentModule.content.videoUrl} title="Module Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
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
                            {!currentModule.quiz ? (
                                <p>Quiz is coming soon for this module!</p>
                            ) : quizActive ? (
                                <>
                                    <div className="quiz-timer">⏱ {formatTime(timeLeft)}</div>
                                    {currentModule.quiz.questions.map((q, qIndex) => (
                                        <div key={q.id} className="question-card glass-card">
                                            <h4>{qIndex + 1}. {q.question}</h4>
                                            <div className="options-list">
                                                {q.options.map((opt, optIndex) => (
                                                    <button
                                                        key={optIndex}
                                                        className={`option-btn ${answers[q.id] === optIndex ? 'selected' : ''}`}
                                                        onClick={() => handleAnswerChange(q.id, optIndex)}
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
                                        <big>{score}/{currentModule.quiz.questions.length}</big>
                                        <span>Marks</span>
                                    </div>
                                    <h3>{score === currentModule.quiz.questions.length ? 'Excellent! 🏆' : score > 0 ? 'Good Job! 👍' : 'Keep practicing! 💪'}</h3>

                                    <div className="review-section">
                                        <h3 style={{ marginBottom: '24px' }}>Review Answers</h3>
                                        {currentModule.quiz.questions.map((q, qIndex) => (
                                            <div key={q.id} className="question-card glass-card" style={{ background: 'transparent' }}>
                                                <h4 style={{ color: answers[q.id] === q.answer ? '#22c55e' : '#ef4444' }}>
                                                    {qIndex + 1}. {q.question} {answers[q.id] === q.answer ? '✓' : '✗'}
                                                </h4>
                                                <div className="options-list">
                                                    {q.options.map((opt, optIndex) => (
                                                        <div
                                                            key={optIndex}
                                                            className={`option-btn ${optIndex === q.answer ? 'correct' : (answers[q.id] === optIndex ? 'wrong' : '')}`}
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
                                            <b>{currentModule.quiz.timeLimit / 60} min</b>
                                        </div>
                                        <div className="meta-item">
                                            <span>Questions</span>
                                            <b>{currentModule.quiz.questions.length}</b>
                                        </div>
                                        <div className="meta-item">
                                            <span>Attempts</span>
                                            <b>{attempts[currentModule.id] || 0} / {currentModule.quiz.allowedAttempts}</b>
                                        </div>
                                    </div>

                                    {(attempts[currentModule.id] || 0) < currentModule.quiz.allowedAttempts ? (
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
                            {!currentModule.papers || currentModule.papers.length === 0 ? (
                                <p>No papers attached to this module yet.</p>
                            ) : (
                                <div className="paper-list">
                                    {currentModule.papers.map(paper => (
                                        <div key={paper.id} className="paper-item glass-card">
                                            <span>{paper.title}</span>
                                            <a href={paper.url} target="_blank" rel="noopener noreferrer">View / Download</a>
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

    const filteredModules = modulesData.filter(m => m.grade === user?.grade);

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
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{user?.school} | Grade {user?.grade}</p>
                </div>
                <a className="logout-link" onClick={logout}>Sign Out</a>
            </header>

            <section>
                <h3 className="section-title">Your Modules</h3>
                <div className="module-grid">
                    {filteredModules.map(module => (
                        <div key={module.id} className="module-card glass-card" onClick={() => openModule(module)}>
                            <span className="category-tag">{module.category}</span>
                            <h3>{module.title}</h3>
                            <p>{module.description}</p>
                            <button className="action-btn">Open Module</button>
                        </div>
                    ))}
                </div>
            </section>

            <footer style={{ position: 'fixed', bottom: 30, right: 30, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ICT LMS v1.1 | Hashan Dissanayaka
            </footer>
        </div>
    );
}

export default App;
