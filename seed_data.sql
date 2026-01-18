-- Seed Modules
INSERT INTO modules (grade, title, description, category, content_json) VALUES
(6, 'Introduction to ICT', 'Basics of computers and their impact on daily life.', 'Foundation', '{"notes": "<h3>Introduction to ICT</h3><p>Information and Communication Technology (ICT) refers to all the technology used to handle telecommunications, broadcast media, intelligent building management systems, audiovisual processing and transmission systems, and network-based control and monitoring functions.</p><p>Key components include:</p><ul><li>Cloud computing</li><li>Software</li><li>Hardware</li><li>Data</li><li>Internet access</li></ul>", "videoUrl": "https://www.youtube.com/embed/dQw4w9WgXcQ", "image": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"}'),
(6, 'How Computers Work', 'Internal components and processing of data.', 'Architecture', '{"notes": "<h3>How Computers Work</h3><p>Computers process data into information using the Input-Process-Output (IPO) cycle.</p><ul><li><b>Input:</b> Data is entry through keyboard, mouse, etc.</li><li><b>Process:</b> The CPU processes the data.</li><li><b>Output:</b> Information is displayed on screen or printed.</li><li><b>Storage:</b> Data is saved for future use.</li></ul>", "videoUrl": "https://www.youtube.com/embed/O_E0l49Xo1U", "image": "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80"}'),
(7, 'Computer Graphics', 'Creating and editing images using software.', 'Design', '{}'),
(7, 'Presentation Software', 'Mastering PowerPoint and slide creation.', 'Office', '{}'),
(8, 'Word Processing', 'Advanced document formatting and layouts.', 'Office', '{}'),
(8, 'Spreadsheet Basics', 'Introduction to Excel formulas and charts.', 'Data', '{}'),
(9, 'Programming Logic', 'Introduction to algorithms and flowcharts.', 'Coding', '{}'),
(9, 'Web Design Basics', 'Introduction to HTML and CSS structure.', 'Web', '{}'),
(10, 'Data Representation', 'Binary, octal, and hexadecimal systems.', 'Theory', '{}'),
(10, 'Programming in Python', 'Learning syntax, variables, and loops.', 'Coding', '{}'),
(11, 'Operating Systems', 'Types and functions of operating systems.', 'Theory', '{}'),
(11, 'Networking & Internet', 'Protocols, IP addresses, and security.', 'Networking', '{}');

-- Seed Quizzes (for Module 1)
INSERT INTO quizzes (module_id, questions, time_limit, max_attempts) VALUES
(1, '[{"id": 1, "question": "What does ICT stand for?", "options": ["Information and Communication Technology", "Internal Computer Tool", "Internet Connection Tech", "Integrated Circuit Test"], "answer": 0}, {"id": 2, "question": "Which of these is a hardware component?", "options": ["Windows", "RAM", "Google Chrome", "Adobe Photoshop"], "answer": 1}]', 300, 3);

-- Seed Quizzes (for Module 2)
INSERT INTO quizzes (module_id, questions, time_limit, max_attempts) VALUES
(2, '[{"id": 1, "question": "What does CPU stand for?", "options": ["Central Process Unit", "Core Processing Utility", "Central Processing Unit", "Computer processing Unit"], "answer": 2}]', 600, 2);

-- Seed Papers
INSERT INTO papers (module_id, title, file_url) VALUES
(1, 'Grade 6 Term 1 Paper', '#'),
(1, 'Intro to ICT Notes PDF', '#');
