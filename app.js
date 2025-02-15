const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfReader = require('pdf-parse');
const compromise = require('compromise');  // NLP library for parsing
const natural = require('natural');  // For tokenization and text classification
const app = express();

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (fileExt === '.pdf' || fileExt === '.txt') {
      return cb(null, true);
    }
    cb(new Error('Invalid file format. Please upload a PDF or TXT file.'));
  }
}).single('resume');

// Middleware to serve static files (e.g., HTML)
app.use(express.static('public'));

// Route to serve the HTML file on the root (default) route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Prediction and extraction functions (replace with your actual ML models)
function predictCategory(resumeText) {
    return 'Software Developer';  // Dummy function, replace with your model logic
}

function jobRecommendation(resumeText) {
    return 'Full Stack Developer';  // Dummy function, replace with your model logic
}

function extractSkills(resumeText) {
    const skillsList = ["Python", "JavaScript", "Machine Learning", "Data Analysis", "Django", "Flask", 'Data Analysis', 'Machine Learning', 'Communication', 'Project Management', 'Deep Learning', 'SQL',
    'Tableau', 'Java', 'C++', 'JavaScript', 'HTML', 'CSS', 'React', 'Angular', 'Node.js', 'MongoDB', 'Express.js', 'Git',
    'Research', 'Statistics', 'Quantitative Analysis', 'Qualitative Analysis', 'SPSS', 'R', 'Data Visualization',
    'Matplotlib', 'Seaborn', 'Plotly', 'Pandas', 'Numpy', 'Scikit-learn', 'TensorFlow', 'Keras', 'PyTorch', 'NLTK',
    'Text Mining', 'Natural Language Processing', 'Computer Vision', 'Image Processing', 'OCR', 'Speech Recognition',
    'Recommendation Systems', 'Collaborative Filtering', 'Content-Based Filtering', 'Reinforcement Learning', 'Neural Networks',
    'Convolutional Neural Networks', 'Recurrent Neural Networks', 'Generative Adversarial Networks', 'XGBoost', 'Random Forest',
    'Decision Trees', 'Support Vector Machines', 'Linear Regression', 'Logistic Regression', 'K-Means Clustering',
    'Hierarchical Clustering', 'DBSCAN', 'Association Rule Learning', 'Apache Hadoop', 'Apache Spark', 'MapReduce',
    'Hive', 'HBase', 'Apache Kafka', 'Data Warehousing', 'ETL', 'Big Data Analytics', 'Cloud Computing', 'AWS', 'Azure',
    'GCP', 'Docker', 'Kubernetes', 'Linux', 'Shell Scripting', 'Cybersecurity', 'Network Security', 'Penetration Testing',
    'Firewalls', 'Encryption', 'Malware Analysis', 'Digital Forensics', 'CI/CD', 'DevOps', 'Agile Methodology', 'Scrum',
    'Kanban', 'Software Development', 'Web Development', 'Mobile Development', 'Backend Development', 'Frontend Development',
    'Full-Stack Development', 'UI/UX Design', 'Responsive Design', 'Wireframing', 'Prototyping', 'Adobe Creative Suite',
    'Photoshop', 'Illustrator', 'Figma', 'SEO', 'SEM', 'Google Analytics', 'Salesforce', 'Power BI', 'Tableau', 'Django',
    'Flask', 'FastAPI']; // Predefined skills list

    // Escape special characters for RegExp
    const escapedSkills = skillsList.map(skill => skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    // Match skills in resume text
    const skills = escapedSkills.filter(skill => new RegExp(`\\b${skill}\\b`, 'i').test(resumeText));

    return skills.length ? skills : ['No skills found'];
}

function extractEducation(resumeText) {
    const educationKeywords = [
    'Computer Science', 'Information Technology', 'Software Engineering', 'Electrical Engineering', 'Mechanical Engineering',
    'Civil Engineering', 'Chemical Engineering', 'Biomedical Engineering', 'Aerospace Engineering', 'Industrial Engineering',
    'Systems Engineering', 'Data Science', 'Data Analytics', 'Business Analytics', 'Operations Research', 'Decision Sciences',
    'Cybersecurity', 'Network Engineering', 'Digital Marketing', 'Finance', 'Accounting', 'Business Administration',
    'Marketing', 'Entrepreneurship', 'Project Management', 'Public Administration', 'Urban Planning', 'Architecture',
    'Interior Design', 'Graphic Design', 'Journalism', 'Communication Studies', 'Psychology', 'Political Science',
    'Economics', 'Mathematics', 'Physics', 'Biotechnology', 'Environmental Science'
    ];
    const education = educationKeywords.filter(keyword => new RegExp(`\\b${keyword}\\b`, 'i').test(resumeText));
    return education.length ? education : ['No education found'];
}

function extractWorkExperience(resumeText) {
    const workExperiencePattern = /\b(?:worked as|experience in|at|employed by|role)\b.*?\b(?:[A-Za-z]+(?:\s[A-Za-z]+)*)\b/i;
    const match = resumeText.match(workExperiencePattern);
    return match ? match[0] : 'No work experience found';
}

function extractContactInfo(resumeText) {
    const namePattern = /\b([A-Z][a-z]+)\s([A-Z][a-z]+)\b/;
    const phonePattern = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

    const nameMatch = resumeText.match(namePattern);
    const phoneMatch = resumeText.match(phonePattern);
    const emailMatch = resumeText.match(emailPattern);

    return {
        name: nameMatch ? nameMatch[0] : 'No name found',
        phone: phoneMatch ? phoneMatch[0] : 'No phone number found',
        email: emailMatch ? emailMatch[0] : 'No email found'
    };
}

// Function to parse and extract information from resumes dynamically
function extractResumeInfo(resumeText) {
    const skills = extractSkills(resumeText);
    const education = extractEducation(resumeText);
    const workExperience = extractWorkExperience(resumeText);
    const contactInfo = extractContactInfo(resumeText);

    return {
        skills,
        education,
        work_experience: workExperience,
        name: contactInfo.name,
        phone: contactInfo.phone,
        email: contactInfo.email
    };
}

// Route to handle resume prediction
app.post('/pred', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    const file = req.file;
    const filePath = file.path;
    const fileExt = path.extname(file.originalname).toLowerCase();

    let resumeText = '';

    // Extract text from uploaded PDF or TXT file
    if (fileExt === '.txt') {
      resumeText = fs.readFileSync(filePath, 'utf8');
    } else if (fileExt === '.pdf') {
      const pdfData = fs.readFileSync(filePath);
      pdfReader(pdfData).then(data => {
        resumeText = data.text;
      });
    }

    // Extract resume details dynamically
    const extractedInfo = extractResumeInfo(resumeText);

    // Call your machine learning models for prediction
    const predictedCategory = predictCategory(resumeText);
    const recommendedJob = jobRecommendation(resumeText);

    // Send the response
    res.json({
      predicted_category: predictedCategory,
      recommended_job: recommendedJob,
      ...extractedInfo
    });
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});



