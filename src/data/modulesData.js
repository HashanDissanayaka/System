export const modulesData = [
    {
        id: 1,
        grade: 6,
        title: "Introduction to ICT",
        description: "Basics of computers and their impact on daily life.",
        category: "Foundation",
        content: {
            notes: "<h3>Introduction to ICT</h3><p>Information and Communication Technology (ICT) refers to all the technology used to handle telecommunications, broadcast media, intelligent building management systems, audiovisual processing and transmission systems, and network-based control and monitoring functions.</p><p>Key components include:</p><ul><li>Cloud computing</li><li>Software</li><li>Hardware</li><li>Data</li><li>Internet access</li></ul>",
            videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ", // Placeholder video
            image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80"
        },
        quiz: {
            timeLimit: 300, // 5 minutes in seconds
            allowedAttempts: 3,
            questions: [
                {
                    id: 1,
                    question: "What does ICT stand for?",
                    options: ["Information and Communication Technology", "Internal Computer Tool", "Internet Connection Tech", "Integrated Circuit Test"],
                    answer: 0
                },
                {
                    id: 2,
                    question: "Which of these is a hardware component?",
                    options: ["Windows", "RAM", "Google Chrome", "Adobe Photoshop"],
                    answer: 1
                }
            ]
        },
        papers: [
            { id: 1, title: "Grade 6 Term 1 Paper", url: "#" },
            { id: 2, title: "Intro to ICT Notes PDF", url: "#" }
        ]
    },
    {
        id: 2,
        grade: 6,
        title: "How Computers Work",
        description: "Internal components and processing of data.",
        category: "Architecture",
        content: {
            notes: "<h3>How Computers Work</h3><p>Computers process data into information using the Input-Process-Output (IPO) cycle.</p><ul><li><b>Input:</b> Data is entry through keyboard, mouse, etc.</li><li><b>Process:</b> The CPU processes the data.</li><li><b>Output:</b> Information is displayed on screen or printed.</li><li><b>Storage:</b> Data is saved for future use.</li></ul>",
            videoUrl: "https://www.youtube.com/embed/O_E0l49Xo1U",
            image: "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=800&q=80"
        },
        quiz: {
            timeLimit: 600,
            allowedAttempts: 2,
            questions: [
                {
                    id: 1,
                    question: "What does CPU stand for?",
                    options: ["Central Process Unit", "Core Processing Utility", "Central Processing Unit", "Computer processing Unit"],
                    answer: 2
                }
            ]
        },
        papers: []
    },
    { id: 3, grade: 7, title: "Computer Graphics", description: "Creating and editing images using software.", category: "Design" },
    { id: 4, grade: 7, title: "Presentation Software", description: "Mastering PowerPoint and slide creation.", category: "Office" },
    { id: 5, grade: 8, title: "Word Processing", description: "Advanced document formatting and layouts.", category: "Office" },
    { id: 6, grade: 8, title: "Spreadsheet Basics", description: "Introduction to Excel formulas and charts.", category: "Data" },
    { id: 7, grade: 9, title: "Programming Logic", description: "Introduction to algorithms and flowcharts.", category: "Coding" },
    { id: 8, grade: 9, title: "Web Design Basics", description: "Introduction to HTML and CSS structure.", category: "Web" },
    { id: 9, grade: 10, title: "Data Representation", description: "Binary, octal, and hexadecimal systems.", category: "Theory" },
    { id: 10, grade: 10, title: "Programming in Python", description: "Learning syntax, variables, and loops.", category: "Coding" },
    { id: 11, grade: 11, title: "Operating Systems", description: "Types and functions of operating systems.", category: "Theory" },
    { id: 12, grade: 11, title: "Networking & Internet", description: "Protocols, IP addresses, and security.", category: "Networking" },
];
