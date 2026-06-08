import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

export const interviewPresets = {
  "frontend-dev": {
    title: "Frontend Developer",
    description: "Builds responsive, high-performance web applications using modern JavaScript/TypeScript, React, and CSS.",
    questions: [
      "Can you explain the difference between the Virtual DOM and the real DOM, and how React's reconciliation process works?",
      "What are some strategies you would use to optimize the initial page load performance of a media-heavy React application?",
      "How do you manage global state in a large-scale React application, and how do you choose between the Context API and dedicated state managers like Zustand or Redux?",
      "What is a closure in JavaScript, and how can you use it to create private variables or implement memoization?"
    ],
    keywords: [
      "virtual dom", "reconciliation", "diffing", "fiber", "lazy loading", "code splitting", 
      "usememo", "usecallback", "context api", "zustand", "redux", "closure", "lexical scope", 
      "repaint", "reflow", "bundle size", "tree shaking"
    ]
  },
  "backend-dev": {
    title: "Backend Developer",
    description: "Designs, builds, and maintains server-side logic, databases, APIs, and microservices architecture.",
    questions: [
      "How would you design a backend system to handle high write concurrency (like a flash sale or ticket booking platform) to prevent double-booking?",
      "What is the difference between SQL and NoSQL databases, and what criteria do you use to choose between them for a new microservice?",
      "Explain how database indexing works, and discuss the performance trade-offs of indexing frequently updated columns.",
      "How do you secure a RESTful API against common security threats such as SQL injection, CSRF, and brute force attacks?"
    ],
    keywords: [
      "acid", "transactions", "pessimistic locking", "optimistic locking", "indexing", "b-tree", 
      "redis", "caching", "nosql", "sharding", "replication", "jwt", "oauth", "rate limiting", 
      "sql injection", "csrf", "cors", "cors origin"
    ]
  },
  "data-scientist": {
    title: "Data Scientist",
    description: "Analyzes complex datasets, builds machine learning models, and extracts actionable business insights.",
    questions: [
      "What is the difference between model overfitting and underfitting, and what techniques do you use to detect and mitigate them?",
      "How does the ROC curve work, and how do you decide whether to optimize your model for high precision or high recall?",
      "Can you explain the mathematical concept behind gradient descent, and how does the learning rate affect convergence?",
      "How do you handle issues of missing data, outliers, and highly imbalanced classes in a dataset prior to training a model?"
    ],
    keywords: [
      "overfitting", "underfitting", "regularization", "l1 regularization", "l2 regularization", 
      "lasso", "ridge", "cross-validation", "precision", "recall", "f1-score", "roc auc", 
      "gradient descent", "learning rate", "imputation", "smote", "class imbalance", "random forest"
    ]
  },
  "product-manager": {
    title: "Product Manager",
    description: "Defines product vision, prioritizes feature roadmaps, aligns stakeholders, and measures product-market fit.",
    questions: [
      "How do you prioritize features for a product roadmap when facing competing requests from sales, engineering, and end-users?",
      "Describe a time when a product launch failed or did not meet its key performance indicators (KPIs). What did you learn and how did you pivot?",
      "What metrics would you define and track to measure the user engagement and long-term retention of a newly launched comment section?",
      "How do you resolve a conflict where the engineering lead claims a critical business request is technically impossible or takes too long?"
    ],
    keywords: [
      "rice framework", "moscow", "roadmap", "prioritization", "kpi", "dau/mau", "retention", 
      "churn", "a/b testing", "mvp", "user feedback", "product market fit", "stakeholder management"
    ]
  }
};
